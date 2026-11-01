-- Private draft-generation job ledger used by the JWT-protected sabily-ai Edge Function.
create table public.sabily_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null default 'article' check (job_type in ('article','lesson','summary','translation','research','chat')),
  provider text not null check (provider in ('openai','vercel_ai_gateway')),
  model text not null,
  prompt text not null check (char_length(prompt) between 10 and 12000),
  status text not null default 'queued' check (status in ('queued','processing','review','failed','cancelled')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  output jsonb not null default '{}'::jsonb,
  usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index sabily_ai_jobs_user_created_idx on public.sabily_ai_jobs(user_id,created_at desc);
create index sabily_ai_jobs_status_created_idx on public.sabily_ai_jobs(status,created_at desc);
alter table public.sabily_ai_jobs enable row level security;
grant select on public.sabily_ai_jobs to authenticated;
create policy sabily_ai_jobs_read_self on public.sabily_ai_jobs
for select to authenticated using (user_id = (select auth.uid()));