# Sabily — ecosystem starter

A mobile-first, installable web-app foundation for Sabily: faith, learning, personal development, community, service and ethical participation.

## Stack
- React 19 + TypeScript + Vite
- Supabase Auth, Postgres, Row Level Security and Edge Functions
- Vercel deployment target
- PWA manifest and basic offline shell caching

## Run locally (Windows PowerShell)
1. Install Node.js 22 LTS.
2. Clone this repository and open its folder:
   `git clone https://github.com/abdelhamidanachad-wq/Sabily.git`
3. Install dependencies:
   `npm install`
4. Copy the environment template:
   `Copy-Item .env.example .env.local`
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.
6. Start:
   `npm run dev`

Never commit `.env.local`, Supabase service-role keys, AI provider keys, payment secrets, or user passwords. The Supabase publishable key is intended for browser use; database access must remain protected by RLS.

## Supabase status and schema
The current development backend is the Supabase project `le-shift` (`xxsyidandcqxwsbuhskp`). Sabily's database tables and policies were added there without replacing the pre-existing application schema.

**Important migration note:** the initial schema was applied to the connected Supabase project before this repository was created. The file `supabase/migrations/202611010001_sabily_ecosystem_core.sql` is an audit marker, not the full DDL. Do not use this repository's migration folder to provision a fresh Supabase project yet. First export the canonical schema and migration history from the source project using the Supabase CLI, review it, and commit the reproducible migrations.

The remote Sabily schema includes user roles and profiles, settings, content, library, AI jobs/providers, media assets, forum posts/comments, reports, ads, payment plans/records, campaigns, contributions, points ledger, API integrations and audit log. RLS is enabled on the Sabily tables.

## Accounts and permissions
New self-registered accounts receive the `member` role. Create the initial super-admin through Supabase Dashboard → Authentication → Users, then assign its actual Auth UUID in SQL Editor. Do not hard-code credentials in the app.

```sql
insert into public.sabily_user_roles (user_id, role)
values ('YOUR_SUPER_ADMIN_AUTH_UUID', 'super_admin')
on conflict (user_id) do update set role = excluded.role;
```

Create the demo/member account separately through Supabase Auth; it should retain the default `member` role. Passwords supplied in chat were not inserted into this repository or database.

## Edge Functions
Two JWT-protected functions are deployed to the connected Supabase project and their source is included:
- `sabily-admin`: role assignment, moderation, settings and content workflow actions.
- `sabily-ai`: server-side AI draft generation with human review status.

AI generation remains disabled until a provider secret is configured in Supabase Edge Function secrets: `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`. Never use a `VITE_` prefix for provider secrets.

## Current implementation boundary
The repository contains the login/registration experience, role-aware workspace navigation, overview, AI/content draft screen, and starter workspaces for other platform areas. People, moderation and content workflows are represented in the backend functions and schema, but not every dashboard module has a complete CRUD interface yet.

Media generation, payments, checkout/webhooks, full ad delivery, full forum/member experience, and native Android/iOS packages are not complete. Payment tables are configuration scaffolding only. The points ledger is for non-transferable participation points, not cryptocurrency or withdrawable funds.

## Vercel
Vite build settings:
- Framework preset: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel project environment variables. Keep provider credentials in server-only secrets.

## PWA and app stores
The web app includes a manifest and a basic service worker. This is not yet an Android/iOS store binary. Capacitor packaging, Android signing, iOS/macOS build, store metadata, privacy disclosures and developer accounts are still required.