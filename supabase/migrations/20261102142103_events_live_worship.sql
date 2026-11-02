create table if not exists public.sabily_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 3 and 2000),
  event_type text not null check (event_type in ('community','learning','service','jummah','taraweeh')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text check (venue is null or char_length(venue) <= 160),
  city text check (city is null or char_length(city) <= 100),
  stream_url text,
  event_status text not null default 'draft' check (event_status in ('draft','published','cancelled')),
  stream_status text not null default 'scheduled' check (stream_status in ('scheduled','live','ended')),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sabily_events_valid_end check (ends_at is null or ends_at > starts_at)
);

create index if not exists sabily_events_published_schedule_idx
  on public.sabily_events (starts_at) where event_status = 'published';

create table if not exists public.sabily_event_rsvps (
  event_id uuid not null references public.sabily_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.sabily_events enable row level security;
alter table public.sabily_event_rsvps enable row level security;

create policy sabily_events_read_published on public.sabily_events
  for select to authenticated using (event_status = 'published');

create policy sabily_event_rsvps_read_own on public.sabily_event_rsvps
  for select to authenticated using (user_id = (select auth.uid()));
create policy sabily_event_rsvps_insert_own_published on public.sabily_event_rsvps
  for insert to authenticated with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.sabily_events e where e.id = event_id and e.event_status = 'published'
    )
  );
create policy sabily_event_rsvps_update_own on public.sabily_event_rsvps
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy sabily_event_rsvps_delete_own on public.sabily_event_rsvps
  for delete to authenticated using (user_id = (select auth.uid()));

grant select on public.sabily_events to authenticated;
grant select, insert, update, delete on public.sabily_event_rsvps to authenticated;
revoke all on public.sabily_events from anon;
revoke all on public.sabily_event_rsvps from anon;

insert into public.sabily_app_settings (key,value,description)
values
  ('module.events','{"enabled":true,"readiness":"ready"}'::jsonb,'Community events calendar and member RSVPs'),
  ('module.live','{"enabled":true,"readiness":"ready"}'::jsonb,'Scheduled Jumu''ah and Taraweeh broadcasts')
on conflict (key) do nothing;
