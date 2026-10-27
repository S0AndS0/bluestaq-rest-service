export namespace PostgreSQL {
	export interface account_data {
		id: number;
		date_created: string | Date;
		date_emailed: string | Date;
		date_logged_in: string | Date;
		email_normalized: string;
		email_raw: string;
		notes: {
			[key: string]: string;
		};
	}
}

export namespace JWT {
	export interface cookie extends JwtPayload {
		/**
		 * `account_data.id` from database
		 */
		dbId?: string | number;

		/**
		 * UUID
		 */
		nonce?: string;
	}

	export interface emailMagicLink extends JwtPayload {
		/**
		 * `account_data.id` from database
		 */
		dbId?: string | number;

		/**
		 * `account_data.email` from database that may not be correctly sanitized
		 */
		email: string;

		/**
		 * UUID
		 */
		nonce?: string;
	}
}

export namespace API {
	export namespace GET {
		export namespace notes {
			/**
			 * Expectations;
			 *
			 * - url: `http://api.example.com/:id?pageStart=1&pageSize=100`
			 *  - `:id` is required and should be a JWT
			 */
			export interface Request extends ExpressRequest {
				params: ExpressCore.ParamsDictionary & {
					/**
					 * JSON Web Token (JWT) for user
					 */
					id: `${string}.${string}.${string}`;
				};
			}

			/**
			 *
			 */
			export interface ResponseDataOkay {
				/**
				 * Number of uploads allowed for given user
				 */
				limit: number;

				/**
				 * Positive number, is seconds until uploads are deleted from server
				 *
				 * Negative number, is saved in vault or has yet to be viewed
				 *
				 * TODO: implement "grace period" that prevents deleting upload until
				 *       `expiration + magic-link.exp`
				 */
				expires: number;

				/**
				 * List of paths to uploads
				 */
				uploads: string[];
			}
		}
	}

	/**
	 * Expectations;
	 *
	 * - url: `http://api.example.com/:id`
	 */
	export namespace POST {
		export namespace notes {
			export interface Request extends API.GET.notes.Request { }
			export interface ResponseDataOkay extends API.GET.notes.ResponseDataOkay { }
		}

		export namespace login {
			export interface Request extends ExpressRequest {
				params: ExpressCore.ParamsDictionary & {
					/**
					 * JSON Web Token from emailed "magic link"
					 */
					id?: `${string}.${string}.${string}`;
				};
				query: ExpressCore.Query & {
					/**
					 * URL encoded, via `btoa()`, email address
					 */
					email?: string;
				};
			}
			export interface ResponseDataOkay extends API.GET.notes.ResponseDataOkay { }
		}
	}
}
