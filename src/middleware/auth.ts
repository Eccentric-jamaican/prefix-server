import { type NextFunction, type Request, type Response } from "express";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    next();
    return;
  }

  const header = req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  const providedKey = header.slice("Bearer ".length).trim();
  if (providedKey !== apiKey) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  next();
}
