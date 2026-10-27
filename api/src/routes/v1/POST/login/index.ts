import type {
	NextFunction,
	Response,
} from 'express';

import type { JwtPayload } from 'jsonwebtoken';

import type { Transporter } from 'nodemailer';

import type { ProcessEnvironment } from '../../../../middlewares/processEnvironment.ts';
import type {
	API,
	JWT,
	// PostgreSQL,
} from '../../../../../@types/index.d.ts';

// import fs from 'node:fs';
// import path from 'node:path';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { getTestMessageUrl } from 'nodemailer';

import {
	ApiErrorToClient,
	ApiErrorToServer,
} from '../../../../lib/errors.ts';

import database from '../../../../database.ts';

/**
 * `api.<domain>/<id>` where `<id>` must contain `dbId`;
 *
 * - `dbId` must map to `account_data.id` that already exists
 *
 * On happy path;
 *
 * - Database `account_data.date_logged_in` shall be updated
 * - Mutate `responds.cookie['id']` with new JWT `tokenCookie`
 * - Reply with status `201`
 */
export async function PostLogin_id(request: API.POST.login.Request, response: Response, next: NextFunction) {
	const { id } = request.params;

	if (!id) {
		console.error('PostLogin_id ->', { id });
		throw new ApiErrorToClient('No tokenEmail id provided', 400);
	}

	try {
		var tokenEmail = jwt.verify(id, response.locals['processEnvironment']['JWT_KEY_EMAIL']!);
	} catch (error) {
		console.error('PostLogin_id ->', { id, error });
		throw new ApiErrorToClient('Bad Request: invalid JWT', 400);
	}

	const { dbId } = tokenEmail as JWT.emailMagicLink;
	if (!dbId) {
		console.error('PostLogin_id ->', { id, tokenEmail, dbId });
		throw new ApiErrorToClient('No email address provided', 400);
	}

	const data = {
		dbId,
		nonce: crypto.randomUUID(),
	};
	const tokenCookie = jwt.sign(data, response.locals['processEnvironment']['JWT_KEY_COOKIE']!, { expiresIn: '7d' });

	await database.tx(async (task) => {
		const query = [
			'UPDATE account_data',
			'  SET date_logged_in = NOW()',
			'  WHERE id = ${dbId}',
		];

		await task.none(query.join('\n'), { dbId })
			.catch((error) => {
				console.error('PostLogin_id -> database.tx -> task.one ->', { error, query, dbId });
				throw new ApiErrorToClient('Internal Server Error: Database transaction failed', 500);
			});
	});

	const tokenCookieExp = (jwt.decode(tokenCookie) as JwtPayload)?.exp;
	if (!tokenCookieExp) {
		console.error('PostLogin_id ->', {
			tokenCookie,
			tokenCookieExp,
		});
		throw new ApiErrorToServer('JWT and Cookies for auth must have expiration', 503);
	}

	response.cookie(
		'id',
		tokenCookie,
		Object.assign({}, response.locals['defaultCookieOptions']!, {
			expires: new Date(tokenCookieExp * 1000),
		}),
	);

	try {
		/* TODO: change return data to tell frontend to redirect to `/notes` */
		response.status(201).json({ tokenEmail, tokenCookie, dbId });
	} catch (error) {
		console.error('PostLogin_id ->', {
			id,
			tokenEmail,
			tokenCookie,
			dbId,
			'response.cookie': response.cookie,
			error,
		});
		next(error);
	}
}

/**
 *
 */
export async function PostLogin(request: API.POST.login.Request, response: Response, next: NextFunction) {
	const { email } = request.query;

	if (!email) {
		console.error('PostLogin ->', {
			email,
		});
		throw new ApiErrorToClient('No email address provided', 400);
	}

	const emailDecoded = atob(email);
	const emailNormalized = validator.normalizeEmail(emailDecoded);

	const data: JWT.emailMagicLink = { email, nonce: crypto.randomUUID() };

	/**
	 * TODO: query database for `date_emailed` and rate-limit using `exp` from `tokenEmail`
	 */
	await database.tx(async (task) => {
		const queryIdAndDateEmailed = [
			'SELECT id, date_emailed FROM account_data',
			'  WHERE email_normalized = ${emailNormalized}',
		];

		const dbResultIdAndDateEmailed = await task.oneOrNone(queryIdAndDateEmailed.join('\n'), { emailNormalized })
			.catch((error) => {
				console.error('PostLogin -> database.tx -> task.oneOrNone ->', { error, queryIdAndDateEmailed, emailNormalized });
				throw new ApiErrorToClient('Internal Server Error: Database transaction failed', 500);
			});

		if (dbResultIdAndDateEmailed) {
			const { id, date_emailed }: {
				id: `${number}`;
				date_emailed: Date;
			} = dbResultIdAndDateEmailed;

			/**
			 * WARNING: time must be coupled to `tokenEmail` within `PostLogin`
			 */
			const expiresInMilliseconds = 30 * 60_000;
			const date = new Date();
			if (date.getTime() < date_emailed.getTime() + expiresInMilliseconds) {
				const message = 'Too Many Requests: Please check your email for magic link that should have been sent';
				if (process.env['NODE_ENV'] === 'development') {
					console.warn('PostLogin -> database.tx -> task.oneOrNone ->', {
						queryIdAndDateEmailed,
						dbResultIdAndDateEmailed,
						id,
						date_emailed,
						date,
						'date_emailed.getTime()': date_emailed.getTime(),
						'date.getTime()': date.getTime(),
						expiresInMilliseconds,
						message,
					});
				} else {
					throw new ApiErrorToClient(message, 429);
				}
			}
		}

		/**
		 * If we got here then it is time to attempt email and set so in database!
		 */

		/**
		 * TODO: integrate with email API and remove `magicLink` from json result
		 */

		const queryCreateOrUpdateAccount = [
			'INSERT INTO account_data (email_raw, email_normalized)',
			'  VALUES (${emailDecoded}, ${emailNormalized})',
			'  ON CONFLICT (email_normalized)',
			'    DO UPDATE SET email_raw = ${emailDecoded}, date_emailed = NOW()',
			'    RETURNING id',
		];

		const dbResultCreateOrUpdateAccount = await task.one(queryCreateOrUpdateAccount.join('\n'), { emailDecoded, emailNormalized })
			.catch((error) => {
				console.error('PostLogin -> database.tx -> task.one ->', { error, queryCreateOrUpdateAccount, emailDecoded, emailNormalized });
				throw new ApiErrorToClient('Internal Server Error: Database transaction failed', 500);
			});

		if (!dbResultCreateOrUpdateAccount.id) {
			console.error('PostLogin -> database.tx -> task.one ->', {
				queryCreateOrUpdateAccount,
				emailDecoded,
				emailNormalized,
				dbResultCreateOrUpdateAccount,
			});
			throw new ApiErrorToClient('Internal Server Error: Database transaction failed', 500);
		}

		data['dbId'] = dbResultCreateOrUpdateAccount.id;
	});

	/**
	 * TODO: Ensure future grace period between notes not in a notes and
	 *       `expiresIn` of `tokenEmail` do not create a race-condition with
	 *       auto-delete!
	 */
	const tokenEmail = jwt.sign(data, response.locals['processEnvironment']['JWT_KEY_EMAIL']!, { expiresIn: '30m' });

	const magicLink = `${response.locals['processEnvironment']['CLIENT_URL_HOST']!}/login/${tokenEmail}`;

	const {
		NODEMAILER_AUTH_USER,
		NODE_ENV,
	} = response.locals['processEnvironment'] as ProcessEnvironment;

	const { nodemailerTransporter } = response.locals as {
		nodemailerTransporter: Transporter;
	};

	if (!nodemailerTransporter) {
		throw new Error('Who messed with nodemailerTransporter middlewares?!');
	}

	const sendMailInfo = await nodemailerTransporter.sendMail({
		sender: 'login@example.com',
		replyTo: 'no-reply@example.com',
		/* TODO: change above after domain-name is purchased and configured */
		from: NODEMAILER_AUTH_USER,
		to: emailDecoded,
		subject: 'Login with magic link!',
		/* TODO: change after domain-name is purchased and configured */
		text: 'https://example.com/login/super-magical-link',
	});

	if (NODE_ENV === 'development') {
		const testMessageUrl = getTestMessageUrl(sendMailInfo);
		console.log('PostLogin -> getTestMessageUrl ->', {
			sendMailInfo,
			testMessageUrl,
		});
	}

	try {
		response.status(201).json({ message: 'Please check your email for a magic link!', magicLink });
	} catch (error) {
		next(error);
	}
}
