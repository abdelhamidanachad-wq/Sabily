-- Sabily super-app: quizzes, private wellbeing check-ins, content progress and affiliate partners
create table if not exists public.sabily_quiz_attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 quiz_key text not null,
 score integer not null check(score between 0 and 100),
 answers jsonb not null default '[]'::jsonb,
 completed_at timestamptz not null default now()
);
create index if not exists sabily_quiz_attempts_user_idx on public.sabily_quiz_attempts(user_id,completed_at desc);
alter table public.sabily_quiz_attempts enable row level security;
drop policy if exists "Members read own quiz attempts" on public.sabily_quiz_attempts;
create policy "Members read own quiz attempts" on public.sabily_quiz_attempts for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Members create own quiz attempts" on public.sabily_quiz_attempts;
create policy "Members create own quiz attempts" on public.sabily_quiz_attempts for insert to authenticated with check ((select auth.uid())=user_id);
grant select,insert on public.sabily_quiz_attempts to authenticated;

create table if not exists public.sabily_habit_checkins (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 habit_key text not null check(habit_key in ('smoking','screen_time','late_night','explicit_content','sleep','mindfulness')),
 local_date date not null default current_date,
 completed boolean not null default true,
 reflection text,
 created_at timestamptz not null default now(),
 unique(user_id,habit_key,local_date)
);
create index if not exists sabily_habit_checkins_user_idx on public.sabily_habit_checkins(user_id,local_date desc);
alter table public.sabily_habit_checkins enable row level security;
drop policy if exists "Members manage own habit checkins" on public.sabily_habit_checkins;
create policy "Members manage own habit checkins" on public.sabily_habit_checkins for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.sabily_habit_checkins to authenticated;

create table if not exists public.sabily_content_interactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 content_id uuid not null references public.sabily_content(id) on delete cascade,
 interaction_type text not null check(interaction_type in ('view','complete','bookmark','like')),
 progress_seconds integer not null default 0 check(progress_seconds>=0),
 created_at timestamptz not null default now(),
 unique(user_id,content_id,interaction_type)
);
alter table public.sabily_content_interactions enable row level security;
drop policy if exists "Members manage own content interactions" on public.sabily_content_interactions;
create policy "Members manage own content interactions" on public.sabily_content_interactions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.sabily_content_interactions to authenticated;

create table if not exists public.sabily_affiliate_partners (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 channel text not null check(channel in ('influencer','publisher','community','agency')),
 tracking_code text not null unique,
 commission_rate numeric(5,2) not null default 0 check(commission_rate between 0 and 100),
 destination_url text,
 enabled boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.sabily_affiliate_partners enable row level security;
drop policy if exists "Admins manage affiliate partners" on public.sabily_affiliate_partners;
create policy "Admins manage affiliate partners" on public.sabily_affiliate_partners for all to authenticated using ((select private.sabily_has_role(array['admin','super_admin']))) with check ((select private.sabily_has_role(array['admin','super_admin'])));
grant select,insert,update,delete on public.sabily_affiliate_partners to authenticated;
