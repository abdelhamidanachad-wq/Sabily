-- Server-scheduled browser push for prayer reminders.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.sabily_prayer_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer_name text not null check (prayer_name in ('Fajr','Dhuhr','Asr','Maghrib','Isha')),
  scheduled_at timestamptz not null,
  timezone text not null default 'UTC',
  delivered_at timestamptz,
  delivery_status text not null default 'pending' check (delivery_status in ('pending','sent','no_subscription','failed')),
  last_error text,
  created_at timestamptz not null default now(),
  unique(user_id,prayer_name,scheduled_at)
);
create index if not exists sabily_prayer_schedule_due_idx
on public.sabily_prayer_schedule(scheduled_at) where delivered_at is null;
alter table public.sabily_prayer_schedule enable row level security;
drop policy if exists "Members manage own pending prayer schedule" on public.sabily_prayer_schedule;
create policy "Members manage own pending prayer schedule" on public.sabily_prayer_schedule
for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id and delivered_at is null and delivery_status='pending');
grant select,insert,delete on public.sabily_prayer_schedule to authenticated;
revoke update on public.sabily_prayer_schedule from anon,authenticated;
grant select,insert,update,delete on public.sabily_prayer_schedule to service_role;

create or replace function public.sabily_get_prayer_cron_secret()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select d.decrypted_secret::text from vault.decrypted_secrets d
  where d.name='sabily_prayer_cron_secret' limit 1;
$$;
revoke all on function public.sabily_get_prayer_cron_secret() from public,anon,authenticated;
grant execute on function public.sabily_get_prayer_cron_secret() to service_role;

do $$
begin
  if not exists(select 1 from vault.secrets where name='sabily_prayer_cron_secret') then
    perform vault.create_secret(encode(gen_random_bytes(32),'hex'),'sabily_prayer_cron_secret','Sabily scheduled prayer push authorization');
  end if;
end $$;

select cron.unschedule(jobid) from cron.job where jobname='sabily-prayer-push-every-minute';
select cron.schedule(
  'sabily-prayer-push-every-minute',
  '* * * * *',
  $job$
    select net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/sabily-prayer-dispatch',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-sabily-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='sabily_prayer_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$
);
