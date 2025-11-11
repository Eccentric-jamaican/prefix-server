import { Router } from "express";
import { z } from "zod";

import { executeScan } from "./shared/executeScan.js";

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

router.post("/scan", (req, res) => {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid request body",
      issues: parsed.error.issues
    });
  }

  const { subject, html, text, allowlist, fail_on, context_hint } = parsed.data;
  const result = executeScan({ subject, html, text, allowlist, fail_on, context_hint });
  return res.status(result.status).json(result.body);
});

export default router;
