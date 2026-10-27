import express from "express";
import { rateLimit } from "express-rate-limit";
import cookieParser from "cookie-parser";

import { defaultCookieOptions } from './middlewares/defaultCookieOptions.ts';
import { cookieRefresh } from './middlewares/cookieRefresh.ts';
import { errorHandler } from "./middlewares/errorHandler.ts";
import { processEnvironment } from './middlewares/processEnvironment.ts';

import routesV1 from "./routes/v1/index.ts";

const app = express();

app.set('trust proxy', 1);
app.use(processEnvironment);

app.use(rateLimit({
	windowMs: 15 * 60 * 1000, /* 15 minutes */
	// TODO: reduce limit before publishing publicly!
	limit: 1000, /* Limit each IP to number of requests per `windowMs` */
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	// store: ..., /* Consider adding if multiple nodes are required */
}));

app.use(cookieParser());
app.use(defaultCookieOptions);
app.use(cookieRefresh);

/**
 * @see ./routes/v1/index.ts
 */
app.use(express.json());
app.use("/v1", routesV1);
app.use(errorHandler);

export default app;
