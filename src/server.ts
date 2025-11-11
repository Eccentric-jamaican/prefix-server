import cors from "cors";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pino from "pino";
import pinoHttp from "pino-http";
import metricsRouter from "./routes/metrics.js";
import rfc822Router from "./routes/rfc822.js";
import schemaRouter from "./routes/schema.js";
import urlRouter from "./routes/url.js";
import { withIdempotencyCache } from "./middleware/idempotency.js";

import { requireApiKey } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errors.js";
import router from "./routes/index.js";

dotenv.config();

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
const REQUEST_LIMIT_PER_MIN = Number.parseInt(
  process.env.REQUEST_LIMIT_PER_MIN ?? "120",
  10
);
const BODY_LIMIT = process.env.BODY_LIMIT ?? "2mb";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.use(express.text({ type: ["text/plain", "message/rfc822"], limit: BODY_LIMIT }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: REQUEST_LIMIT_PER_MIN,
    standardHeaders: true,
    legacyHeaders: false
  })
);
const pinoHttpMiddleware = (pinoHttp as unknown as (
  options?: Record<string, unknown>
) => express.RequestHandler)({
  logger,
  customLogLevel: (_req: Request, res: Response, err?: Error) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  }
});

app.use(pinoHttpMiddleware);

app.use(withIdempotencyCache);
app.use(requireApiKey);
app.use("/v1", router);
app.use("/v1", urlRouter);
app.use("/v1", rfc822Router);
app.use("/v1", schemaRouter);
app.use("/v1", metricsRouter);

app.use(errorHandler);

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, "Prefix server listening");
  });
}

export { app };
