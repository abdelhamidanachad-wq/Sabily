-- Private beta: encrypted provider credentials are stored in Supabase Vault.
-- Clients never receive decrypted credentials. Only service_role may invoke the setter.
create or replace function public.sabily_store_provider_secret(p_name text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_id uuid;
begin
  if p_name !~ '^sabily_provider_(openai|gemini|elevenlabs|higgsfield|leonardo)$'
     or p_secret is null or length(p_secret) < 8 or length(p_secret) > 4096 then
    raise exception 'Invalid provider secret';
  end if;
  select id into existing_id from vault.secrets where name = p_name limit 1;
  if existing_id is null then
    perform vault.create_secret(p_secret, p_name, 'Sabily provider credential');
  else
    perform vault.update_secret(existing_id, p_secret, p_name, 'Sabily provider credential');
  end if;
end;
$$;
revoke all on function public.sabily_store_provider_secret(text,text) from public, anon, authenticated;
grant execute on function public.sabily_store_provider_secret(text,text) to service_role;

-- Per-member prayer delivery preferences. Browser push subscriptions remain in their
-- existing dedicated table and are never exposed to other members.
create table if not exists public.sabily_prayer_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  fajr boolean not null default true,
  dhuhr boolean not null default true,
  asr boolean not null default true,
  maghrib boolean not null default true,
  isha boolean not null default true,
  adhan_voice text not null default 'none' check (adhan_voice in ('none','custom')),
  adhan_audio_url text,
  notification_mode text not null default 'notification' check (notification_mode in ('notification','adhan_foreground')),
  timezone text not null default 'Africa/Casablanca',
  updated_at timestamptz not null default now(),
  check (adhan_audio_url is null or adhan_audio_url like 'https://%')
);
alter table public.sabily_prayer_settings enable row level security;
drop policy if exists "Members manage own prayer settings" on public.sabily_prayer_settings;
create policy "Members manage own prayer settings" on public.sabily_prayer_settings
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.sabily_prayer_settings to authenticated;
