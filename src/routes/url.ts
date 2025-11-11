import { Router } from "express";
import { z } from "zod";

import { FetchError, fetchHtml } from "../core/fetch.js";
import { TtlLruCache } from "../utils/ttlLruCache.js";
import { executeScan } from "./shared/executeScan.js";

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

router.post("/scan/url", async (req, res) => {
  const parsed = urlSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid request body",
      issues: parsed.error.issues
    });
  }

  const { url, subject, allowlist, fail_on, context_hint } = parsed.data;

  try {
    const cached = urlCache.get(url);
    const html = cached ?? (await fetchHtml(url));
    if (!cached) {
      urlCache.set(url, html);
    }
    const result = executeScan({ subject, html, allowlist, fail_on, context_hint });
    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error instanceof FetchError) {
      const status = error.status === 404 ? 404 : 502;
      return res.status(status).json({ ok: false, error: error.message });
    }

    return res.status(502).json({ ok: false, error: "Failed to fetch URL" });
  }
});

export default router;
