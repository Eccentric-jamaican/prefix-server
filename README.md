# Prefix

Prefix is an API-first pre-send validator that scans email subjects and bodies for unresolved merge/personalization tokens. It surfaces findings with severity levels and blocks shipments that violate your policy (HTTP 409), making it easy to drop into n8n, Make, Zapier, or bespoke workflow automations.

## Features

- Vendor-agnostic token detection across Handlebars, Mailchimp, Liquid, Salesforce Marketing Cloud AMPscript, and more.
- Policy enforcement via `fail_on` levels (`none`, `low`, `medium`, `high`) with machine-readable findings.
- Multiple ingest options: raw fields, remote templates via URL fetch, RFC822 messages, and schema cross-checking.
- Context-aware advice based on ESP hints.
- Optional Prometheus metrics, request rate limiting, API key authentication, and URL caching.

## Quick Start

```bash
npm install
npm run build
npm start
# Server listens on PORT (default 8080)
```

For live reload during development:

```bash
npm run dev
```

### Endpoints

| Method | Path              | Description                                |
| ------ | ----------------- | ------------------------------------------ |
| GET    | `/v1/health`      | Liveness probe                             |
| POST   | `/v1/scan`        | Scan inline subject/html/text payloads     |
| POST   | `/v1/scan/url`    | Fetch URL content and scan                 |
| POST   | `/v1/scan/rfc822` | Scan raw RFC822 email payloads             |
| POST   | `/v1/scan/schema` | Cross-check detected tokens vs variables   |
| GET    | `/v1/metrics`     | Prometheus metrics (when enabled)          |

Refer to [`openapi/prefix.v1.yaml`](./openapi/prefix.v1.yaml) for full request/response schemas and examples.

### Example cURL

```bash
curl -X POST http://localhost:8080/v1/scan \
  -H "Authorization: Bearer change-me" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Hello {First_name}",
    "html": "<p>Hi {{ first_name }}</p>",
    "text": "Hi *|FNAME|*",
    "fail_on": "medium",
    "allowlist": ["{{copyright}}"]
  }' -i
```

A blocking response returns HTTP 409 with a list of findings.

## Workflow Integrations

### n8n
1. Insert an **HTTP Request** node before your ESP node.
2. Configure POST `https://your-prefix/v1/scan` with JSON body using expression values (`{{$json.html}}` etc.).
3. Set **Full Response** to true and branch on `statusCode != 200` to halt workflow and notify.

### Make (Integromat)
1. Add HTTP > Make a request (POST) with the same JSON body.
2. Use a router: when status code is `409`, alert + halt; when `200`, continue to ESP module.

### Zapier
1. Use **Webhooks by Zapier** → Custom Request (POST).
2. Map email fields, set headers (Authorization, Content-Type).
3. Add a Filter step to continue only when `status_code == 200`.

## ESP Notes

- **Resend**: ensure template variables match payload JSON before calling the ESP.
- **Mailchimp**: supports merge tags such as `*|FNAME|*`; Prefix will highlight missing fields.
- **Salesforce Marketing Cloud**: detects AMPscript (`%%=v(@FirstName)=%%`); cross-check against data extensions.
- **Instantly**: check that HTML personalization tokens resolve before cold outreach.

## Environment Variables

| Name                   | Default | Description                                    |
| ---------------------- | ------- | ---------------------------------------------- |
| `PORT`                 | 8080    | HTTP port                                      |
| `API_KEY`              | –       | If set, requires `Authorization: Bearer` token |
| `REQUEST_LIMIT_PER_MIN`| 120     | Rate-limit window per IP                       |
| `BODY_LIMIT`           | 2mb     | Max request payload size                       |
| `CORS_ORIGIN`          | *       | Allowed CORS origin                            |
| `METRICS_ENABLED`      | false   | Enable `/v1/metrics` Prometheus output         |
| `FETCH_TIMEOUT_MS`     | 7000    | URL fetch timeout                              |
| `URL_CACHE_TTL_MS`     | 30000   | TTL for URL fetch cache                        |
| `URL_CACHE_MAX`        | 64      | Max entries in URL fetch cache                 |
| `CONVEX_DEPLOYMENT_URL` / `CONVEX_URL` | – | Base URL for Convex deployment used by the server |
| `POLAR_ACCESS_TOKEN` / `POLAR_SANDBOX_ACCESS_TOKEN` | – | Organization access tokens for Polar API (prod vs sandbox) |
| `POLAR_API_BASE_URL` / `POLAR_SANDBOX_API_BASE_URL` | Polar defaults | Override API base URLs when needed |
| `POLAR_CREDITS_METER_ID` / `POLAR_SANDBOX_CREDITS_METER_ID` | – | Optional Polar meter IDs for issuing credit benefits; leave blank to fall back to custom benefits |

### Polar product seeding

Provision the SaaS plans inside Polar once the env tokens are configured:

```bash
# seed sandbox (default)
npm run polar:seed

# seed production (uses POLAR_ACCESS_TOKEN / POLAR_API_BASE_URL)
npm run polar:seed:prod
```

The script is idempotent: it looks up products by `metadata.plan_id` and only creates missing ones. Capture the returned product IDs (printed in the console) and store them in Convex/BetterAuth onboarding flows as needed.

### Polar benefit seeding

Provision per-plan credit benefits so that Polar subscriptions grant the right entitlements:

```bash
# seed sandbox (default)
npm run polar:benefits

# seed production (uses POLAR_ACCESS_TOKEN / POLAR_API_BASE_URL)
npm run polar:benefits:prod
```

If `POLAR_CREDITS_METER_ID` (or the sandbox variant) is set, benefits will be created as meter-credit benefits targeting that meter; otherwise the script falls back to custom benefits with credit metadata. The script also attaches benefits to the matching products and prints both product and benefit IDs for wiring into Convex.

## Docker

```bash
docker build -t prefix .
docker run -p 8080:8080 -e API_KEY=change-me prefix
```

Alternatively, use `docker-compose up --build` to start the service with defaults and health check.

## Deployment Notes

### Container platforms

- **Docker**: deploy using the provided `Dockerfile`. Set environment variables through your orchestrator or `.env` file mounted at runtime.
- **Kubernetes**: create a Deployment with rolling updates, supply env vars via Secrets/ConfigMaps, and expose port 8080 with a Service/Ingress. Include readiness probes hitting `/v1/health` and liveness probes hitting the same endpoint with longer initial delay.
- **Serverless** (Cloud Run/Fargate): build the image with the included `Dockerfile`, set `PORT`, and configure minimum instances to avoid cold starts if latency-sensitive.

### Release workflow

1. Run `npm test` locally to ensure a green suite.
2. Update the changelog (see `CHANGELOG.md`).
3. Tag using `npm run release -- patch|minor|major` (script described below).
4. Push tags and rely on CI (`.github/workflows/ci.yml`) for validation before deployment.

## OpenAPI & Postman

- [`openapi/prefix.v1.yaml`](./openapi/prefix.v1.yaml) describes all endpoints.
- [`scripts/postman-collection.json`](./scripts/postman-collection.json) provides importable examples.

## Error Codes

| Status | Meaning                           | Notes                                                                 |
| ------ | --------------------------------- | --------------------------------------------------------------------- |
| 200    | OK                                | Request processed without blocking findings.                          |
| 401    | Unauthorized                      | Missing/invalid API key when `API_KEY` is configured.                 |
| 400    | Bad Request                       | Validation error; response payload includes `issues` array.           |
| 409    | Policy Blocked                    | Findings exceed `fail_on` policy; review `findings` for remediation.  |
| 429    | Too Many Requests                 | Rate limit surpassed; adjust volume or increase `REQUEST_LIMIT...`.   |
| 502    | Bad Gateway (upstream fetch fail) | `/v1/scan/url` could not fetch the template within timeout.           |

## Logging & Diagnostics

Prefix uses `pino-http` via middleware. Logs are JSON by default and include response status/time. Configure log level by setting `LOG_LEVEL` env var (defaults to `info`).

Recommended practices:

- Forward container stdout/stderr to your log aggregator (Cloud Logging, Datadog, etc.).
- Enable request IDs by injecting `req.id` (pino assigns one automatically) into downstream alerts.
- For structured events, augment responses with `Idempotency-Key` to correlate retries.
- Use `METRICS_ENABLED=true` and scrape `/v1/metrics` for Prometheus-compatible dashboards.

## Monitoring & Alerting

- **Prometheus**: add a scrape job pointing to `http://prefix:8080/v1/metrics`. Use the sample Grafana dashboard stored at [`scripts/monitoring/grafana-dashboard.json`](./scripts/monitoring/grafana-dashboard.json) for a prebuilt overview of request volumes, latency, and block rates.
- **Alerts**: configure alert rules for spikes in non-200 responses, especially 409s and 5xx, and alert on absence of metrics to detect ingestion failures. Include `Idempotency-Key` values in annotations to correlate duplicates.
- **Synthetic checks**: schedule health probes (`/v1/health`) and smoke scans (allowlisted payload) to verify the scanner pipeline and upstream dependencies.

## Operations Runbook

- **Trust proxy aware rate limiting**: Prefix enables `app.set("trust proxy", true)` so Express honors Railway/ingress `X-Forwarded-*` headers. When deploying behind another proxy or load balancer, confirm it forwards client IPs; otherwise rate limiting will treat all requests as the same source.
- **API key rotation**:
  1. Generate a new key (or let Railway issue one) and update the service’s `API_KEY` env var.
  2. Redeploy or restart the service so `requireApiKey` reads the new value.
  3. Distribute the new bearer token to downstream automations, then revoke the old key.
  In code and in `.env.example` the key stays under `API_KEY`; keep placeholders committed and never store live secrets.
- **Credit reconciliation**:
  1. Use the Convex dashboard or CLI to inspect `creditLedger` entries filtered by `requestId` or `metadata.scanType` when auditing specific scans.
  2. Cross-check the most recent `usageEvents` records (ordered by `createdAt`) to ensure each reservation has a finalized status/severity.
  3. Alert on low balances by monitoring `accounts.creditBalance` against `DEFAULT_LOW_CREDIT_THRESHOLD` (Convex scheduled functions can emit notifications).
  4. When reversing charges, call the Convex `credits.applyDelta` mutation with a positive `delta` and matching `requestId` metadata to maintain an audit trail.
- **Post-deploy verification**:
  - Run `npm test` to re-confirm the suite, including allowlist, `fail_on`, and cached URL coverage.
  - Execute a smoke script (see `Invoke-PrefixRequest` example in the docs or Postman collection) that:
    1. Hits `/v1/scan/rfc822` with a clean payload and expects `{"ok":true}`.
    2. Submits a templated payload and confirms HTTP 409 with findings.
    3. Calls `/v1/scan/url` and `/v1/scan` with allowlists to verify caching and bypass logic.
  - Rotate the API key again if smoke tests required exposing it in terminals or logs.

## Testing & Linting

```bash
npm run lint
npm run test
```

CI workflow (GitHub Actions) runs lint, type-check, tests, and build.

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE).

---

Prefix is designed to be dropped into automations as a safeguard. Let it block risky sends before your ESP does.
