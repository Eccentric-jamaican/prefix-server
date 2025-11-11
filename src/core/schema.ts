import { scanTokens, type Finding, type ScanInput } from "./scanner.js";

export interface SchemaCheckInput {
  subject?: string;
  html?: string;
  text?: string;
  variables: string[];
  allowlist?: string[];
}

export interface SchemaCheckResult {
  missingVariables: string[];
  unusedVariables: string[];
  tokenIdentifiers: string[];
  unknownTokens: string[];
}

export function checkTemplateSchema(input: SchemaCheckInput): SchemaCheckResult {
  const scanInput: ScanInput = {
    subject: input.subject,
    html: input.html,
    text: input.text,
    allowlist: input.allowlist
  };

  const findings = scanTokens(scanInput).findings;

  const variableSet = new Set(input.variables.map((v) => normalizeIdentifier(v)));
  const matchedVariables = new Set<string>();
  const tokenIdentifiers = new Set<string>();
  const unknownTokens: string[] = [];

  for (const finding of findings) {
    const identifier = extractIdentifier(finding.token, finding.family);
    if (!identifier) {
      unknownTokens.push(finding.token);
      continue;
    }

    tokenIdentifiers.add(identifier);
    if (variableSet.has(identifier)) {
      matchedVariables.add(identifier);
    }
  }

  const missingVariables = [...tokenIdentifiers].filter((id) => !matchedVariables.has(id));
  const unusedVariables = [...variableSet].filter((id) => !tokenIdentifiers.has(id));

  return {
    missingVariables: missingVariables.sort(),
    unusedVariables: unusedVariables.sort(),
    tokenIdentifiers: [...tokenIdentifiers].sort(),
    unknownTokens
  };
}

function extractIdentifier(token: string, family: Finding["family"]): string | null {
  const trimmed = token.trim();

  switch (family) {
    case "handlebars":
    case "single_curly":
    case "liquid":
    case "loose_curly": {
      const inner = trimmed.replace(/^{+|}+$/g, "").trim();
      const base = inner.split(/[\s|]/)[0];
      return base ? normalizeIdentifier(base) : null;
    }
    case "template_string": {
      const inner = trimmed.replace(/^\$\{\s*/, "").replace(/\s*\}$/, "");
      return inner ? normalizeIdentifier(inner) : null;
    }
    case "mailchimp": {
      const inner = trimmed.replace(/^\*\|/, "").replace(/\|\*$/, "");
      return inner ? normalizeIdentifier(inner) : null;
    }
    case "square_brackets": {
      const inner = trimmed.replace(/^\[\[/, "").replace(/\]\]$/, "");
      return inner ? normalizeIdentifier(inner) : null;
    }
    case "percent_wrapped":
    case "sfmc_v": {
      const atMatch = trimmed.match(/@([A-Za-z0-9_.]+)/);
      if (atMatch) {
        return normalizeIdentifier(atMatch[1]);
      }
      const inner = trimmed.replace(/%+/g, "").replace(/=v\(/i, "").replace(/\)=/g, "");
      const base = inner.split(/[\s]/)[0];
      return base ? normalizeIdentifier(base) : null;
    }
    default: {
      const identifierMatch = trimmed.match(/[A-Za-z0-9_.]+/);
      return identifierMatch ? normalizeIdentifier(identifierMatch[0]) : null;
    }
  }
}

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^[@*|]+/, "").replace(/[*|]+$/, "").toLowerCase();
}
