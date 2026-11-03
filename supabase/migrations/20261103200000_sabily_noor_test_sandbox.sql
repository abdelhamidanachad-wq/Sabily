-- Non-redeemable Noor points for internal private-beta testing only.
create table if not exists public.sabily_noor_test_settings (
  singleton boolean primary key default true check (singleton = true),
  enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.sabily_noor_test_settings(singleton,enabled)
values (true,false) on conflict (singleton) do nothing;
alter table public.sabily_noor_test_settings enable row level security;
drop policy if exists "Authenticated members read Noor test mode" on public.sabily_noor_test_settings;
create policy "Authenticated members read Noor test mode" on public.sabily_noor_test_settings
for select to authenticated using (true);
grant select on public.sabily_noor_test_settings to authenticated;
revoke insert,update,delete on public.sabily_noor_test_settings from anon,authenticated;

create table if not exists public.sabily_noor_test_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null check (points between 1 and 10000),
  reason text not null check (char_length(reason) between 3 and 250),
  entry_type text not null default 'test_grant' check (entry_type in ('test_grant','test_reversal')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists sabily_noor_test_ledger_user_idx on public.sabily_noor_test_ledger(user_id,created_at desc);
alter table public.sabily_noor_test_ledger enable row level security;
drop policy if exists "Members read own Noor test points" on public.sabily_noor_test_ledger;
create policy "Members read own Noor test points" on public.sabily_noor_test_ledger
for select to authenticated using ((select auth.uid())=user_id or (select private.sabily_has_role(array['super_admin'])));
grant select on public.sabily_noor_test_ledger to authenticated;
revoke insert,update,delete on public.sabily_noor_test_ledger from anon,authenticated;
grant select,insert,update,delete on public.sabily_noor_test_ledger to service_role;
