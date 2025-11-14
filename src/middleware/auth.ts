import { randomUUID } from "node:crypto";

import { ConvexError } from "convex/values";
import { type NextFunction, type Request, type Response } from "express";

import { API_KEY_PREFIX_LENGTH } from "../../convex/lib/constants.js";
import { api } from "../../convex/_generated/api.js";
import type { FunctionReference } from "convex/server";

type ApiKeysModule = {
  lookupByPrefix: FunctionReference<"query">;
  verifySecret: FunctionReference<"query">;
  markUsed: FunctionReference<"mutation">;
};

const apiKeys = (api as unknown as { apiKeys: ApiKeysModule }).apiKeys;
import { createConvexClient } from "../services/convexClient.js";

const BEARER_PREFIX = "Bearer ";

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const convexUrlConfigured = Boolean(process.env.CONVEX_DEPLOYMENT_URL ?? process.env.CONVEX_URL);

  if (!convexUrlConfigured) {
    legacyApiKeyCheck(req, res, next);
    return;
  }

  void (async () => {
    const header = req.header("Authorization");
    if (!header?.startsWith(BEARER_PREFIX)) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const secret = header.slice(BEARER_PREFIX.length).trim();
    if (!secret) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const prefix = secret.slice(0, API_KEY_PREFIX_LENGTH);
    const client = createConvexClient();

    try {
      const key = await client.query(apiKeys.lookupByPrefix, { idPrefix: prefix });
      if (!key) {
        res.status(401).json({ ok: false, error: "Invalid API key" });
        return;
      }

      if (key.revokedAt) {
        res.status(403).json({ ok: false, error: "API key revoked" });
        return;
      }

      const verification = await client.query(apiKeys.verifySecret, {
        idPrefix: prefix,
        secret
      });

      if (!verification || !verification.hashMatches) {
        res.status(401).json({ ok: false, error: "Invalid API key" });
        return;
      }

      if (verification.revokedAt) {
        res.status(403).json({ ok: false, error: "API key revoked" });
        return;
      }

      const requestId = req.header("Idempotency-Key") ?? randomUUID();

      await client.mutation(apiKeys.markUsed, {
        apiKeyId: key.apiKeyId,
        nowMs: Date.now()
      });

      res.locals.convex = {
        client,
        accountId: key.accountId,
        apiKeyId: key.apiKeyId,
        requestId
      };

      next();
    } catch (error) {
      if (error instanceof ConvexError && typeof error.data === "object" && error.data) {
        const data = error.data as Record<string, unknown>;
        if (data.code === "api_key_revoked") {
          res.status(403).json({ ok: false, error: "API key revoked" });
          return;
        }
      }

      next(error instanceof Error ? error : new Error("Convex auth error"));
    }
  })().catch((error) => {
    next(error instanceof Error ? error : new Error("Convex auth error"));
  });
}

function legacyApiKeyCheck(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    next();
    return;
  }

  const header = req.header("Authorization");
  if (!header?.startsWith(BEARER_PREFIX)) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  const providedKey = header.slice(BEARER_PREFIX.length).trim();
  if (providedKey !== apiKey) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  next();
}
