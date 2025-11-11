import { Router } from "express";
import promClient from "prom-client";

const router = Router();

let defaultMetricsRegistered = false;

function metricsEnabled(): boolean {
  return (process.env.METRICS_ENABLED ?? "false").toLowerCase() === "true";
}

router.get("/metrics", async (_req, res) => {
  if (!metricsEnabled()) {
    return res.status(404).json({ ok: false, error: "Metrics disabled" });
  }

  if (!defaultMetricsRegistered) {
    promClient.collectDefaultMetrics();
    defaultMetricsRegistered = true;
  }

  try {
    const metrics = await promClient.register.metrics();
    res.setHeader("Content-Type", promClient.register.contentType);
    return res.send(metrics);
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Unable to generate metrics" });
  }
});

export default router;
