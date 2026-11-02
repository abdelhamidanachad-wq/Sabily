# Sabily implementation plan

This plan follows [the product audit](SABILY_PRODUCT_AUDIT.md). It is phased so member fundamentals, backend integrity and operations can be reviewed separately. Do not ship an interaction that has no real implementation; represent unavailable integrations as disabled with a specific explanation.

## Phase 1 — member core and route architecture

- Establish the route registry, role-aware shells, desktop sidebar/mobile tabs and legacy destination mapping.
- Finish Home, Quran, Prayer, Azkar and Qibla as focused experiences with keyboard/touch/accessibility states, loading/error/empty states and real persistence where applicable.
- Preserve auth, onboarding, community, profile and share-card flows through regression checks.
- Replace direction-only language selection with real localized strings for supported languages, or remove unsupported language claims.

## Phase 2 — data model and security

- Reconcile migration history with live Supabase before applying anything. Mark historical/obsolete migrations; repair FK dependencies and idempotency in repository migrations.
- Add only schemas backed by implemented member flows: worship logs, Tasbih sessions, Quran progress/plans, reminder preferences, quiz attempts, wellbeing check-ins and content interactions as approved by the audit.
- Define RLS per table, indexes and constraints; test member isolation and admin policies. No service key in client code.
- Configure leaked-password protection and verify role assignment, deletion/export, session and audit requirements.

## Phase 3 — complete admin operations (core controls implemented; content and AI remain pending)

- Consolidate admin shells into one guarded workspace.
- Implement user search, paging, profile/role/status controls, safe account actions, audit records and clear authorization errors.
- Implement module flags/configuration with dependency and readiness state; integrations health and non-secret settings; moderation queue with resolution history; content workflow.
- Enforce all operations in privileged Edge Functions/RLS, not only in React. Deploy `sabily-admin` only after policy and function review.

## Phase 4 — secondary modules and honest integrations

- Connect AI Companion through authenticated Edge Function and configured secret, with source-aware responses, rate limits, loading/error states and no exposed provider key.
- Complete reminders only when a delivery provider/permission flow exists; until then clearly label preferences as saved choices.
- Keep payment, wallet, charity and compute actions non-transactional until provider, reconciliation, refund/withdrawal, fraud, compliance and ledger reviews are complete.
- Populate Hadith/Tajweed/Knowledge only from verified licensed/attributed data; replace static cards with functional lesson/progress interactions.

## Phase 5 — release, production and operations

- Run typecheck, production build, migration validation, RLS tests and browser flows for public, member and admin roles; check responsive and keyboard behavior.
- Apply reviewed migrations to the linked Supabase project; deploy only functions required by implemented paths; inspect advisor results and logs.
- Merge/push to `main`, confirm GitHub checks, then deploy/promote to Vercel production and verify the delivered commit, app health, auth callbacks and Supabase connectivity.
- Record rollback points and production verification results. Never report a deployment complete until the Vercel deployment is READY and the target commit is confirmed.

## Release gates

1. No route is orphaned or unintentionally falls through to a generic screen.
2. Existing working interactions still work; every new action has persistence or an explicit disabled reason.
3. RLS prevents cross-user access; admin mutations have server-side authorization and audit records.
4. Build and automated checks pass; no unresolved migration dependency or destructive production SQL remains.
5. Vercel production serves the reviewed `main` commit and member-critical flows complete successfully.

