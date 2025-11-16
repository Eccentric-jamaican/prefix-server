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
5. Seed Polar product catalog (sandbox) and record IDs. ✅ (2025-11-15)
   - Starter: `b05dac02-5a09-40fa-8255-0ab05bdc8c16`
   - Growth: `49580b8e-f109-4381-bb08-325cec7e5502`
   - Scale: `da6fbebf-bf7a-4bb5-81fb-9246f0bddba7`
6. Provision Polar credit benefits + attach to products (sandbox). ✅ (2025-11-15)
   - Starter benefit: `e29b989c-942e-4f90-a857-df9c387755cc`
   - Growth benefit: `2e045371-de74-49bc-bf40-4484c8481d61`
   - Scale benefit: `a0d7f423-74d7-4f13-904e-9a7c133130a0`
7. Extend Convex onboarding to use Polar plan definitions + paid plan grants. ✅ (2025-11-15)
   - `createFromBetterAuth` accepts `planKey` and stores Polar product/benefit ids.
   - Added `accounts.assignPlan` for upgrades + idempotent credit grants.
   - Accounts schema now tracks `polarProductId`, `polarBenefitId`, `creditsPerCycle`, `planAssignedAt`.
   - ✅ Added `test/convex.accounts.spec.ts` (Vitest) to assert plan metadata persistence in `handleCreateFromBetterAuth` and credit grants in `handleAssignPlan` using mocked ledgers (2025-11-15).

**Up next (billing):**
- Write Polar webhook handler to sync subscription lifecycle → Convex `assignPlan` / credit refills.
- Persist benefit IDs / plan metadata in frontend onboarding (BetterAuth UI) & expose plan picker.
- Decide meter integration vs custom benefits before production seed; capture meter IDs via env.
- Add operational runbook for rerunning product/benefit seeders.

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
_Last updated: 2025-11-15_
