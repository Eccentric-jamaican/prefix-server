import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { readFileSync } from "node:fs";
import { app } from "../src/server.js";
import * as fetchModule from "../src/core/fetch.js";
import { clearUrlCache } from "../src/routes/url.js";

describe("POST /v1/scan", () => {
  beforeEach(() => {
    delete process.env.API_KEY;
    delete process.env.METRICS_ENABLED;
    vi.restoreAllMocks();
  });

  it("returns 409 when findings meet fail_on threshold", async () => {
    const response = await request(app)
      .post("/v1/scan")
      .send({
        subject: "Hello {First_name}",
        fail_on: "medium",
        context_hint: "mailchimp"
      })
      .expect(409);

    expect(response.body).toMatchObject({
      ok: false,
      worst_severity: "high",
      fail_on: "medium"
    });
    expect(response.body.findings).toHaveLength(1);
    expect(response.body.advice.some((line: string) => line.includes("Mailchimp"))).toBe(true);
  });

  it("returns 200 when findings are below fail_on threshold", async () => {
    const padding = "a".repeat(210);
    const html = `${padding}<p>{{ first_name }}</p>`;

    const response = await request(app)
      .post("/v1/scan")
      .send({
        html,
        fail_on: "high"
      })
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      worst_severity: "medium",
      fail_on: "high"
    });
  });

  it("returns 200 when fail_on is none despite high severity findings", async () => {
    const response = await request(app)
      .post("/v1/scan")
      .send({
        subject: "Alert {{ user_email }}",
        fail_on: "none"
      })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.worst_severity).toBe("high");
    expect(response.body.fail_on).toBe("none");
  });

  it("respects allowlist entries and returns ok", async () => {
    const response = await request(app)
      .post("/v1/scan")
      .send({
        html: "<div>{{ copyright }}</div>",
        allowlist: ["{{ copyright }}"]
      })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.severity_summary).toEqual({ high: 0, medium: 0, low: 0 });
  });

  it("drops severity to low when guard comment present", async () => {
    const response = await request(app)
      .post("/v1/scan")
      .send({
        html: "<!-- guard:ignore --><p>{{ name }}</p>",
        fail_on: "medium"
      })
      .expect(200);

    expect(response.body.severity_summary.low).toBe(1);
    expect(response.body.ok).toBe(true);
  });

  it("returns 400 when payload missing content", async () => {
    const response = await request(app).post("/v1/scan").send({}).expect(400);

    expect(response.body.ok).toBe(false);
    expect(response.body.error).toBe("Invalid request body");
  });

  it("requires bearer auth when API_KEY is set", async () => {
    process.env.API_KEY = "secret";

    const unauthorized = await request(app).post("/v1/scan").send({ subject: "Hi {name}" });
    expect(unauthorized.status).toBe(401);

    const authorized = await request(app)
      .post("/v1/scan")
      .set("Authorization", "Bearer secret")
      .send({ subject: "Hi {name}" });

    expect(authorized.status).toBe(409);
  });
});

describe("POST /v1/scan/schema", () => {
  beforeEach(() => {
    delete process.env.API_KEY;
  });

  it("reports missing and unused variables", async () => {
    const response = await request(app)
      .post("/v1/scan/schema")
      .send({
        html: "<p>{{ first_name }}</p>",
        variables: ["first_name", "last_name"]
      })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.missingVariables).toEqual([]);
    expect(response.body.unusedVariables).toEqual(["last_name"]);
    expect(response.body.tokenIdentifiers).toEqual(["first_name"]);
  });

  it("returns 400 on invalid payload", async () => {
    const response = await request(app).post("/v1/scan/schema").send({}).expect(400);

    expect(response.body.ok).toBe(false);
    expect(response.body.error).toBe("Invalid request body");
  });
});

describe("POST /v1/scan/url", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.API_KEY;
    clearUrlCache();
  });

  it("returns 409 when fetched HTML has blocking tokens", async () => {
    vi.spyOn(fetchModule, "fetchHtml").mockResolvedValue("<p>{{ first_name }}</p>");

    const response = await request(app)
      .post("/v1/scan/url")
      .send({ url: "https://example.com/email" })
      .expect(409);

    expect(fetchModule.fetchHtml).toHaveBeenCalledWith("https://example.com/email");
    expect(response.body.ok).toBe(false);
    expect(response.body.worst_severity).toBe("high");
  });

  it("handles large HTML payloads", async () => {
    const largeHtml = "<p>{{ name }}</p>".padStart(5000, "a");
    vi.spyOn(fetchModule, "fetchHtml").mockResolvedValue(largeHtml);

    const response = await request(app)
      .post("/v1/scan/url")
      .send({ url: "https://example.com/big" })
      .expect(409);

    expect(response.body.findings.length).toBeGreaterThan(0);
  });

  it("caches responses for repeated URLs", async () => {
    const fetchSpy = vi.spyOn(fetchModule, "fetchHtml").mockResolvedValue("<p>{{ name }}</p>");

    await request(app).post("/v1/scan/url").send({ url: "https://cache.tld/item" }).expect(409);
    await request(app).post("/v1/scan/url").send({ url: "https://cache.tld/item" }).expect(409);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("honors allowlist when scanning fetched HTML", async () => {
    vi.spyOn(fetchModule, "fetchHtml").mockResolvedValue("<div>{{ safe_token }}</div>");

    const response = await request(app)
      .post("/v1/scan/url")
      .send({ url: "https://example.com/safe", allowlist: ["{{ safe_token }}"] })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.severity_summary).toEqual({ high: 0, medium: 0, low: 0 });
  });

  it("returns 502 when fetch fails", async () => {
    vi.spyOn(fetchModule, "fetchHtml").mockRejectedValue(new fetchModule.FetchError("Timeout"));

    const response = await request(app)
      .post("/v1/scan/url")
      .send({ url: "https://bad.example" })
      .expect(502);

    expect(response.body.ok).toBe(false);
  });
});

describe("POST /v1/scan/rfc822", () => {
  beforeEach(() => {
    delete process.env.API_KEY;
  });

  it("parses raw RFC822 string payload", async () => {
    const raw = readFileSync(new URL("./fixtures/rfc822/welcome.eml", import.meta.url), "utf-8");

    const response = await request(app)
      .post("/v1/scan/rfc822")
      .set("Content-Type", "text/plain")
      .send(raw)
      .expect(409);

    expect(response.body.worst_severity).toBe("high");
  });

  it("returns 400 when unable to parse message", async () => {
    const response = await request(app)
      .post("/v1/scan/rfc822")
      .send({ raw: "" })
      .expect(400);

    expect(response.body.ok).toBe(false);
  });
});

describe("GET /v1/metrics", () => {
  beforeEach(() => {
    delete process.env.METRICS_ENABLED;
  });

  it("returns 404 when metrics disabled", async () => {
    const response = await request(app).get("/v1/metrics").expect(404);

    expect(response.body.ok).toBe(false);
  });

  it("responds with metrics output when enabled", async () => {
    process.env.METRICS_ENABLED = "true";

    const response = await request(app).get("/v1/metrics").expect(200);

    expect(response.text).toContain("process_cpu_user_seconds_total");
  });
});

describe("Idempotency", () => {
  beforeEach(() => {
    delete process.env.API_KEY;
  });

  it("returns cached response when Idempotency-Key repeats", async () => {
    const key = "fixed-key";

    const first = await request(app)
      .post("/v1/scan")
      .set("Idempotency-Key", key)
      .send({ subject: "Hello {First_name}" })
      .expect(409);

    const second = await request(app)
      .post("/v1/scan")
      .set("Idempotency-Key", key)
      .send({ subject: "Ignored payload" })
      .expect(409);

    expect(second.body).toEqual(first.body);
  });
});
