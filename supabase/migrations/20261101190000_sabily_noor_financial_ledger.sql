-- Noor financial ledger: donations are charity-restricted and never cash-out eligible.
create table if not exists public.sabily_noor_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete restrict,
  bucket text not null check (bucket in ('earned','donated','charity')),
  source_type text not null check (source_type in ('ad_revenue','compute_reward','cash_donation','charity_allocation','withdrawal_reserve','withdrawal_release','withdrawal_paid','reversal','admin_adjustment')),
  source_id text not null,
  noor_amount numeric(20,8) not null check (noor_amount > 0),
  backing_currency text,
  backing_amount numeric(20,8),
  status text not null default 'settled' check (status in ('pending','settled','reversed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source_type, source_id, bucket)
);
create index if not exists sabily_noor_ledger_user_bucket_idx on public.sabily_noor_ledger(user_id,bucket,created_at desc);
alter table public.sabily_noor_ledger enable row level security;
create policy "Members read own Noor ledger" on public.sabily_noor_ledger for select to authenticated
 using (user_id=(select auth.uid()) or (select private.sabily_has_role(array['admin','super_admin'])));
revoke insert,update,delete on public.sabily_noor_ledger from anon,authenticated;
grant select on public.sabily_noor_ledger to authenticated;
grant select,insert on public.sabily_noor_ledger to service_role;

create table if not exists public.sabily_noor_donations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null,
 provider text not null,
 provider_payment_id text not null unique,
 amount numeric(20,4) not null check(amount>0),
 currency text not null,
 noor_amount numeric(20,8) not null check(noor_amount>0),
 status text not null default 'pending' check(status in ('pending','settled','failed','refunded','disputed')),
 charity_restricted boolean not null default true check(charity_restricted=true),
 settled_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.sabily_noor_donations enable row level security;
create policy "Donors read own donation receipts" on public.sabily_noor_donations for select to authenticated
 using(user_id=(select auth.uid()) or (select private.sabily_has_role(array['admin','super_admin'])));
revoke insert,update,delete on public.sabily_noor_donations from anon,authenticated;
grant select on public.sabily_noor_donations to authenticated;
grant select,insert,update on public.sabily_noor_donations to service_role;

create table if not exists public.sabily_noor_withdrawal_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 requested_noor numeric(20,8) not null check(requested_noor>0),
 payout_currency text not null default 'MAD',
 estimated_payout numeric(20,4),
 status text not null default 'pending' check(status in ('pending','under_review','approved','rejected','processing','paid','cancelled')),
 review_note text,
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 payout_reference text,
 paid_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists sabily_noor_withdrawals_user_idx on public.sabily_noor_withdrawal_requests(user_id,created_at desc);
alter table public.sabily_noor_withdrawal_requests enable row level security;
create policy "Members read own withdrawal requests" on public.sabily_noor_withdrawal_requests for select to authenticated
 using(user_id=(select auth.uid()) or (select private.sabily_has_role(array['moderator','admin','super_admin'])));
create policy "Members submit own withdrawal requests" on public.sabily_noor_withdrawal_requests for insert to authenticated
 with check(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null and payout_reference is null and paid_at is null);
create policy "Authorised reviewers update withdrawal requests" on public.sabily_noor_withdrawal_requests for update to authenticated
 using((select private.sabily_has_role(array['admin','super_admin'])))
 with check((select private.sabily_has_role(array['admin','super_admin'])));
revoke delete on public.sabily_noor_withdrawal_requests from anon,authenticated;
grant select,insert,update on public.sabily_noor_withdrawal_requests to authenticated;
grant all on public.sabily_noor_withdrawal_requests to service_role;

create table if not exists public.sabily_noor_exchange_quotes (
 id uuid primary key default gen_random_uuid(),
 from_asset text not null,
 to_asset text not null,
 rate numeric(24,12) not null check(rate>0),
 source text not null,
 effective_at timestamptz not null,
 expires_at timestamptz,
 status text not null default 'draft' check(status in ('draft','active','expired','disabled')),
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 check(from_asset <> to_asset)
);
alter table public.sabily_noor_exchange_quotes enable row level security;
create policy "Members view active exchange quote" on public.sabily_noor_exchange_quotes for select to authenticated
 using(status='active' and effective_at<=now() and (expires_at is null or expires_at>now()));
create policy "Admins manage exchange quotes" on public.sabily_noor_exchange_quotes for all to authenticated
 using((select private.sabily_has_role(array['admin','super_admin'])))
 with check((select private.sabily_has_role(array['admin','super_admin'])));
grant select on public.sabily_noor_exchange_quotes to authenticated;
grant insert,update,delete on public.sabily_noor_exchange_quotes to authenticated;

create or replace view public.sabily_noor_balance_summary
with (security_invoker=true) as
select user_id,
       bucket,
       sum(case when status='settled' then noor_amount else 0 end)::numeric(20,8) as credited_noor
from public.sabily_noor_ledger
where user_id is not null
group by user_id,bucket;
grant select on public.sabily_noor_balance_summary to authenticated;

-- No direct client-side ledger writes. A future payout service must reserve only
-- settled earned balance, perform idempotent checks, and settle after provider confirmation.
comment on table public.sabily_noor_ledger is 'Append-only financial provenance ledger. Donated and charity buckets are never user-cashout eligible.';
comment on column public.sabily_noor_donations.charity_restricted is 'Always true: donated value cannot be converted into a personal withdrawal.';
