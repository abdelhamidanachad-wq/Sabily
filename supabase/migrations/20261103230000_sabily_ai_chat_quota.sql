-- Enable authenticated member AI chat with a bounded daily request quota.
alter table public.sabily_ai_jobs drop constraint if exists sabily_ai_jobs_provider_check;
alter table public.sabily_ai_jobs add constraint sabily_ai_jobs_provider_check
  check (provider in ('openai','gemini','vercel_ai_gateway'));

create table if not exists public.sabily_ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count between 0 and 1000),
  updated_at timestamptz not null default now(),
  primary key(user_id,usage_date)
);
alter table public.sabily_ai_daily_usage enable row level security;
revoke all on public.sabily_ai_daily_usage from anon,authenticated;
grant select,insert,update,delete on public.sabily_ai_daily_usage to service_role;

create or replace function public.sabily_consume_ai_quota(p_user_id uuid,p_daily_limit integer default 20)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare next_count integer;
begin
  if p_daily_limit<1 or p_daily_limit>100 then raise exception 'Invalid AI quota'; end if;
  insert into public.sabily_ai_daily_usage(user_id,usage_date,request_count)
  values(p_user_id,current_date,1)
  on conflict(user_id,usage_date) do update
    set request_count=public.sabily_ai_daily_usage.request_count+1,updated_at=now()
    where public.sabily_ai_daily_usage.request_count<p_daily_limit
  returning request_count into next_count;
  return next_count is not null;
end;
$$;
revoke all on function public.sabily_consume_ai_quota(uuid,integer) from public,anon,authenticated;
grant execute on function public.sabily_consume_ai_quota(uuid,integer) to service_role;
