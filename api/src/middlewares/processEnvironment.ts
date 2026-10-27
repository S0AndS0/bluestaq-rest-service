import type {
	NextFunction,
	Response,
	Request,
} from "express";

import { ApiErrorToServer } from '../lib/errors.ts';

const envKeys = [
	'CLIENT_URL_HOST',
	'NODE_ENV',
	'POSTGRES_DB',
	'POSTGRES_PASSWORD',
	'POSTGRES_USER',
	'UPLOAD_ROOT',
	'JWT_KEY_COOKIE',
	'JWT_SALT_COOKIE',
] as const;

export type ProcessEnvironment = {
	[key in typeof envKeys[number]]: string;
}

/**
 *
 */
export const processEnvironment = (
	_request: Request,
	response: Response,
	next: NextFunction
) => {
	if (!Object.keys(response?.locals ?? {}).length) {
		response.locals = {};
	}
	if (!Object.keys(response.locals['processEnvironment'] ?? {}).length) {
		response.locals['processEnvironment'] = {};
	}

	const updatedLocals = envKeys.reduce((accumulator, envKey) => {
		const value = process.env[envKey] as string | undefined;
		if (!value || !value.length) {
			throw new ApiErrorToServer(`Missing value for -> process.env[${envKey}]`, 500);
		}
		accumulator[envKey] = value;
		return accumulator;
	}, {} as Record<string, string>);

	response.locals['processEnvironment'] = Object.assign({}, response.locals['processEnvironment'], updatedLocals);

	next();
};

