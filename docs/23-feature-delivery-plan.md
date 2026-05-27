# Feature Delivery Plan: Account Auth, Initialization Wizard, and SMS Fallback

## Context Review

Current dashboard login requires a raw API key input and validation (`/api/auth/validate`), which is functional but not user-friendly for human operators. The frontend stores the API key in session storage and sends it on every request via `X-API-Key`. Existing UI and API already expose role concepts, but roles are currently attached to API keys rather than user identities.

This plan introduces:

1. **Bundle A (single PR/branch):** Account-based dashboard authentication + guided OpenWA initialization.
2. **Bundle B (separate PR/branch):** Optional SMS fallback plugin when WhatsApp destination is invalid/unregistered.

---

## Bundle A — Account-Based Authentication + Initialization Wizard

### Goals

- Replace API key-only dashboard login with account sessions (email/username + password).
- Reuse existing RBAC model by assigning role to account (`admin`, `operator`, `viewer`).
- Provide first-run setup flow for infrastructure configuration and bootstrap admin creation.
- Auto-provision first admin API key after bootstrap to preserve API-first workflows.

### Proposed Architecture

#### 1) Account Authentication (Dashboard)

- Add `users` (or `accounts`) domain in backend:
  - `id`, `email` (or username), `passwordHash`, `role`, `isActive`, timestamps.
- Add auth endpoints:
  - `POST /auth/login` → returns signed access token + refresh token.
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
- Add JWT auth guard for dashboard endpoints.
- Keep API-key auth for public/API clients (dual auth mode), but dashboard should prefer bearer token.
- Add password hashing with Argon2 or bcrypt and login rate limiting.

#### 2) RBAC Reuse

- Move/align role enum so both API keys and accounts share role semantics.
- Extend authorization middleware/guards to accept principal from either:
  - JWT account identity, or
  - API key identity.
- Maintain current permission checks (admin/operator/viewer behavior).

#### 3) Initialization Wizard (First-Run Experience)

- Add backend flag/state for setup completion (e.g., `setup_completed` config).
- Add endpoint group:
  - `GET /setup/status`
  - `POST /setup/configure-infrastructure`
  - `POST /setup/create-admin`
  - `POST /setup/finalize`
- Wizard steps in dashboard:
  1. Server/domain/CORS settings.
  2. Database config.
  3. Redis/queue toggle and connection.
  4. Storage config.
  5. Create first admin account.
  6. Generate & display first admin API key.
- Reuse infrastructure form structure from existing Infrastructure page to reduce UI duplication.

#### 4) Security & Operational Controls

- Setup endpoints allowed only while setup incomplete.
- One-time bootstrap token or local-only access gate for first setup.
- Secrets never re-displayed after persistence.
- Audit logs for login, bootstrap completion, and first key generation.

### Branch / PR Plan for Bundle A

- **Branch:** `feature/dashboard-account-auth-init-wizard`
- **PR scope:**
  - Backend account model, auth endpoints, JWT guard integration.
  - Setup state + setup endpoints.
  - Dashboard login migration + setup wizard UI.
  - Compatibility layer to keep API key auth for API consumers.

### Suggested Incremental Commits

1. `feat(auth): add account entity and login session endpoints`
2. `feat(auth): unify rbac checks across jwt and api-key principals`
3. `feat(setup): add first-run setup state and bootstrap endpoints`
4. `feat(dashboard): replace api-key login with account login flow`
5. `feat(dashboard): add initialization wizard and first admin key step`

---

## Bundle B — SMS Fallback Plugin (Separate PR/Branch)

### Goals

- If WhatsApp send target is not a valid WhatsApp account, optionally send via SMS.
- Implement via plugin architecture and keep it optional/non-mandatory.

### Proposed Architecture

#### 1) Fallback Decision Point

- In message sending pipeline, detect WhatsApp account validity error signals.
- If fallback feature enabled and message policy allows, dispatch fallback event/hook.

#### 2) SMS Plugin Contract

- New plugin type (or capability) for outbound SMS adapter:
  - `sendSMS(to, content, metadata)`
  - provider health check
  - delivery result mapping
- Plugin config schema:
  - provider name
  - API key/token
  - from number / sender id
  - timeout/retry
  - per-tenant or global toggle

#### 3) Dashboard Integration

- Add SMS fallback section in plugin/config screens:
  - enable/disable fallback
  - choose provider plugin
  - configure credentials
  - test send action

#### 4) Observability

- Log fallback trigger reason and destination channel.
- Metrics counters:
  - fallback attempted/succeeded/failed
  - provider latency

### Branch / PR Plan for Bundle B

- **Branch:** `feature/sms-fallback-plugin`
- **PR scope:**
  - Fallback hook in send pipeline.
  - SMS adapter interface + first provider plugin.
  - Dashboard plugin configuration UX.
  - Audit/metrics additions.

### Suggested Incremental Commits

1. `feat(messaging): add fallback hook for invalid whatsapp recipients`
2. `feat(plugin): add sms adapter contract and plugin wiring`
3. `feat(plugin): implement first sms provider adapter`
4. `feat(dashboard): add sms fallback configuration and test action`

---

## Delivery Sequence Recommendation

1. Build and release **Bundle A** first, because initialization and account auth define the admin onboarding path.
2. After Bundle A stabilization, deliver **Bundle B** in a dedicated branch/PR for isolated review and rollback safety.

This split matches your request: **Task 1 + Task 2 together**, and **Task 3 as a separate branch/PR**.
