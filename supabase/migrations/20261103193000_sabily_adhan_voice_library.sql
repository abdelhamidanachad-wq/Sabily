-- Permit a selected library voice ID in each member's prayer settings.
alter table public.sabily_prayer_settings
  drop constraint if exists sabily_prayer_settings_adhan_voice_check;

-- Curated Adhan audio library for the private beta.
create table if not exists public.sabily_adhan_voices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  region text not null default 'Other' check (char_length(region) between 2 and 60),
  audio_url text not null check (audio_url like 'https://%'),
  attribution text not null check (char_length(attribution) between 2 and 500),
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.sabily_adhan_voices enable row level security;
drop policy if exists "Members read active Adhan voices" on public.sabily_adhan_voices;
create policy "Members read active Adhan voices" on public.sabily_adhan_voices
for select to authenticated using (active = true or (select private.sabily_has_role(array['super_admin'])));
drop policy if exists "Super admins manage Adhan voices" on public.sabily_adhan_voices;
create policy "Super admins manage Adhan voices" on public.sabily_adhan_voices
for all to authenticated using ((select private.sabily_has_role(array['super_admin'])))
with check ((select private.sabily_has_role(array['super_admin'])));
grant select,insert,update,delete on public.sabily_adhan_voices to authenticated;
