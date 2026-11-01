# Sabily — Global Muslim Community MVP

Sabily is a mobile-first, installable web app for faith, learning, community and service. This repository is the source of truth for the current MVP. The active implementation branch is `mvp/working-pwa` while the draft pull request is validated.

## Current stack

- React 19 + TypeScript + Vite
- Supabase Auth, PostgreSQL, Row Level Security, Storage and Edge Functions
- Vercel hosting
- PWA manifest and offline app-shell cache
- Capacitor packaging path for Android; iOS builds require macOS and Xcode

## MVP features

- Email/password registration and sign-in through Supabase Auth.
- User profile onboarding with display name, city, country and language.
- Global prayer-time lookup through AlAdhan (MWL calculation method by default).
- Qibla bearing calculated locally after the user grants geolocation permission.
- Hijri date using the browser's Islamic calendar implementation.
- Quran Arabic text and Surah index through AlQuran Cloud.
- Public communities: create, discover, join, publish posts and comment.
- Existing administrator workspace preserved for users with admin/super-admin roles.

Community content is stored in Supabase. Database policies restrict writes to authenticated owners and active members. The first release exposes public communities only; private invitations, moderator tools, member blocking, reporting UI, audio recitation, translations, Tajweed coaching, notifications, and payments remain future work.

## Local development (Windows PowerShell)

1. Install Node.js 22 LTS.
2. Clone the repository and open its folder:

   `git clone https://github.com/abdelhamidanachad-wq/Sabily.git`
3. Install dependencies:

   `npm install`
4. Copy the environment template:

   `Copy-Item .env.example .env.local`
5. Set the Supabase URL and publishable key in `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   ```
6. Start the development server:

   `npm run dev`
7. Verify the production build:

   `npm run build`

Never commit `.env.local`, Supabase service-role/secret keys, AI provider keys, payment secrets, or user passwords. The browser may use the Supabase publishable key; all authorization must remain protected by RLS.

## Supabase backend

The active MVP backend is the dedicated Supabase project `SABILY` (`vkjtievnxxiuoiptzxii`) in `eu-central-1`. The earlier `le-shift` project (`xxsyidandcqxwsbuhskp`) is a separate legacy workspace and is not the target for this app.

The reproducible MVP migrations are:
- `20261101014112_sabily_mvp_core_auth_communities.sql` — profiles, server-managed roles, community tables, RLS policies and Auth signup trigger.
- `20261101014223_sabily_mvp_policy_performance_tuning.sql` — consolidated membership insert policy and foreign-key indexes.
- `20261101014314_sabily_ai_jobs_for_draft_generation.sql` — private-per-user AI draft job ledger.

New signups receive the `member` role. The exact owner email `abdel@sabily.io` receives `super_admin` at signup; roles cannot be edited from the browser. Do not assign roles from user-editable Auth metadata.

The earlier `202611010001_sabily_ecosystem_core.sql` file is a historical audit marker for the legacy project, not a bootstrap migration. Do not run it on a fresh project.

The JWT-protected `sabily-ai` Edge Function is deployed to the new SABILY project and its source is versioned in `supabase/functions/sabily-ai/`. It records AI draft jobs and returns a clear configuration error until a provider secret is added server-side (for example `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`). Never use a `VITE_` prefix for provider secrets. The broader `sabily-admin` function and its moderation/settings workflows have not yet been migrated.

## Vercel

Project: `sabily-app`

- Framework: Vite
- Node.js: 22.x
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

Required environment variables are configured on the Vercel project:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Vercel preview/production deployments still need to be verified after the MVP branch is merged or deployed. If Vercel Authentication protects a preview URL, sign in to the Vercel team or use an approved share link.

## Install as a PWA

Deploy the app over HTTPS, then open the URL on Android Chrome and choose **Install app** / **Add to Home screen**. On iPhone, open the URL in Safari and choose **Share → Add to Home Screen**. PWA installation does not require app-store developer accounts.

## Android packaging (Windows)

After installing Node.js 22 and Android Studio:

```powershell
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap init Sabily com.sabily.app --web-dir dist
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Use Android Studio to create a signed Android App Bundle (AAB) for Google Play or an APK for direct testing. Keep signing keys and passwords out of GitHub.

For iOS, Capacitor requires macOS and Xcode. Use a Mac or a suitable cloud Mac build service to create and sign the iOS archive.

## Store readiness

The app is not yet store-approved. Google Play and Apple require developer accounts, store metadata, privacy disclosures, signed builds and review. New Google Play personal developer accounts may also need a closed testing period before production access. The PWA can be shared and installed while store submission proceeds.

## Security and religious-content boundaries

- Never assign admin permissions from user-editable profile metadata.
- Keep Supabase service-role and AI/payment secrets server-side.
- Review RLS policies before enabling new public tables.
- Prayer times are calculated estimates and may differ from local mosque timetables.
- Hijri date display is algorithmic and is not an official moon-sighting declaration.
- Quran content should retain source attribution; validate text and translations before adding additional editions.
- AI must not be presented as a qualified scholar or a source of authoritative fatwas.
