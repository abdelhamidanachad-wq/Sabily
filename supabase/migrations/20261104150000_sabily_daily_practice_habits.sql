create table if not exists public.sabily_daily_habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  habit_key text not null check (habit_key in (
    'prayer_fajr','prayer_dhuhr','prayer_asr','prayer_maghrib','prayer_isha',
    'adhkar_sabah','quran','tasbih','adhkar_masaa',
    'phone_free_start','mindful_social','protect_attention'
  )),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, local_date, habit_key)
);

create index if not exists sabily_daily_habit_logs_user_date_idx
  on public.sabily_daily_habit_logs (user_id, local_date desc);

alter table public.sabily_daily_habit_logs enable row level security;

drop policy if exists "Members can read their own daily habit logs" on public.sabily_daily_habit_logs;
create policy "Members can read their own daily habit logs"
  on public.sabily_daily_habit_logs for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "Members can create their own daily habit logs" on public.sabily_daily_habit_logs;
create policy "Members can create their own daily habit logs"
  on public.sabily_daily_habit_logs for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "Members can update their own daily habit logs" on public.sabily_daily_habit_logs;
create policy "Members can update their own daily habit logs"
  on public.sabily_daily_habit_logs for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.sabily_daily_habit_logs to authenticated;
