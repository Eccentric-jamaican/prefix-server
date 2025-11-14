import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import { executeScan } from "./shared/executeScan.js";
import { calculateScanCost, type ScanSeverity } from "../utils/scanCost.js";
import {
  finalizeUsage,
  InsufficientCreditsError,
  reserveUsage
} from "../utils/convexUsage.js";

const scanSchema = z
  .object({
    subject: z.string().optional(),
    html: z.string().optional(),
    text: z.string().optional(),
    allowlist: z.array(z.string()).optional(),
    fail_on: z.enum(["none", "low", "medium", "high"]).default("medium"),
    context_hint: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (!value.subject && !value.html && !value.text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one of subject, html, or text to scan",
        path: []
      });
    }
  });

const router = Router();

router.post("/scan", async (req: Request, res: Response, next: NextFunction) => {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid request body",
      issues: parsed.error.issues
    });
  }

  const { subject, html, text, allowlist, fail_on, context_hint } = parsed.data;
  const requestedSeverity: ScanSeverity | undefined = fail_on === "none" ? undefined : fail_on;
  const cost = calculateScanCost({ severity: requestedSeverity });
  const baseMetadata = {
    route: "scan",
    failOn: fail_on,
    contextHint: context_hint,
    allowlistCount: allowlist?.length ?? 0,
    reservedCost: cost
  } satisfies Record<string, unknown>;

  try {
    await reserveUsage(res, {
      scanType: "scan:default",
      cost,
      metadata: {
        ...baseMetadata,
        subjectProvided: Boolean(subject),
        htmlProvided: Boolean(html),
        textProvided: Boolean(text),
        requestedSeverity: requestedSeverity ?? "none"
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
    const result = executeScan({ subject, html, text, allowlist, fail_on, context_hint });
    const responseStatus = result.status;
    const responseBody = result.body;

    await finalizeUsage(res, {
      responseStatus,
      severity: result.body.worst_severity ?? undefined,
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

export default router;
