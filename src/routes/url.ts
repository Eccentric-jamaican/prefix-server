import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import { FetchError, fetchHtml } from "../core/fetch.js";
import { TtlLruCache } from "../utils/ttlLruCache.js";
import { executeScan } from "./shared/executeScan.js";
import { calculateScanCost, type ScanSeverity } from "../utils/scanCost.js";
import {
  finalizeUsage,
  InsufficientCreditsError,
  reserveUsage
} from "../utils/convexUsage.js";

const router = Router();

const cacheTtlMs = Number.parseInt(process.env.URL_CACHE_TTL_MS ?? "30000", 10);
const cacheMaxEntries = Number.parseInt(process.env.URL_CACHE_MAX ?? "64", 10);
const urlCache = new TtlLruCache<string, string>({ maxSize: cacheMaxEntries, ttlMs: cacheTtlMs });

export function clearUrlCache(): void {
  urlCache.clear();
}

const urlSchema = z.object({
  url: z.string().url(),
  subject: z.string().optional(),
  allowlist: z.array(z.string()).optional(),
  fail_on: z.enum(["none", "low", "medium", "high"]).default("medium"),
  context_hint: z.string().optional()
});

router.post("/scan/url", async (req: Request, res: Response, next: NextFunction) => {
  const parsed = urlSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid request body",
      issues: parsed.error.issues
    });
  }

  const { url, subject, allowlist, fail_on, context_hint } = parsed.data;
  const requestedSeverity: ScanSeverity | undefined = fail_on === "none" ? undefined : fail_on;
  const cost = calculateScanCost({ severity: requestedSeverity });
  const baseMetadata = {
    route: "scan:url",
    failOn: fail_on,
    contextHint: context_hint,
    allowlistCount: allowlist?.length ?? 0,
    reservedCost: cost,
    subjectProvided: Boolean(subject),
    requestedSeverity: requestedSeverity ?? "none"
  } satisfies Record<string, unknown>;

  try {
    await reserveUsage(res, {
      scanType: "scan:url",
      cost,
      metadata: {
        ...baseMetadata,
        url
      }
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return res.status(402).json({
        ok: false,
        error: error.message,
        details: error.details ?? {}
      });
    }

    return next(error);
  }

  try {
    const cached = urlCache.get(url);
    const html = cached ?? (await fetchHtml(url));
    if (!cached) {
      urlCache.set(url, html);
    }

    const result = executeScan({ subject, html, allowlist, fail_on, context_hint });
    const responseStatus = result.status;
    const responseBody = result.body;

    await finalizeUsage(res, {
      responseStatus,
      severity: responseBody.worst_severity ?? undefined,
      metadata: {
        ...baseMetadata,
        url,
        cached: Boolean(cached),
        findingsCount: responseBody.findings.length,
        ok: responseBody.ok
      }
    });

    return res.status(responseStatus).json(responseBody);
  } catch (error) {
    const metadata = {
      ...baseMetadata,
      url
    } satisfies Record<string, unknown>;

    const status = error instanceof FetchError ? (error.status === 404 ? 404 : 502) : 502;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await finalizeUsage(res, {
      responseStatus: status,
      severity: undefined,
      metadata: {
        ...metadata,
        error: errorMessage
      }
    });

    if (error instanceof FetchError) {
      return res.status(status).json({ ok: false, error: errorMessage });
    }

    return res.status(status).json({ ok: false, error: "Failed to fetch URL" });
  }
});

export default router;
