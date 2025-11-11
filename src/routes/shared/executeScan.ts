import { evaluatePolicy, type FailLevel, type PolicyResult } from "../../core/policy.js";
import { scanTokens, type ScanResult } from "../../core/scanner.js";
import { summarizeFindings, type Summary } from "../../core/summarize.js";
import { sanitizeTextInput } from "../../utils/text.js";

interface ExecuteScanInput {
  subject?: string;
  html?: string;
  text?: string;
  allowlist?: string[];
  fail_on?: FailLevel;
  context_hint?: string;
}

interface ExecuteScanResult {
  status: number;
  body: {
    ok: boolean;
    severity_summary: Summary["severitySummary"];
    findings: ScanResult["findings"];
    advice: string[];
    worst_severity: PolicyResult["worstSeverity"];
    fail_on: FailLevel;
  };
}

export function executeScan({
  subject,
  html,
  text,
  allowlist,
  fail_on = "medium",
  context_hint
}: ExecuteScanInput): ExecuteScanResult {
  const scanResult = scanTokens({
    subject,
    html,
    text: sanitizeTextInput(text),
    allowlist
  });
  const summary = summarizeFindings(scanResult.findings, { contextHint: context_hint });
  const policy = evaluatePolicy(scanResult.findings, fail_on);

  const status = policy.block ? 409 : 200;

  return {
    status,
    body: {
      ok: !policy.block,
      severity_summary: summary.severitySummary,
      findings: scanResult.findings,
      advice: summary.advice,
      worst_severity: policy.worstSeverity,
      fail_on
    }
  };
}
