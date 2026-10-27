import type {
	NextFunction,
	Response,
	Request,
} from "express";

import { randomUUID } from 'node:crypto';

import {
	ApiErrorToClient,
	ApiErrorToServer,
} from '../lib/errors.ts';

/**
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#server_error_responses
 */
export const HTTPStatusCodeToDefaultMessage: { [key: number]: string; } = {
	500: 'Internal Server Error',
	501: 'Not Implemented',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Gateway Timeout',
	505: 'HTTP Version Not Supported',
	506: 'Variant Also Negotiates',
	507: 'Insufficient Storage',
	508: 'Loop Detected',
	510: 'Not Extended',
	511: 'Network Authentication Required',
} as const;

export const errorHandler = (
	error: ApiErrorToClient,
	request: Request,
	response: Response,
	_next: NextFunction
) => {
	const { status = 500 } = error;
	const { message = HTTPStatusCodeToDefaultMessage[status] ?? 'Internal Server Error' } = error;

	const id = randomUUID();
	console.error('errorHandler', { status, message, 'request.url': request.url, error, id });
	if (error instanceof ApiErrorToClient) {
		response.status(status).json({ status, message, id });
	} else if (error as any instanceof ApiErrorToServer) {
		response.status(status).json({ status, message: HTTPStatusCodeToDefaultMessage[status] ?? 'Internal Server Error', id });
	} else {
		response.status(status).json({ status: 500, message: 'Internal Server Error', id });
	}
};

