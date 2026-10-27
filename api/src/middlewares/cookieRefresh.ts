import type {
	NextFunction,
	Response,
	Request,
} from "express";

import type { CookieOptions } from 'express-serve-static-core';

import type { JwtPayload } from 'jsonwebtoken';
import type { UUID } from 'node:crypto';

import type { ProcessEnvironment } from './processEnvironment.ts';

import jwt from 'jsonwebtoken';

import { ApiErrorToServer } from '../lib/errors.ts';

export interface CookieId extends JwtPayload {
	dbId?: `${number}` | number;
	nonce?: UUID;
}

const NODE_ENV = process.env['NODE_ENV'] || 'development';

/**
 * Set/update `id` and `authenticated` values in `response.cookie` when
 * necessary, as well as `tokenCookieData` within `response.locals`
 *
 * - `response.cookie.authenticated` intended to be used by frontend for UI
 * - `response.cookie.id` intended to be used by API only
 */
export const cookieRefresh = (
	request: Request,
	response: Response,
	next: NextFunction
) => {
	const { processEnvironment } = response.locals as { processEnvironment?: ProcessEnvironment; };
	const { defaultCookieOptions } = response.locals as { defaultCookieOptions: CookieOptions };

	if (!processEnvironment || !Object.keys(processEnvironment).length) {
		console.error('cookieRefresh ->', { processEnvironment });
		throw new ApiErrorToServer('Who messed with processEnvironment middlewares?!', 503);
	} else if (!defaultCookieOptions || !Object.keys(defaultCookieOptions).length) {
		console.error('cookieRefresh ->', { defaultCookieOptions });
		throw new ApiErrorToServer('Who messed with defaultCookieOptions middlewares?!', 503);
	}

	const cookieId: string | undefined = request?.cookies['id'];
	if (!cookieId || !cookieId?.length) {
		return next();
	}

	try {
		var oldTokenCookieData = jwt.verify(cookieId, processEnvironment.JWT_KEY_COOKIE) as JwtPayload;
	} catch (error) {
		console.error('cookieRefresh -> jwt.verify ->', { cookieId });
		response.clearCookie('id');
		response.clearCookie('authenticated');
		return next();
	}

	const oldTokenCookieExp = oldTokenCookieData?.exp;
	if (!oldTokenCookieExp) {
		console.error('PostLogin_id ->', {
			oldTokenCookieData,
			oldTokenCookieExp,
		});
		throw new ApiErrorToServer('JWT and Cookies for authentication must have expiration', 503);
	}

	/* TODO: consider not rewriting cookie/token until closer to expiration */

	const tokenShouldExpireInDays = 7;

	const data = {
		dbId: oldTokenCookieData['dbId'],
		nonce: crypto.randomUUID(),
	};
	const newTokenCookie = jwt.sign(data, processEnvironment.JWT_KEY_COOKIE, { expiresIn: `${tokenShouldExpireInDays}d` });

	const newTokenCookieData = jwt.decode(newTokenCookie) as CookieId;
	const newTokenCookieExp = newTokenCookieData.exp;
	if (!newTokenCookieExp) {
		throw new ApiErrorToServer('Failed to extract value from newTokenCookieData.exp', 503);
	}

	response.cookie(
		'authenticated',
		true,
		Object.assign({}, defaultCookieOptions, {
			expires: new Date(newTokenCookieExp * 1000),
			httpOnly: false,
			secure: NODE_ENV != 'development',
		}),
	);

	response.cookie(
		'id',
		newTokenCookie,
		Object.assign({}, defaultCookieOptions, {
			expires: new Date(newTokenCookieExp * 1000),
			httpOnly: false,
		}),
	);

	response.locals['cookieId'] = newTokenCookieData;

	next();
};


