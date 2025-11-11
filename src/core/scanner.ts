export interface ScanInput {
  subject?: string;
  html?: string;
  text?: string;
  allowlist?: string[];
}

export interface Finding {
  token: string;
  family: string;
  severity: "high" | "medium" | "low";
  location: "subject" | "html" | "text";
  line: number;
  snippet: string;
}

export interface ScanResult {
  findings: Finding[];
}

import { lineNumberAt, snippetAround } from "../utils/lines.js";

type Severity = Finding["severity"];

interface TokenPattern {
  family: Finding["family"];
  regex: RegExp;
}

const BODY_HIGH_THRESHOLD = 200;
const GUARD_NEARBY_DISTANCE = 120;
const GUARD_TOKEN = "<!-- guard:ignore -->";

const TOKEN_PATTERNS: TokenPattern[] = [
  { family: "handlebars", regex: /\{\{\s*[\w.\-]+\s*\}\}/g },
  { family: "single_curly", regex: /\{\s*[\w.\-]+\s*\}/g },
  { family: "mailchimp", regex: /\*\|\s*[\w.\-]+\s*\|\*/g },
  { family: "percent_wrapped", regex: /%%\s*[\w.\-@=()]+\s*%%/g },
  { family: "sfmc_v", regex: /%%=v\([^)]{1,80}\)=%%/gi },
  {
    family: "liquid",
    regex: /\{\{\s*[\w.\-]+(\s*\|\s*[\w.\-]+:[^}]*)?\s*\}\}/g
  },
  { family: "template_string", regex: /\$\{\s*[\w.\-]+\s*\}/g },
  { family: "square_brackets", regex: /\[\[\s*[\w.\-]+\s*\]\]/g },
  { family: "loose_curly", regex: /\{\{? *[A-Za-z][^}\n]{0,80} *\}?\}/g }
];

const FIELD_ORDER: ReadonlyArray<{
  key: "subject" | "html" | "text";
  location: Finding["location"];
}> = [
  { key: "subject", location: "subject" },
  { key: "html", location: "html" },
  { key: "text", location: "text" }
];

export function scanTokens(input: ScanInput): ScanResult {
  const allowlist = (input.allowlist ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.toLowerCase());
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const seenRanges = new Map<Finding["location"], Array<{ start: number; end: number }>>();

  for (const { key, location } of FIELD_ORDER) {
    const content = input[key];
    if (!content) {
      continue;
    }

    for (const pattern of TOKEN_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.regex.exec(content)) !== null) {
        if (match.index === undefined) {
          continue;
        }

        const token = match[0];
        if (isAllowlisted(token, allowlist)) {
          continue;
        }

        const start = match.index;
        const end = start + token.length;

        const keyId = `${location}:${start}`;
        if (seen.has(keyId)) {
          continue;
        }
        const locationRanges = seenRanges.get(location) ?? [];
        if (locationRanges.some((range) => rangesOverlap(range, { start, end }))) {
          continue;
        }
        seen.add(keyId);
        locationRanges.push({ start, end });
        seenRanges.set(location, locationRanges);

        const severity = determineSeverity({
          location,
          index: start
        });
        const adjustedSeverity = adjustSeverity({
          severity,
          location,
          content,
          index: start
        });

        const line = lineNumberAt(content, start);
        const snippet = snippetAround(content, start, token.length);

        findings.push({
          token,
          family: pattern.family,
          severity: adjustedSeverity,
          location,
          line,
          snippet
        });
      }
    }
  }

  return { findings };
}

function isAllowlisted(token: string, allowlist: string[]): boolean {
  const normalized = token.toLowerCase();
  const trimmed = normalized.trim();

  return allowlist.some(
    (allowed) => normalized.includes(allowed) || allowed.includes(trimmed)
  );
}

function determineSeverity({
  location,
  index
}: {
  location: Finding["location"];
  index: number;
}): Severity {
  if (location === "subject") {
    return "high";
  }

  return index < BODY_HIGH_THRESHOLD ? "high" : "medium";
}

function adjustSeverity({
  severity,
  location,
  content,
  index
}: {
  severity: Severity;
  location: Finding["location"];
  content: string;
  index: number;
}): Severity {
  if (location === "html" && isInsideHtmlComment(content, index)) {
    return "low";
  }

  if (hasGuardNearby(content, index)) {
    return "low";
  }

  return severity;
}

function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

function hasGuardNearby(content: string, index: number): boolean {
  const start = Math.max(0, index - GUARD_NEARBY_DISTANCE);
  const end = Math.min(content.length, index + GUARD_NEARBY_DISTANCE);

  return content.slice(start, end).includes(GUARD_TOKEN);
}

function isInsideHtmlComment(content: string, index: number): boolean {
  const commentStart = content.lastIndexOf("<!--", index);
  if (commentStart === -1) {
    return false;
  }

  const commentEnd = content.indexOf("-->", commentStart);
  if (commentEnd === -1) {
    return false;
  }

  return commentEnd >= index;
}
