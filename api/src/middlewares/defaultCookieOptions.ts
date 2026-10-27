import type {
	NextFunction,
	Request,
	Response,
} from 'express';

import type { CookieOptions } from 'express-serve-static-core';

const NODE_ENV = process.env['NODE_ENV'] || 'development';

export function defaultCookieOptions(_request: Request, response: Response, next: NextFunction) {
	if (!Object.keys(response?.locals ?? {}).length) {
		response.locals = {};
	}
	if (!Object.keys(response.locals['defaultCookieOptions'] ?? {}).length) {
		response.locals['defaultCookieOptions'] = {};
	}

	/**
	 * Check CookieOptions type hints in;
	 * node_modules/@types/express-serve-static-core/index.d.ts
	 */
	const updatedLocals: CookieOptions = {
		httpOnly: NODE_ENV == 'production',
		secure: NODE_ENV == 'production',
	};

	response.locals['defaultCookieOptions'] = Object.assign({}, response.locals['defaultCookieOptions'], updatedLocals);

	next();
}
