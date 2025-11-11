import { describe, it, expect } from "vitest";

import { scanTokens } from "../src/core/scanner.js";

describe("scanTokens", () => {
  it("detects tokens in subject as high severity", () => {
    const result = scanTokens({ subject: "Hello {First_name}" });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      token: "{First_name}",
      family: "single_curly",
      severity: "high",
      location: "subject"
    });
  });

  it("detects handlebars token in HTML body as medium severity after 200 chars", () => {
    const padding = "a".repeat(210);
    const html = `${padding}<p>{{ first_name }}</p>`;

    const result = scanTokens({ html });

    expect(result.findings[0]).toMatchObject({
      family: "handlebars",
      severity: "medium",
      location: "html"
    });
  });

  it("treats tokens in first 200 chars as high severity", () => {
    const html = `<div>Hi {{ first_name }}</div>`;

    const result = scanTokens({ html });

    expect(result.findings[0].severity).toBe("high");
  });

  it("marks findings as low when guard comment is nearby", () => {
    const html = `<!-- guard:ignore -->\n<p>{{ first_name }}</p>`;

    const result = scanTokens({ html });

    expect(result.findings[0].severity).toBe("low");
  });

  it("marks findings inside html comments as low", () => {
    const html = `<!-- Comment with {{ first_name }} token -->`;

    const result = scanTokens({ html });

    expect(result.findings[0].severity).toBe("low");
  });

  it("applies allowlist to skip tokens", () => {
    const html = `<p>{{ copyright }}</p>`;

    const result = scanTokens({
      html,
      allowlist: ["{{ copyright }}"]
    });

    expect(result.findings).toHaveLength(0);
  });

  it("deduplicates overlapping regex families for same token", () => {
    const text = "Message {{ name }}";

    const result = scanTokens({ text });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].token).toBe("{{ name }}");
  });

  it("captures multiple distinct occurrences", () => {
    const text = "Hi {{ name }} and again {{ name }}";

    const result = scanTokens({ text });

    expect(result.findings).toHaveLength(2);
    expect(result.findings.every((finding) => finding.token === "{{ name }}")).toBe(true);
  });
});
