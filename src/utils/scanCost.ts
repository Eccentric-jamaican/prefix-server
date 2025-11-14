const DEFAULT_SCAN_COST = Number.parseFloat(process.env.DEFAULT_SCAN_COST ?? "1");

export interface ScanCostInput {
  severity?: string;
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
