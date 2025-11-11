import { Router } from "express";
import { z } from "zod";

import { checkTemplateSchema } from "../core/schema.js";

const router = Router();

const schemaRequest = z.object({
  subject: z.string().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  allowlist: z.array(z.string()).optional(),
  variables: z.array(z.string())
});

router.post("/scan/schema", (req, res) => {
  const parsed = schemaRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid request body",
      issues: parsed.error.issues
    });
  }

  const result = checkTemplateSchema(parsed.data);
  return res.status(200).json({ ok: true, ...result });
});

export default router;
