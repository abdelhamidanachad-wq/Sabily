-- Sabily worship tracker, Tasbih history and opt-in reminder preferences
create table if not exists public.sabily_worship_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null default current_date,
  prayer_name text not null check (prayer_name in ('Fajr','Dhuhr','Asr','Maghrib','Isha')),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, local_date, prayer_name)
);
create index if not exists sabily_worship_logs_user_date_idx on public.sabily_worship_logs(user_id, local_date desc);
alter table public.sabily_worship_logs enable row level security;
drop policy if exists "Users read own worship logs" on public.sabily_worship_logs;
create policy "Users read own worship logs" on public.sabily_worship_logs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users create own worship logs" on public.sabily_worship_logs;
create policy "Users create own worship logs" on public.sabily_worship_logs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users delete own worship logs" on public.sabily_worship_logs;
create policy "Users delete own worship logs" on public.sabily_worship_logs for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.sabily_tasbih_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase text not null check (char_length(phrase) between 1 and 80),
  count integer not null check (count >= 0 and count <= 1000000),
  target integer not null default 33 check (target between 1 and 1000000),
  local_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists sabily_tasbih_sessions_user_date_idx on public.sabily_tasbih_sessions(user_id, local_date desc);
alter table public.sabily_tasbih_sessions enable row level security;
drop policy if exists "Users read own tasbih sessions" on public.sabily_tasbih_sessions;
create policy "Users read own tasbih sessions" on public.sabily_tasbih_sessions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users create own tasbih sessions" on public.sabily_tasbih_sessions;
create policy "Users create own tasbih sessions" on public.sabily_tasbih_sessions for insert to authenticated with check (auth.uid() = user_id);

create table if not exists public.sabily_reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prayer_reminders boolean not null default false,
  adhkar_reminders boolean not null default false,
  jumuah_reminders boolean not null default false,
  learning_reminders boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'Africa/Casablanca',
  updated_at timestamptz not null default now()
);
alter table public.sabily_reminder_preferences enable row level security;
drop policy if exists "Users manage own reminder preferences" on public.sabily_reminder_preferences;
create policy "Users manage own reminder preferences" on public.sabily_reminder_preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
