# Sabily product audit and target experience

Audit baseline: `main` at `01cfa5b971db191f6bbf6b3d9536a62729f1a666` (2026-11-01). This inventory follows the SPA page state and module dispatch in `src/App.tsx`, `src/GlassModule.tsx`, and `src/SuperAppModule.tsx`; these are not independently addressable URL routes today. Confirmed against source. Public landing/sign-in were visually inspected; authenticated member/admin behavior was assessed from implementation, not a signed-in production session.

## Complete route inventory

| Audience | Page / route state | Assessment |
|---|---|---|
| Public | Landing, Sign in, Create account | Landing and Supabase Auth flows exist; sign-in mobile composition needs improvement. |
| New member | Onboarding | Preference/profile setup exists; localization and persistence need verification. |
| Member | Home | Personalized dashboard exists, but some cards/actions point to incomplete or local-only features. |
| Member | Worship | Prayer tracker and links to prayer schedule, Tasbih, calendar; tracker schema is absent in the live project. |
| Member | Prayer | Location-based prayer schedule exists; calculation method, timezone, refresh and offline/error states need product-grade controls. |
| Member | Quran | Arabic Qur'an text is present; progress/plans and robust reader controls need completion. |
| Member | Qibla | Device orientation/bearing path exists, relying on location/compass permission; calibration and fallback guidance need refinement. |
| Member | Communities | Community create/join, posts and comments use Supabase; moderation and admin integration do not match current schema. |
| Member | Personalize, Profile | Preferences/profile exist; settings need consistent persistence and language behavior. |
| Member | Tajweed, Hadith | Curated-looking learning surfaces; audio/content integrations are explicitly pending. |
| Member | Tasbih | UI exists; durable session schema/backend is missing in production. |
| Member | Noor Compute | Foundation UI and migration set exist; production readiness and ledger controls require review. |
| Member | AI Companion | Prompt suggestions/input render, but submit is a configuration toast rather than an AI request. |
| Member | Noor Wallet, Sadaqa | Financial concepts/schema drafts exist; payment/withdrawal UX must not imply live transactions without providers and controls. |
| Member | Growth, Calendar, Reminders | Growth is local state; calendar is indicative; reminder preferences have schema draft but delivery is not configured. |
| Member | Content Centre, Share Studio, Knowledge, Quizzes | Share cards work; content/knowledge are largely static; quiz progress expects schema. |
| Member | Digital Wellbeing, Members, Mini Apps / Explore | Some habit/check-in concepts; routes need verified persistence and clear safety boundaries. |
| Staff/admin | Moderation | Dispatch currently falls through to mini-app grid rather than a moderation queue. |
| Staff/admin | Content Studio | UI exists, but content backend tables are absent from deployed schema. |
| Staff/admin | Admin Studio, Admin workspace, Admin | Two partially overlapping shells. User administration, module configuration, integrations and security need a coherent, permission-checked implementation. |

## Existing feature assessment

**Working foundations:** React 19 + TypeScript + Vite SPA; Supabase authentication and RLS-backed profile/community paths; Quran Arabic text; prayer calculation/location lookup; Qibla bearing; profile/home preferences; share-card rendering. These require regression protection while code is reorganized.

**Incomplete or misleading:** worship/tasbih/progress/quiz/campaign/content/wellbeing rely on missing or unapplied tables; AI submit only shows a toast; Tajweed and Hadith are placeholders; reminder toggles do not send notifications; checkout is not live; growth state is local; Arabic selection changes direction without translating the UI; admin shells overlap; moderation route does not reach a queue. Several repository migrations reference tables that no migration creates, so production migrations cannot safely be bulk-applied.

**Live service baseline:** Supabase project `vkjtievnxxiuoiptzxii` is healthy, with seven public tables, RLS enabled, three applied migrations and `sabily-ai` deployed with JWT verification. `sabily-admin` and `sabily-notify` are repository-only. Leaked-password protection is warned by the security advisor. Vercel `sabily-app` currently serves a successful deployment of the baseline commit. No authenticated production account was used in this audit.

## Proposed navigation architecture

Use one route registry with stable paths, role-aware guards, titles/breadcrumbs, and one source of truth for navigation. Preserve existing page state destinations through redirects while migrating.

- Public: `/`, `/sign-in`, `/sign-up`, `/onboarding`.
- Member primary tabs: `/app/home`, `/app/quran`, `/app/prayer`, `/app/community`, `/app/profile`.
- Worship tools grouped under `/app/worship`: `/app/worship/tracker`, `/app/worship/azkar`, `/app/worship/tasbih`, `/app/worship/qibla`, `/app/worship/calendar`, `/app/worship/reminders`.
- Learning: `/app/learn/tajweed`, `/app/learn/hadith`, `/app/learn/knowledge`, `/app/learn/quizzes`; Tools: `/app/tools/ai`, `/app/tools/compute`, `/app/tools/wallet`, `/app/tools/sadaqa`, `/app/tools/growth`, `/app/tools/wellbeing`, `/app/tools/share`, `/app/tools/explore`.
- Admin only: `/admin/overview`, `/admin/users`, `/admin/modules`, `/admin/content`, `/admin/moderation`, `/admin/integrations`, `/admin/security`, `/admin/audit`. Enforce role checks in server/RLS/Edge Functions, not just hidden navigation.

Desktop member navigation: compact persistent sidebar with Home, Quran, Worship, Community, Learn and Tools; a contextual subnav for the active section. Mobile: five-item bottom navigation (Home, Quran, Prayer, Community, Profile) and a labelled “More” sheet for secondary tools. Quran, Prayer, Azkar and Qibla each have their own focused workspace, hierarchy and persistent controls. Admin has a separate shell and navigation, never mixed with member tabs.

## Final design system

**Direction:** calm, contemporary Islamic utility; editorial Arabic typography; high legibility and restrained ornament. Avoid glass-heavy surfaces for dense/operational screens. Use a consistent 8px spacing grid and clear focus states.

| Token | Value / use |
|---|---|
| Ink | `#172820` primary text |
| Forest | `#174A3A` primary action/navigation |
| Deep forest | `#10372D` pressed/strong contrast |
| Jade | `#2F7259` selected and success accents |
| Warm paper | `#F7F6F0` app canvas |
| Surface | `#FFFFFF` cards and panels |
| Sand | `#EEE9DC` quiet borders/backgrounds |
| Muted | `#68766F` secondary text |
| Gold | `#B88A3B` limited sacred/editorial accent |
| Danger | `#A63D40` destructive/error states |

Typography: Inter/system sans for UI; Noto Naskh Arabic (with platform fallback) for Qur'an/Arabic; fluid title scale 28–40px, section 20–28px, body 15–17px, supporting 13–14px. Body line-height >=1.5; Arabic reader line-height >=2.0. Use 8px spacing increments, 12px small radius, 18px card radius, 24px large panel radius; subtle 1px borders and low-elevation shadows. Interactive targets >=44px; visible keyboard focus; WCAG AA contrast; semantic status labels and reduced-motion support. Build light/dark semantic tokens, with the warm-paper palette as the member default; users can still select Emerald, Midnight or Daylight in Personalize.

**Product-specific patterns:** Home uses a daily-prayer hero, next action, reading continuation and small personal progress; Quran uses a quiet reading canvas, surah/juz navigation, font/translation/audio controls and persistent position; Prayer foregrounds next prayer/countdown, date, location/method controls and accessible timetable; Azkar uses source-labelled collections, Arabic/text/transliteration controls and tactile count/reset/progress; Qibla gives a calibrated compass, bearing/distance, permission/calibration instructions and manual directional fallback. Every control must have a real state transition and persistence behavior or be clearly disabled with a reason.

**Admin patterns:** dedicated dense but readable data workspace; user search/filter/detail with role/status controls and safe confirmation; module registry with enabled state and dependencies; integration health/configuration without exposing secrets; security policy controls, sessions/roles and immutable audit trail. High-risk actions must be server-authorized, logged and reversible where possible.

## Implementation snapshot — 2026-11-02

- Added member/admin route paths, browser back/forward support, grouped desktop navigation, and five primary mobile tabs with a working More sheet.
- Added standalone Azkar counting with a source citation and date-scoped local persistence; Qibla device-heading support with bearing fallback; and prayer method preferences, city timezone, next-prayer countdown, and local-day refresh.
- Added live super-admin workflows for paged/searchable users, role changes, account suspension, module flags, integration readiness, moderation reports, and audit history. Sensitive mutations use the JWT-verified `sabily-admin` Edge Function; module flags now affect member navigation/access.
- Added two additive migrations for admin/moderation foundations and member-readable module flags. Both are applied to production with RLS enabled; `sabily-admin` is active at version 2 with JWT verification enabled.
- Updated Vite to 7.3.7 after the dependency audit flagged a high-severity development-server issue. Current `npm audit` reports zero vulnerabilities. The member workspace now defaults to the warm-paper theme, with consistent accessible focus and reduced-motion styling.

**Release limitations:** the legacy migration backlog remains inconsistent and must not be bulk-applied. The Supabase Auth advisor still reports leaked-password protection needs attention. Integration cards report secret presence, not provider health; the content and AI studios remain read-only placeholders. The security workspace links to Supabase for provider-level password settings rather than changing them in-app. No authenticated production member or super-admin session was available to exercise these flows end to end; a successful build and deployed function/schema state are not a substitute for that check.

