 Build a robust, production-ready service called **Prefix**: an API-first pre-send validator that detects unrendered merge/personalization tokens in email subjects/bodies and **blocks** sends by returning HTTP 409. It must be vendor-agnostic and easy to drop into n8n/Make/Zapier automations.

## Objectives

* Provide simple HTTP APIs to scan **subject**, **HTML**, **text**, or a **template URL** (or **RFC822 raw**) for unresolved tokens like `{First_name}`, `{{ first_name }}`, `*|FNAME|*`, `%%FirstName%%`, `%%=v(@FirstName)=%%`, etc.
* Return machine-readable findings with **severity** and **location**; **409** when severity breaches policy.
* Ship with OpenAPI spec, Dockerfile, CI, tests, and examples for n8n/Make/Zapier mapping.

## Tech Stack

* **Node 20 + TypeScript**
* **Express** (API), **zod** (request validation), **pino** (JSON logs)
* **Helmet**, **CORS**, **express-rate-limit**
* **Vitest** + **Supertest** (unit/integration tests)
* **ESLint** + **Prettier**
* **dotenv** (config)
* Optional metrics: **prom-client** (/metrics, Prometheus format)

## Token Detection (support ALL below)

Use efficient, tested regex sets (global, case-aware where noted), each with a family label:

* Handlebars/Mustache: `/\{\{\s*[\w.\-]+\s*\}\}/g`
* Single curly: `/\{\s*[\w.\-]+\s*\}/g`
* Mailchimp classic: `/\*\|\s*[\w.\-]+\s*\|\*/g`  (e.g., `*|FNAME|*`)
* Percent wrapped: `/%%\s*[\w.\-@=()]+\s*%%/g`   (e.g., `%%FirstName%%`)
* SFMC v(): `/%%=v\([^)]{1,80}\)=%%/gi`          (e.g., `%%=v(@FirstName)=%%`)
* Liquid (basic filter pipe allowed): `/\{\{\s*[\w.\-]+(\s*\|\s*[\w.\-]+:[^}]*)?\s*\}\}/g`
* Template string: `/\$\{\s*[\w.\-]+\s*\}/g`
* Square brackets: `/\[\[\s*[\w.\-]+\s*\]\]/g`
* Loose curly catch-all (bounded): `/\{\{? *[A-Za-z][^}\n]{0,80} *\}?\}/g`

### Severity rules

* **high**: found in `subject` OR first 200 chars of body.
* **medium**: rest of body (`html`, `text`) and typical attributes (`alt`, `title`, `aria-label` if surfaced).
* **low**: inside HTML comments or explicitly escaped (see escape rule below).

### Allow/escape

* Request body can pass `allowlist: string[]`; if a finding’s token **includes** any allowlisted string, skip it.
* Escape rule: if content has `<!-- guard:ignore -->` within 120 chars of a finding, drop to **low** severity.

## API Design

Implement **Bearer** auth if `API_KEY` is set; otherwise run open for local.

Endpoints (prefix `/v1`):

1. `GET /v1/health` → `200 "ok"`
2. `POST /v1/scan` (JSON)

```ts
{
  subject?: string;
  html?: string;
  text?: string;
  allowlist?: string[];
  fail_on?: "none" | "low" | "medium" | "high"; // default "medium"
  context_hint?: "resend" | "mailchimp" | "sfmc" | "instantly" | string;
}
```

* Response: `200` if no blocking findings; `409` if worst severity >= `fail_on`.
* Body:

```ts
{
  ok: boolean;
  severity_summary: { high: number; medium: number; low: number };
  findings: Array<{
    token: string;
    family: string;
    severity: "high"|"medium"|"low";
    location: "subject"|"html"|"text";
    line: number;
    snippet: string;
  }>;
  advice: string[];
}
```

3. `POST /v1/scan/url` (JSON)

```ts
{ url: string; subject?: string; allowlist?: string[]; fail_on?: "low"|"medium"|"high"|"none" }
```

* Fetch the URL (timeout 7s), scan HTML + optional subject. Return `200` or `409`.

4. `POST /v1/scan/rfc822`
   Accept either `message/rfc822` raw text or JSON `{ raw: string, allowlist?: string[], fail_on?: ... }`.

* Parse subject (simple parse ok), scan body as `html` and `text`.

5. `GET /v1/metrics` (optional) → Prometheus metrics when `METRICS_ENABLED=true`.

### Behavior

* **Blocking**: respond **409** on policy breach, else 200.
* **Rate limit**: 120 req/min/IP (env-tunable).
* **Request size limit**: 2MB (env-tunable).
* **CORS**: allow all origins by default; configurable via `CORS_ORIGIN`.
* **Idempotency**: If `Idempotency-Key` is present, store last status in memory (LRU) and return same status for duplicates within 10 minutes.

## Project Structure

```
prefix/
  src/
    server.ts
    routes/
      scan.ts
      url.ts
      rfc822.ts
      health.ts
      metrics.ts
    core/
      scanner.ts        // regex sets, scanning of fields, severity, allowlist, ignore comment
      summarize.ts
      policy.ts         // fail_on logic
      fetch.ts          // safe fetch with timeout & UA
      parse-rfc822.ts   // tiny subject/body extractor (keep simple)
    middleware/
      auth.ts           // Bearer API_KEY
      errors.ts
      cors.ts
      rateLimit.ts
    utils/lines.ts      // line calc + snippet
  test/
    scanner.spec.ts
    api.spec.ts
    fixtures/
      good.html
      bad-subject.html
      mailchimp.html
      sfmc.html
  openapi/
    prefix.v1.yaml
  scripts/
    postman-collection.json
  Dockerfile
  docker-compose.yml
  package.json
  tsconfig.json
  .eslintrc.cjs
  .prettierrc
  README.md
  LICENSE
```

## Implementation Requirements

* Strong input validation with **zod**; return `400` on invalid payloads.
* **Helmet** for headers; **pino** logs (request id, status, ms).
* Findings include `line` and a 80-char `snippet` (strip newlines).
* **policy.ts** determines worst severity and compares to `fail_on`.
* **scanner.ts** should:

  * Scan each field once per pattern.
  * De-duplicate same index/token pairs.
  * Detect HTML comment proximity for ignore.
* **openapi/prefix.v1.yaml** must fully describe all endpoints, request/response schemas, and examples.
* Produce **README.md** with:

  * Quick start (npm scripts), cURL examples, env vars.
  * n8n/Make/Zapier integration steps (below).
  * ESP notes (Resend/Mailchimp/SFMC/Instantly).

## Env Vars

```
PORT=8080
API_KEY=change-me
REQUEST_LIMIT_PER_MIN=120
BODY_LIMIT=2mb
CORS_ORIGIN=*
METRICS_ENABLED=true
FETCH_TIMEOUT_MS=7000
```

## NPM Scripts

* `dev`: ts-node-dev server
* `build`: tsc
* `start`: node dist/server.js
* `lint`, `format`
* `test`: vitest run
* `test:watch`

## Docker

**Dockerfile**

* Node 20-alpine, `npm ci`, `npm run build`, `CMD node dist/server.js`.
  **docker-compose.yml**
* Web service on 8080 with `API_KEY`, healthcheck curl `/v1/health`.

## CI (GitHub Actions)

* On PR: install, lint, type-check, test, build.
* On main: build Docker image, push to GHCR (if provided secrets).
* Cache deps.

## Tests (minimum)

* `scanner.spec.ts`

  * Detect `{First_name}` in subject → high.
  * Detect `{{ first_name }}` in HTML line N → medium.
  * `*|FNAME|*` in text → medium.
  * `%%=v(@FirstName)=%%` → medium.
  * `<!-- guard:ignore -->` near token → low (or ignored per rule).
  * Allowlist excludes tokens.
* `api.spec.ts`

  * `/v1/scan` returns 409 when fail_on=medium and findings exist.
  * `/v1/scan` returns 200 when fail_on=high and only medium findings exist.
  * `/v1/scan/url` fetch timeout returns 502 JSON.
  * Auth 401 when API_KEY set and header missing.
  * RFC822 parsing extracts Subject correctly.

## Example Usage (include in README and Postman collection)

**cURL (blocking example)**

```bash
curl -X POST http://localhost:8080/v1/scan \
 -H "Authorization: Bearer change-me" -H "Content-Type: application/json" \
 -d '{"subject":"Hello {First_name}", "html":"<p>Hi {{ first_name }}</p>", "text":"Hi *|FNAME|*", "fail_on":"medium"}' \
 -i
# Expect: HTTP/1.1 409 with findings array
```

**n8n Wiring (document exact fields)**

* **HTTP Request** node before ESP send:

  * Method: POST, URL: `https://YOUR_PREFIX/v1/scan`
  * Headers: `Authorization: Bearer {{ $env.PREFIX_API_KEY }}`, `Content-Type: application/json`
  * JSON Body:

```json
{
  "subject": "={{$json.subject || ''}}",
  "html": "={{$json.html || ''}}",
  "text": "={{$json.text || ''}}",
  "fail_on": "medium",
  "allowlist": ["{year}", "{{copyright}}"]
}
```

* Set **Full Response** = true.
* **IF** node: `{{$json.statusCode}} != 200` → route to Slack/email alert and **halt** pipeline; else continue to Resend/Mailchimp module.

**Make (Integromat)**

* HTTP > Make a request (POST, JSON body same as above).
* Router: when Status Code = 409 → notify & stop; when 200 → continue.

**Zapier**

* Webhooks by Zapier > Custom Request (POST).
* Only continue if **Status Code = 200**; otherwise send Slack/Email and stop Zap.

## Documentation

* Provide `README.md` with:

  * What problem Prefix solves.
  * Endpoint docs + examples.
  * n8n/Make/Zapier setup screenshots (describe fields).
  * ESP notes: Resend (template + variables), Mailchimp (`*|FNAME|*`), SFMC (AMPscript), Instantly (HTML before send).
  * Security model (Bearer), rate limits, and error codes table.

## Nice-to-Have (implement if time allows)

* `/v1/scan/schema`: Accept `{ variables: string[] }` and a template to cross-check that every token present has a provided variable (schema mismatch warning).
* Basic HTML stripping (for `text`) to avoid double counting.
* LRU cache for `/v1/scan/url` responses (30s) to reduce fetch load.

## Deliverables

* Fully working TypeScript project meeting the above spec.
* Passing tests and lint.
* `openapi/prefix.v1.yaml` accurate and importable.
* Docker image runs locally and returns expected 200/409.
* Postman/Insomnia collection in `scripts/postman-collection.json`.

Build now.

---