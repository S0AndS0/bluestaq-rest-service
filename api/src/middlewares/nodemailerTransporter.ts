import type {
	NextFunction,
	Response,
	Request,
} from "express";

import type { ProcessEnvironment } from './processEnvironment.ts';

import { createTransport } from 'nodemailer';

import { ApiErrorToServer } from '../lib/errors.ts';

export const nodemailerTransporter = (
	_request: Request,
	response: Response,
	next: NextFunction
) => {
	const {
		NODEMAILER_AUTH_PASS,
		NODEMAILER_AUTH_USER,
		NODEMAILER_HOST,
	} = response.locals['processEnvironment'] as ProcessEnvironment;

	if (!NODEMAILER_AUTH_PASS?.length) {
		const message = 'NODEMAILER_AUTH_PASS not set by processEnvironment middlewares?!';
		console.error('nodemailerTransporter ->', { message, NODEMAILER_AUTH_PASS });
		throw new ApiErrorToServer(message, 503);
	} else if (!NODEMAILER_AUTH_USER?.length) {
		const message = 'NODEMAILER_AUTH_USER not set by processEnvironment middlewares?!';
		console.error('nodemailerTransporter ->', { message, NODEMAILER_AUTH_USER });
		throw new ApiErrorToServer(message, 503);
	} else if (!NODEMAILER_HOST?.length) {
		const message = 'NODEMAILER_HOST not set by processEnvironment middlewares?!';
		console.error('nodemailerTransporter ->', { message, NODEMAILER_HOST });
		throw new ApiErrorToServer(message, 503);
	}

	if (Object.hasOwn(response.locals, 'nodemailerTransporter')) {
		const message = '`response.locals` already has `nodemailerTransporter` defined';
		console.error('nodemailerTransporter ->', {
			message,
			'response.locals["nodemailerTransporter"]': response.locals["nodemailerTransporter"],
		});
		throw new ApiErrorToServer(message, 503);
	}

	response.locals['nodemailerTransporter'] = createTransport({
		host: NODEMAILER_HOST,
		port: 587,
		secure: false,
		/* TODO: switch to `secure: true` */
		// secure: true,
		auth: {
			user: NODEMAILER_AUTH_USER,
			pass: NODEMAILER_AUTH_PASS,
		},
	});

	next();
}

