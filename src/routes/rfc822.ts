import { Router } from "express";
import { z } from "zod";

import { parseRfc822 } from "../core/parse-rfc822.js";
import { executeScan } from "./shared/executeScan.js";

const router = Router();

const rfcSchema = z.object({
  raw: z.string(),
  allowlist: z.array(z.string()).optional(),
  fail_on: z.enum(["none", "low", "medium", "high"]).default("medium"),
  context_hint: z.string().optional()
});

router.post("/scan/rfc822", (req, res) => {
  const body = normalizeBody(req.body);
  const parsed = rfcSchema.safeParse(body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid request body",
      issues: parsed.error.issues
    });
  }

  const { raw, allowlist, fail_on, context_hint } = parsed.data;
  const { subject, html, text } = parseRfc822(raw);

  if (!subject && !html && !text) {
    return res.status(400).json({ ok: false, error: "Unable to parse RFC822 message" });
  }

  const result = executeScan({ subject, html, text, allowlist, fail_on, context_hint });
  return res.status(result.status).json(result.body);
});

function normalizeBody(body: unknown): { raw: string } & Record<string, unknown> {
  if (typeof body === "string") {
    return { raw: body };
  }

  if (Buffer.isBuffer(body)) {
    return { raw: body.toString("utf8") };
  }

  if (body && typeof body === "object" && "raw" in body) {
    return body as { raw: string } & Record<string, unknown>;
  }

  return { raw: "" };
}

export default router;
