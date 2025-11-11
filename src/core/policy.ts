import type { Finding } from "./scanner.js";

export type FailLevel = "none" | "low" | "medium" | "high";

const severityRank: Record<Finding["severity"], number> = {
  low: 1,
  medium: 2,
  high: 3
};

const failRank: Record<FailLevel, number> = {
  none: 4,
  low: 1,
  medium: 2,
  high: 3
};

export interface PolicyResult {
  worstSeverity: Finding["severity"] | null;
  block: boolean;
}

export function evaluatePolicy(
  findings: Finding[],
  failOn: FailLevel = "medium"
): PolicyResult {
  if (findings.length === 0) {
    return { worstSeverity: null, block: false };
  }

  const worst = findings.reduce<Finding["severity"]>((currentWorst, finding) => {
    if (!currentWorst) {
      return finding.severity;
    }

    return severityRank[finding.severity] > severityRank[currentWorst]
      ? finding.severity
      : currentWorst;
  }, findings[0]?.severity ?? null);

  if (!worst) {
    return { worstSeverity: null, block: false };
  }

  const block = severityRank[worst] >= failRank[failOn];

  return { worstSeverity: worst, block };
}
