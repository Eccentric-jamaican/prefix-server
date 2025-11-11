import type { Finding } from "./scanner.js";

export interface Summary {
  severitySummary: SeveritySummary;
  advice: string[];
}

export interface SeveritySummary {
  high: number;
  medium: number;
  low: number;
}

interface SummarizeOptions {
  contextHint?: string;
}

const CONTEXT_ADVICE: Record<string, string[]> = {
  resend: [
    "Resend: confirm template variables match your trigger payload and consider adding Prefix as a pre-send check in your workflow."
  ],
  mailchimp: [
    "Mailchimp: ensure merge tags (e.g., *|FNAME|*) resolve for every audience member before running a campaign."
  ],
  sfmc: [
    "Salesforce Marketing Cloud: verify AMPscript variables like %%=v(@FirstName)=%% exist in your data extensions."
  ],
  instantly: [
    "Instantly: review HTML personalizations and test sequences with fallback values to avoid rejected sends."
  ]
};

export function summarizeFindings(
  findings: Finding[],
  options: SummarizeOptions = {}
): Summary {
  const severitySummary: SeveritySummary = {
    high: 0,
    medium: 0,
    low: 0
  };

  for (const finding of findings) {
    severitySummary[finding.severity] += 1;
  }

  const advice = buildAdvice(severitySummary, options.contextHint);

  return { severitySummary, advice };
}

function buildAdvice(summary: SeveritySummary, contextHint?: string): string[] {
  const messages: string[] = [];

  if (summary.high > 0) {
    messages.push("Resolve high-severity personalization tokens before sending.");
  }

  if (summary.medium > 0) {
    messages.push(
      "Review medium-severity findings and confirm template variables are provided."
    );
  }

  if (summary.low > 0) {
    messages.push(
      "Low-severity findings may be in comments or guarded sections; confirm they are intentional."
    );
  }

  if (messages.length === 0) {
    messages.push("No unresolved personalization tokens detected.");
  }

  const contextAdvice = pickContextAdvice(contextHint);
  messages.push(...contextAdvice);

  return messages;
}

function pickContextAdvice(contextHint?: string): string[] {
  if (!contextHint) {
    return [];
  }

  const normalized = contextHint.toLowerCase();
  return CONTEXT_ADVICE[normalized] ?? [];
}
