export interface ParsedRfc822 {
  subject?: string;
  html?: string;
  text?: string;
}

export function parseRfc822(raw: string): ParsedRfc822 {
  if (!raw.trim()) {
    return {};
  }

  const normalized = raw.replace(/\r\n/g, "\n");
  const separatorIndex = normalized.indexOf("\n\n");

  const headerSection = separatorIndex >= 0 ? normalized.slice(0, separatorIndex) : normalized;
  const bodySection = separatorIndex >= 0 ? normalized.slice(separatorIndex + 2) : "";

  const headers = parseHeaders(headerSection);
  const subject = headers.get("subject");
  const contentType = headers.get("content-type") ?? "";

  const body = bodySection.trim();
  if (!body) {
    return subject ? { subject } : {};
  }

  const isHtml = /text\/(html|xhtml)/i.test(contentType) || /<\s*(html|body|p|div|table)[^>]*>/i.test(body);

  if (isHtml) {
    return {
      subject,
      html: body
    };
  }

  return {
    subject,
    text: body
  };
}

function parseHeaders(section: string): Map<string, string> {
  const headers = new Map<string, string>();
  let currentKey: string | null = null;
  let currentValue = "";

  const lines = section.split("\n");
  for (const line of lines) {
    if (/^[\t ]/.test(line) && currentKey) {
      currentValue += ` ${line.trim()}`;
      continue;
    }

    if (currentKey) {
      headers.set(currentKey, currentValue.trim());
      currentKey = null;
      currentValue = "";
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    currentKey = line.slice(0, separatorIndex).trim().toLowerCase();
    currentValue = line.slice(separatorIndex + 1).trim();
  }

  if (currentKey) {
    headers.set(currentKey, currentValue.trim());
  }

  return headers;
}
