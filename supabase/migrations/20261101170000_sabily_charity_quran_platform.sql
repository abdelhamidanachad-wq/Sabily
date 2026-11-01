-- Sabily charity, ad revenue and volunteer foundation
create table if not exists public.sabily_ad_revenue_events (
 id uuid primary key default gen_random_uuid(),
 provider_key text not null,
 provider_event_id text not null unique,
 placement_key text not null,
 gross_amount numeric(14,4) not null check(gross_amount>=0),
 currency text not null,
 status text not null default 'reported' check(status in ('reported','validated','payable','reversed','paid')),
 occurred_at timestamptz not null,
 created_at timestamptz not null default now()
);
alter table public.sabily_ad_revenue_events enable row level security;
revoke all on public.sabily_ad_revenue_events from anon,authenticated;
grant select,insert,update on public.sabily_ad_revenue_events to service_role;

create table if not exists public.sabily_charity_allocations (
 id uuid primary key default gen_random_uuid(),
 revenue_event_id uuid references public.sabily_ad_revenue_events(id),
 project_id uuid not null references public.sabily_campaigns(id),
 gross_amount numeric(14,4) not null check(gross_amount>=0),
 fees_amount numeric(14,4) not null default 0 check(fees_amount>=0),
 net_amount numeric(14,4) not null check(net_amount>=0),
 currency text not null,
 status text not null default 'reserved' check(status in ('reserved','transferred','settled','reversed')),
 transfer_reference text,
 created_at timestamptz not null default now(),
 settled_at timestamptz
);
alter table public.sabily_charity_allocations enable row level security;
create policy "Members view settled charity allocations" on public.sabily_charity_allocations for select to authenticated using(status='settled');
revoke insert,update,delete on public.sabily_charity_allocations from anon,authenticated;
grant select on public.sabily_charity_allocations to authenticated;
grant insert,update,select on public.sabily_charity_allocations to service_role;

create table if not exists public.sabily_volunteer_opportunities (
 id uuid primary key default gen_random_uuid(),
 project_id uuid references public.sabily_campaigns(id) on delete set null,
 title text not null,
 description text not null,
 activity_type text not null check(activity_type in ('iftar_service','mosque_cleaning','mosque_build','mushaf_distribution','medical_support','community_support','other')),
 city text not null,
 venue text,
 starts_at timestamptz not null,
 ends_at timestamptz,
 slots integer not null default 1 check(slots between 1 and 10000),
 status text not null default 'draft' check(status in ('draft','approved','full','cancelled','completed')),
 organiser_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.sabily_volunteer_opportunities enable row level security;
create policy "Members view approved volunteer opportunities" on public.sabily_volunteer_opportunities for select to authenticated using(status in ('approved','full') and starts_at>now());
create policy "Organisers create volunteer drafts" on public.sabily_volunteer_opportunities for insert to authenticated with check(organiser_id=(select auth.uid()) and status='draft');
create policy "Admins manage volunteer opportunities" on public.sabily_volunteer_opportunities for all to authenticated using((select private.sabily_has_role(array['admin','super_admin']))) with check((select private.sabily_has_role(array['admin','super_admin'])));
grant select,insert on public.sabily_volunteer_opportunities to authenticated;

create table if not exists public.sabily_volunteer_signups (
 id uuid primary key default gen_random_uuid(),
 opportunity_id uuid not null references public.sabily_volunteer_opportunities(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'applied' check(status in ('applied','approved','waitlisted','cancelled','attended','no_show')),
 created_at timestamptz not null default now(),
 unique(opportunity_id,user_id)
);
alter table public.sabily_volunteer_signups enable row level security;
create policy "Members manage own volunteer signups" on public.sabily_volunteer_signups for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id and status='applied');
grant select,insert,update,delete on public.sabily_volunteer_signups to authenticated;

create table if not exists public.sabily_quran_reading_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 last_surah integer not null default 1 check(last_surah between 1 and 114),
 last_ayah integer not null default 1 check(last_ayah>0),
 last_page integer not null default 1 check(last_page between 1 and 604),
 reading_mode text not null default 'mushaf' check(reading_mode in ('mushaf','ayah_scroll','continuous')),
 updated_at timestamptz not null default now()
);
alter table public.sabily_quran_reading_progress enable row level security;
create policy "Members manage own Quran progress" on public.sabily_quran_reading_progress for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant select,insert,update on public.sabily_quran_reading_progress to authenticated;

create table if not exists public.sabily_wird_plans (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'My Wird',
 hizb_start integer not null default 1 check(hizb_start between 1 and 60),
 hizb_end integer not null default 1 check(hizb_end between hizb_start and 60),
 cadence text not null default 'daily' check(cadence in ('daily','weekly','custom')),
 reminder_time time,
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.sabily_wird_plans enable row level security;
create policy "Members manage own wird plans" on public.sabily_wird_plans for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant select,insert,update,delete on public.sabily_wird_plans to authenticated;

create table if not exists public.sabily_tahajjud_logs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 local_date date not null default current_date,
 optional_note text,
 created_at timestamptz not null default now(),
 unique(user_id,local_date)
);
alter table public.sabily_tahajjud_logs enable row level security;
create policy "Members manage own tahajjud logs" on public.sabily_tahajjud_logs for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant select,insert,update,delete on public.sabily_tahajjud_logs to authenticated;
