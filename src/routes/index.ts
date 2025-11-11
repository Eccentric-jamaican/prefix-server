import { Router } from "express";

import healthRouter from "./health.js";
import scanRouter from "./scan.js";

const router = Router();

router.use("/health", healthRouter);
router.use(scanRouter);

export default router;
