# Prefix Integration Roadmap

> Working document for coordinating Convex, Polar, BetterAuth, WorkOS, and Prefix server touchpoints.
> Update this file whenever new integration work is identified.

## 1. Current Focus
- **Convex**: monitor usage reservation/finalization telemetry and build low-credit alerts.
- **Prefix API**: iterate on Convex-backed auth rollout (live credit enforcement, reporting).
- **Polar**: define products/metadata, wire webhook handlers to Convex credit mutations.
- **BetterAuth**: integrate Convex adapter, provision accounts/users on signup, manage invites.

## 2. Near-Term Tasks
1. Implement Convex mutations/queries
   - [x] `accounts.createFromBetterAuth`
   - [x] `credits.applyDelta` (wraps `adjustCreditBalance`)
   - [x] `usage.reserveAndLog`
   - [x] API key issue/revoke lifecycle
2. Update Prefix server middleware to delegate auth + quotas to Convex. ✅ (2025-11-14)
3. Build automated tests (Convex + server) covering credit adjustments and usage logging. ✅ (2025-11-14)
4. Document operational runbooks for credit reconciliation and webhook retries. ✅ (2025-11-14)

## 3. Medium-Term Tasks
- Polar checkout integration within dashboard.
- Alerting pipeline (low credit, billing failures) via Convex scheduled actions.
- BetterAuth invite/role management UI + email notifications.
- Usage analytics query for dashboard charts.

## 4. Long-Term / Stretch
- WorkOS SSO integration (SAML/OIDC) with shared provisioning mutations.
- Customer self-serve API key rotation with audit trail exports.
- Multi-region credit consistency checks and alerting.
- SLA-level monitoring (latency, error budgets) and public status page feed.

- **2025-11-13**: API key lifecycle mutations/queries (issue, revoke, markUsed, verify) implemented.
- **2025-11-13**: Core Convex mutations for account provisioning, credit delta, and usage reservation implemented.
- **2025-11-13**: Initial roadmap created to track expanding integration scope.

---
_Last updated: 2025-11-13_
