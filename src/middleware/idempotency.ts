import { type NextFunction, type Request, type Response } from "express";

import { getCachedResponse, setCachedResponse } from "../utils/idempotency.js";

const IDEMPOTENCY_HEADER = "Idempotency-Key";

export function withIdempotencyCache(req: Request, res: Response, next: NextFunction): void {
  const key = req.header(IDEMPOTENCY_HEADER);
  if (!key) {
    next();
    return;
  }

  const cached = getCachedResponse(key);
  if (cached) {
    res.status(cached.status).json(cached.body);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (!res.headersSent) {
      setCachedResponse(key, { status: res.statusCode, body });
    }
    return originalJson(body);
  }) as typeof res.json;

  next();
}

