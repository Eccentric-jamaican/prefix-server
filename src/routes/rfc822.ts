import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import { parseRfc822 } from "../core/parse-rfc822.js";
import { executeScan } from "./shared/executeScan.js";
import { calculateScanCost } from "../utils/scanCost.js";
import {
  finalizeUsage,
  InsufficientCreditsError,
  reserveUsage
} from "../utils/convexUsage.js";

const router = Router();

const rfcSchema = z.object({
  raw: z.string(),
  allowlist: z.array(z.string()).optional(),
  fail_on: z.enum(["none", "low", "medium", "high"]).default("medium"),
  context_hint: z.string().optional()
});

router.post("/scan/rfc822", async (req: Request, res: Response, next: NextFunction) => {
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

  const cost = calculateScanCost({});
  const baseMetadata = {
    route: "scan:rfc822",
    failOn: fail_on,
    contextHint: context_hint,
    allowlistCount: allowlist?.length ?? 0,
    reservedCost: cost,
    subjectProvided: Boolean(subject),
    htmlProvided: Boolean(html),
    textProvided: Boolean(text)
  } satisfies Record<string, unknown>;

  try {
    await reserveUsage(res, {
      scanType: "scan:rfc822",
      cost,
      metadata: baseMetadata
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
    const result = executeScan({ subject, html, text, allowlist, fail_on, context_hint });
    const responseStatus = result.status;
    const responseBody = result.body;

    await finalizeUsage(res, {
      responseStatus,
      severity: responseBody.worst_severity ?? undefined,
      metadata: {
        ...baseMetadata,
        findingsCount: responseBody.findings.length,
        ok: responseBody.ok
      }
    });

    return res.status(responseStatus).json(responseBody);
  } catch (error) {
    await finalizeUsage(res, {
      responseStatus: 500,
      severity: undefined,
      metadata: {
        ...baseMetadata,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    });

    return next(error);
  }
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
