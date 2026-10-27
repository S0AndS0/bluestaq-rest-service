/**
 * Do not pass sensitive data to `message`
 */
export class ApiErrorToClient extends Error {
	status: number;

	constructor(message: string, status: number | undefined) {
		super(message);
		this.status = status || 500;
	}
}

export class ApiErrorToServer extends Error {
	status: number;

	constructor(message: string, status: number | undefined) {
		super(message);
		this.status = status || 500;
	}
}
