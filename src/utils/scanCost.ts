const FALLBACK_SCAN_COST = 1;

function resolveDefaultScanCost(): number {
  const raw = process.env.DEFAULT_SCAN_COST;
  if (raw === undefined) {
    return FALLBACK_SCAN_COST;
  }

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      "DEFAULT_SCAN_COST is invalid (expected positive number). Falling back to",
      FALLBACK_SCAN_COST
    );
    return FALLBACK_SCAN_COST;
  }

  return parsed;
}

const DEFAULT_SCAN_COST = resolveDefaultScanCost();

export type ScanSeverity = "low" | "medium" | "high";

export interface ScanCostInput {
  severity?: ScanSeverity;
}

export function calculateScanCost({ severity }: ScanCostInput): number {
  switch (severity) {
    case "high":
      return DEFAULT_SCAN_COST * 5;
    case "medium":
      return DEFAULT_SCAN_COST * 3;
    case "low":
      return DEFAULT_SCAN_COST * 1.5;
    default:
      return DEFAULT_SCAN_COST;
  }
}
