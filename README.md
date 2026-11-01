# Sabily — Global Muslim Community MVP

Sabily is a mobile-first, installable web app for faith, learning, community and service. This repository is the source of truth for the current MVP.

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

The connected Sabily backend is the Supabase project `le-shift` (`xxsyidandcqxwsbuhskp`) in `eu-west-1`. It contains the original Sabily platform schema, plus the community MVP tables:

- `sabily_communities`
- `sabily_community_members`
- `sabily_community_posts`
- `sabily_community_comments`

The new community migrations are recorded in `supabase/migrations/20261101012818_sabily_communities_mvp.sql` and `supabase/migrations/20261101012829_sabily_community_policy_and_profile_fields.sql`. These match migrations already applied to the connected backend.

The earlier `202611010001_sabily_ecosystem_core.sql` file is only an audit marker for pre-existing remote schema, not a complete bootstrap migration. Do not provision a blank Supabase project using this repository's migration folder alone. Export and review the full canonical schema and migration history before attempting a fresh-project restore.

Two JWT-protected Supabase Edge Functions are active:
- `sabily-admin` — role assignment, moderation, settings and content workflow actions.
- `sabily-ai` — AI draft generation with human review status.

AI generation stays disabled until a provider secret is configured in Supabase Edge Function secrets (`AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`). Never use a `VITE_` prefix for provider secrets.

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
