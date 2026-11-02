# Sabily Product & UX Audit — Premium Experience
Date: 2026-11-02
Branch: `design/premium-sabily-experience`
Baseline: `main` at `67cdb71ef9cdd7db41ca3ef006496d86b905c180`

## Product and technical baseline
- React 19, TypeScript 5.9, Vite 7; installable PWA with service-worker app shell.
- Supabase Auth, Postgres + RLS, Storage and active Edge Functions (`sabily-admin`, `sabily-ai`).
- Vercel project `sabily-app`; current production deployment observed READY before redesign.
- Existing app is a single-page React application. Client route state is mapped with `routeForPage`/`pageForRoute`; Vercel rewrite maps deep links to `/`.
- Existing component areas: `App.tsx` (public/member shell and core views), `GlassModule.tsx` (worship, Quran, Qibla and personal tools), `SuperAppModule.tsx` (content, knowledge and wellbeing), `EventsModule.tsx`, `ShareStudio.tsx`, `ExperienceLayer.tsx`, `AdminWorkspace.tsx`.

## Route inventory
Public:
- `/` — public landing, CTA to sign-in/sign-up.
- `/sign-in` — shared member/admin sign-in route (admin workspace has its own auth guard).
- `/sign-up` — member registration.
- `/onboarding` — first-use profile, location and language setup.

Member route mappings (primary app routes are under `/app`):
| Route | Screen | Assessment / interaction boundary |
|---|---|---|
| `/app/home` | Home | Personalized widgets, prayer summary, discovery and events; preserve widget configuration and personalized state. |
| `/app/prayer` | Prayer | Prayer schedule sourced from AlAdhan; method/location settings must remain visible. |
| `/app/worship` | Worship | Prayer tracker and worship summary; persisted through Supabase/local fallback. |
| `/app/worship/azkar` | Azkar | Dhikr counters and curated content; ensure accessible tap targets and clear progress/reset semantics. |
| `/app/worship/tasbih` | Tasbih | Counter and sessions; persisted session history. |
| `/app/worship/calendar` | Islamic calendar | Browser Islamic calendar; label as calculated date, not moon-sighting authority. |
| `/app/worship/reminders` | Reminders | Preferences exist; delivery module currently configured off pending provider. |
| `/app/worship/qibla` | Qibla | Local bearing calculation after permission; explicit permission, calibration and fallback states required. |
| `/app/quran` | Quran | Quran reader via AlQuran Cloud; preserve surah/ayah navigation, bookmarks/progress if present. |
| `/app/learn/tajweed` | Tajweed | Learning content; sourced materials and clear level/navigation. |
| `/app/learn/hadith` | Hadith Nawawi | Reference/learning module; preserve sourcing and edition caveats. |
| `/app/learn/knowledge` | Knowledge library | Knowledge and editorial content; source notes must remain visible. |
| `/app/learn/quizzes` | Quizzes & games | Interactive learning and attempt history. |
| `/app/communities` | Communities | Discover/create/join/post/comment flows; writes protected by RLS. |
| `/app/events` | Events & gatherings | Event listing and RSVP; event admin actions remain role protected. |
| `/app/live` | Live worship | Live/scheduled feed; live state depends on published stream data. |
| `/app/live/jummah` | Live Jumu'ah | Event-backed stream state. |
| `/app/live/taraweeh` | Live Taraweeh | Event-backed stream state. |
| `/app/content` | Content centre | Published shorts, videos, podcasts, lessons; provider/media availability state. |
| `/app/content/studio` | Content studio | Creator/admin content drafting and editorial flows. |
| `/app/tools/ai` | AI companion | AI provider currently disabled pending provider secret; must be shown as unavailable, not fake-working. |
| `/app/tools/compute` | Noor Compute | Consent and safeguards, currently not an active background workload/reward mechanism. |
| `/app/tools/wallet` | Noor rewards | Separate points/ledger experience; not a priority for this redesign. |
| `/app/tools/sadaqa` | Sadaqa | Campaign discovery; no payment should be implied unless provider is enabled. |
| `/app/tools/growth` | Growth planner | Personal planning experience. |
| `/app/tools/wellbeing` | Digital wellbeing | Private habit check-ins; not medical treatment. |
| `/app/tools/share` | Share Studio | Client-side preview/export/share; social posting isn't performed directly. |
| `/app/tools/explore` | Mini apps / Explore | Module discovery and navigation. |
| `/app/admin-studio` | Admin studio | Separate from global super-admin control center; admin/campaign/editorial config. |
| `/app/moderation` | Moderation | Moderator/admin role guard and report/post review. |
| `/app/personalize` | Personalize | Theme, goals and configurable home widgets. |
| `/app/profile` | Profile | Member profile/settings. |

Super-admin workspace routes (separate admin shell):
| Route | Screen |
|---|---|
| `/admin/overview` | Overview |
| `/admin/users` | People & roles |
| `/admin/modules` | Module configuration |
| `/admin/moderation` | Moderation |
| `/admin/integrations` | Integrations |
| `/admin/security` | Security controls |
| `/admin/events` | Events & live |
| `/admin/content` | Content studio |
| `/admin/integrations/ai` | AI studio |
| `/admin/audit` | Audit log |

Note: route list is derived from the existing route maps/navigation and adminPaths. Any dynamic/detail state is managed within the named feature screen. Verify exact URL generation for fallback routes against the code during implementation.

## Existing feature assessment
| Area | Current implementation evidence | Assessment |
|---|---|---|
| Auth / profile | Supabase email/password, role fetch and onboarding in App + admin auth guard | Working foundation; needs UX consistency. |
| Member role security | `sabily-admin` validates JWT and reads server-side role | Keep as sole privileged path. |
| Prayer times | AlAdhan integration; method labels include Morocco | Implemented; location/method clarity needed. |
| Quran | AlQuran Cloud reader in core module | Implemented; optimize reading focus and typography. |
| Qibla | Local calculation following location permission | Implemented; permission and compass states need explicit hierarchy. |
| Azkar / Tasbih | Counters and session state; worship logs | Implemented; improve tactile flow, progress and reset feedback. |
| Communities | Supabase CRUD and RLS | Implemented; improve discovery/feed hierarchy and forms. |
| Events/live | Supabase event records, RSVP and YouTube validation | Implemented with external provider boundary. |
| Content/knowledge | Supabase published content and source metadata | Implemented; content availability depends on published records. |
| Notifications | Inbox/preferences and browser push registration | Partial: delivery integration currently marked unconfigured. |
| AI tools | JWT-protected `sabily-ai` function and draft ledger | Partial: provider key absent and AI module disabled. |
| Admin users/roles | Admin Edge Function `list_users`, `set_role`, `set_user_status` | Real privileged actions and audit trail. |
| Module controls | `list_modules` and `update_module` in Edge Function | Real controls; server super-admin gate. |
| Integrations | Reads secrets configured on server | Status/configuration visibility only; does not edit provider secrets. |
| Security controls | Admin UI and server-side routes exist | Inspect individual action boundaries; do not imply Supabase Auth security options are controllable by this app. |
| Content/AI/admin studio | Editor and campaign configuration | Some settings are operational metadata rather than provider activation. |
| Noor wallet/compute | Financial/compute data model and safe gating | Preserve, but lower priority; no implicit financial claims or active compute. |

## Design diagnosis
1. Member navigation contains too many peer-level destinations; daily worship, learning, community and tools compete for attention.
2. Mobile navigation differs from desktop and offers only a narrow set of destinations without a clear route back into modules.
3. The shell hard-codes LTR even though the profile locale supports Arabic; this produces a real RTL mismatch.
4. Visual styles have grown across two large CSS layers; the same components are restyled in several areas, creating cascade drift.
5. Core standalone tools need distinct interaction focus: Quran = reading; prayer = time and schedule; Azkar = remembrance/counter; Qibla = direction/calibration.
6. Super-admin already contains a real backend surface; visual hierarchy should help administrators understand impact and state rather than replacing it with an analytics mockup.

## Proposed navigation architecture
Member desktop:
- Sidebar groups: Today (Home, Prayer, Azkar, Tasbih, Qibla, Calendar); Read (Quran, Tajweed, Hadith, Knowledge, Quizzes); Community (Communities, Events, Live, Content); More (Sadaqa, Growth, Wellbeing, Noor Compute, Share Studio, Mini Apps).
- Account footer: Notifications, Personalize, Profile.
- Admin access only appears for permitted roles and is clearly separate from member destinations.
Member mobile:
- Bottom bar: Home, Quran, Prayer, Azkar, More.
- More opens a bottom sheet/secondary catalogue grouped into Worship, Learn, Community, Tools and Account.
- Qibla is one tap from Prayer and from More; do not bury it in settings.
Admin desktop:
- Overview; People & roles; Modules; Moderation; Events; Content & AI; Integrations; Security; Audit.
Admin mobile:
- Compact top header + nav drawer/sheet; tables become stacked data rows with explicit actions; destructive controls require confirmation and clear role visibility.

## Design system direction
Product tone: calm, confident, contemplative, contemporary Islamic product. Warm paper and deep forest as primary surfaces; jade as main action accent; restrained brass/gold for emphasis; no loud neon gradients.
- Forest: #102F28
- Deep forest: #0A211C
- Jade: #2E6F5A
- Soft jade: #DCEBE2
- Paper: #F7F6F0
- Surface: #FFFFFF
- Ink: #182C26
- Muted: #718078
- Border: #E3E8E2
- Gold: #B99454 (decorative/meaningful accents only)
- Success #23734B; warning #9B6B20; error #B64242; info #326A91.
Typography:
- UI: Manrope / DM Sans for Latin.
- Arabic UI: Cairo or Noto Sans Arabic; Arabic reading text: Amiri / Noto Naskh Arabic.
- Quran reader uses comfortable line-height 2.1–2.4 and a dedicated width/reading mode, never condensed dashboard text.
Spacing: 4px base; 8px rhythm. 12/16/20/24/32/40/48.
Radius: 10 controls, 14 cards, 20 feature surfaces, 28 hero/reader surfaces.
Motion: 160–240ms purposeful transitions; no motion when prefers-reduced-motion is active.
Responsive: 360/390 mobile, 768 tablet, 1024 laptop, 1440 desktop; touch target >=44px.
Accessibility: visible keyboard focus, proper labels, semantic headings, 4.5:1 body contrast, never color-only status, reduced motion, Arabic lang/dir semantics.

## Implementation phases
1. Shared visual foundation + route-aware RTL and navigation cleanup, preserving route IDs and actions.
2. Member standalone experiences: Home, Quran, Prayer, Azkar, Qibla; no fake integrations.
3. Super-admin visual/workflow refinement with existing real Edge Function operations.
4. Responsive/accessibility polish, production build and CI verification.
5. Deploy a preview first; production only after test/preview verification.

## Supabase and Vercel checks
- Target Supabase: SABILY `vkjtievnxxiuoiptzxii`, healthy.
- Current roles observed: 2 member, 1 super_admin.
- Module flags: Azkar, Communities, Events, Live, Prayer, Qibla, Quran enabled; AI and Reminders disabled pending providers; Wallet disabled pending financial review.
- Security advisor: leaked-password protection is disabled; configure in Supabase Auth dashboard (not a visual redesign task).
- Performance advisor: missing FK covering index on sabily_app_settings.updated_by; multiple permissive SELECT policies on sabily_app_settings; unused index findings are informational. Do not make unrelated DB mutations during visual work.
- Vercel project `sabily-app` exists in personal Hobby team; latest observed production deployment was READY. Vercel project lookup by name returned not_found through one project-detail endpoint, so re-resolve via deployment metadata/Git auto-deploy before deployment step.
