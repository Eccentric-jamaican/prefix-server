import { type ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(500).json({ ok: false, error: "Internal Server Error" });
};
