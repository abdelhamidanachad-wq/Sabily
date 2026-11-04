# Sabily V2 — Master Implementation Plan

**Status:** Approved scope; staged implementation
**Base:** `main` at `00ae1677838979c5c90e1f7c696c0a18fcbacffe`
**Working branch:** `feat/sabily-v2-foundation`

## 1. Approved decisions
- 13 locales: English fallback, Arabic, French, Spanish (Spain), Italian, German, Russian, Simplified Chinese, Traditional Chinese, Japanese, Korean, Urdu and Swahili.
- iOS and Android together, using Capacitor around the existing React/Vite app.
- Discover combines curated editorial content and approved community creators.
- Preserve the existing Supabase project, Auth, PostgreSQL, RLS, Storage, Edge Functions, GitHub and Vercel integrations.
- Preserve existing modules and member data. No destructive resets or replacement auth system.

## 2. Target product architecture
### Member experience
Consolidate the existing route surface into: Home; Worship (prayer, Quran, Tajweed, Hadith, adhkar, tasbih, Qibla and calendar); Discover; Learn; Community (creators, communities, events and live gatherings); Growth (goals, wellbeing and family); Giving; Tools (AI Companion, Noor services and mini-apps); Profile.
Every current route must map to a destination or an explicitly retired route with a migration path. Do not expose dead links or placeholder workspaces as live features.

### Admin workspace
Separate privileged workspace: Overview; People and roles; Editorial Content Studio; AI Studio; Media library; Creator applications; Moderation and appeals; Campaigns and scheduling; Integrations, quotas and cost controls; Governance, audit and settings.
AI Studio remains admin-only. Member AI Companion remains a separate, constrained capability. Keep authorization enforced server-side.

## 3. Localization
| Locale | Language | Direction |
|---|---|---|
| en | English | LTR |
| ar | Arabic | RTL |
| fr | French | LTR |
| es-ES | Spanish (Spain) | LTR |
| it | Italian | LTR |
| de | German | LTR |
| ru | Russian | LTR |
| zh-CN | Chinese (Simplified) | LTR |
| zh-TW | Chinese (Traditional) | LTR |
| ja | Japanese | LTR |
| ko | Korean | LTR |
| ur | Urdu | RTL |
| sw | Swahili | LTR |

Requirements:
- Central locale registry and translation namespaces; extract navigation, onboarding, forms, admin labels, notifications, empty/error/loading states and settings.
- Preserve interpolation placeholders. Use ICU/i18next plural rules, including Arabic six-form and Russian categories.
- Use Intl APIs for dates and numbers. Persist the authenticated preference to the member profile and support a safe pre-auth preference.
- Set document lang/dir and use CSS logical properties (`margin-inline`, `padding-inline`, `inset-inline`, `text-align: start`). Mirror directional affordances in RTL, not logos, media controls or numeric content.
- German/French long-text, pseudo-locale, RTL and accessibility QA. Machine translations remain drafts until native-speaker review.

## 4. Discover: editorial + creator feed
Build on existing content items, recommendation RPCs, preferences, interaction events, age-safety checks and editorial RLS. Do not create duplicate content tables.
Member experience: full-screen vertical snap-to-item playback; explicit autoplay preference; pause off-screen/background; muted start; sound and caption controls; adjacent-only preloading; HLS/CDN delivery; For You, Following, Editorial, Learning and topic surfaces; like, save, share, report, hide, comments and follow; language-aware search.
Creator governance: application and admin approval; creator profile; publishing permissions; drafts/submissions; mandatory moderation, rights, language, age and source metadata. Clearly label editorial vs creator content.
Media pipeline: quarantine upload; MIME/size/duration/ownership validation; asynchronous transcoding, thumbnails, captions and HLS via dedicated worker/provider; publish only after moderation, rights and age checks. Do not transcode in-browser or in long-running Edge Functions.
Wellbeing: finite sessions, visible controls and optional reminders. Avoid manipulative engagement loops.

## 5. AI Studio production workflow
Build on the existing JWT-protected `sabily-ai` Edge Function, AI job ledger and server-side provider vault. Never expose provider keys to the browser.
Workspaces: AI Writer; Quran/education draft assistant; Hadith reference assistant; video scripts/storyboards/captions; image and campaign briefs; localization; research/source packs; content calendar.
Workflow: brief → draft → source validation → localization → licensed media → editorial review → religious review when relevant → approval → schedule → publish → analytics.
Add durable jobs with progress, provider/model metadata, token/cost estimates, retries, cancellation and per-locale failures. One failed language must not invalidate successful outputs. Human approval is mandatory before publication.
Religious integrity: never fabricate Quran verses, Hadith text, grading, scholarly consensus or references. Separate source text from AI commentary, flag unverified citations, distinguish education from rulings, and require qualified review for religious claims.

## 6. Mobile delivery
Use Capacitor around the existing React/Vite app; do not fork business logic into separate native apps.
- Add compatible Capacitor core, CLI, iOS and Android packages; establish app ID, icons, splash and platform configuration.
- Implement auth redirects/deep links, secure session handling and native back behavior.
- Add push registration only with consent and server-side token lifecycle support.
- Request camera/photo permissions only when the user invokes capture or upload.
- Test offline shell, network recovery, upload retry and session restoration.
- Automate web and Android builds plus iOS builds on macOS CI. Store release requires signed artifacts, privacy disclosures, account deletion, age/content ratings and review notes.

## 7. Security, privacy and migrations
- Supabase remains authoritative for identity, roles and authorization. Never trust browser-supplied roles or editable metadata.
- RLS is mandatory for every new table and storage bucket. Keep service-role and provider secrets server-side.
- Inspect live schema and migration ledger before any migration. Use additive, reversible migrations.
- No production migration is applied as part of this planning change.
- Add account export/deletion and consent/retention flows before store release. Avoid precise location collection unless needed and explicitly granted.

## 8. Phased delivery and exit criteria
### Phase 0 — Baseline and safety
Inventory routes, modules, migrations, Edge Functions, storage and roles; establish route/role/RLS regression and deployment smoke tests. Exit: baseline build passes, each visible module has owner/status/destination, no destructive change.
### Phase 1 — Shared product shell
Consolidate member/admin navigation, module registry and operational/beta/coming-soon/disabled states; responsive fixed navigation and mobile navigation; page-level loading/error/empty states. Exit: all existing routes resolve and role boundaries are verified.
### Phase 2 — Localization
Locale registry, translation framework, preference persistence, picker, RTL foundation, extracted strings and locale bundles. Exit: all UI surfaces use translation keys; all 13 locales load with English fallback.
### Phase 3 — Native mobile
Capacitor iOS/Android shells, app links, permissions, build automation and device QA. Exit: signed internal test builds for both platforms; no store approval claims before review.
### Phase 4 — Discover and creators
Vertical feed, playback lifecycle, creator profiles/follows/comments/moderation, media pipeline and localized recommendations. Exit: safe playback/publishing end-to-end; age, rights and RLS tests pass.
### Phase 5 — AI Studio
Admin-only workspaces, durable jobs, batch localization, asset workflow, human review and publishing calendar. Exit: no generated item can publish without approval; failures recover and audit correctly.
### Phase 6 — Release readiness
Accessibility, security, performance, privacy, legal, store metadata, native QA, staged beta, crash monitoring, support and rollback. Exit: separate sign-off for web, iOS and Android.

## 9. Engineering quality gates
- Every PR passes TypeScript and production build and includes focused tests.
- Preserve Supabase project, auth flow, existing tables and role model.
- Review RLS/storage policies for backend changes.
- Never commit secrets, signing material or user data.
- Include migration recovery notes, visual QA evidence and accessibility checks.
- Deploy to preview first; production promotion is a separate verified step.

## 10. Initial execution backlog
1. Verify production branch and Vercel Git linkage; establish preview-first PR workflow.
2. Complete route/module inventory and readiness labels.
3. Introduce locale registry and RTL-safe shell.
4. Add Capacitor scaffolding without changing web deployment.
5. Refactor Discover incrementally against existing content RPCs/tables.
6. Expand AI Studio incrementally against existing jobs and server-side provider configuration.
7. Add integration, accessibility, security and device test coverage.

**Scope note:** This document records the approved product and engineering scope. It does not claim the phases are implemented or that third-party media services, provider credentials, native signing or app-store approvals are configured.