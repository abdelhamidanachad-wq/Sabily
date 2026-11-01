-- Sabily Noor Compute: opt-in useful-compute pilot foundation.
-- This does NOT mine cryptocurrency and does not reward worship activity.
create table if not exists public.sabily_compute_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  opted_in boolean not null default false,
  max_cpu_percent integer not null default 20 check (max_cpu_percent between 5 and 30),
  wifi_only boolean not null default true,
  charging_only boolean not null default true,
  allow_background boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.sabily_compute_preferences enable row level security;
drop policy if exists "Members read own compute preferences" on public.sabily_compute_preferences;
create policy "Members read own compute preferences" on public.sabily_compute_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Members manage own compute preferences" on public.sabily_compute_preferences;
create policy "Members manage own compute preferences" on public.sabily_compute_preferences
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update on public.sabily_compute_preferences to authenticated;

create table if not exists public.sabily_compute_jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  workload_type text not null check (workload_type in ('scientific_research','public_benefit_ai','open_data_processing')),
  status text not null default 'draft' check (status in ('draft','approved','paused','retired')),
  reward_per_1000_units integer not null default 0 check (reward_per_1000_units between 0 and 10000),
  methodology_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sabily_compute_jobs enable row level security;
drop policy if exists "Members view approved compute jobs" on public.sabily_compute_jobs;
create policy "Members view approved compute jobs" on public.sabily_compute_jobs
  for select to authenticated using (status = 'approved');
grant select on public.sabily_compute_jobs to authenticated;

create table if not exists public.sabily_compute_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.sabily_compute_jobs(id),
  status text not null default 'queued' check (status in ('queued','running','completed','rejected','cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  verified_units bigint not null default 0 check (verified_units >= 0),
  client_nonce uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id, client_nonce),
  check ((status = 'queued' and verified_units = 0 and started_at is null and ended_at is null)
      or status <> 'queued')
);
create index if not exists sabily_compute_sessions_user_idx on public.sabily_compute_sessions(user_id,created_at desc);
alter table public.sabily_compute_sessions enable row level security;
drop policy if exists "Members read own compute sessions" on public.sabily_compute_sessions;
create policy "Members read own compute sessions" on public.sabily_compute_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Members queue own compute sessions" on public.sabily_compute_sessions;
create policy "Members queue own compute sessions" on public.sabily_compute_sessions
  for insert to authenticated with check (
    (select auth.uid()) = user_id and status = 'queued' and verified_units = 0
    and started_at is null and ended_at is null
  );
grant select, insert on public.sabily_compute_sessions to authenticated;

create table if not exists public.sabily_compute_reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null unique references public.sabily_compute_sessions(id),
  verified_units bigint not null check (verified_units > 0),
  points integer not null check (points > 0),
  calculation_version text not null,
  verification_reference text not null unique,
  note text not null,
  created_at timestamptz not null default now()
);
create index if not exists sabily_compute_reward_user_idx on public.sabily_compute_reward_ledger(user_id,created_at desc);
alter table public.sabily_compute_reward_ledger enable row level security;
drop policy if exists "Members read own compute rewards" on public.sabily_compute_reward_ledger;
create policy "Members read own compute rewards" on public.sabily_compute_reward_ledger
  for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.sabily_compute_reward_ledger to authenticated;

-- No client-side role can publish workloads, mark sessions verified, or mint rewards.
-- Those writes are reserved for a separately deployed, audited server-side verifier using service_role.
