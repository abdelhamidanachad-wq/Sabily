-- Harden Noor Compute: background execution remains disabled until a reviewed future release.
alter table public.sabily_compute_preferences
  drop constraint if exists sabily_compute_background_disabled;
alter table public.sabily_compute_preferences
  add constraint sabily_compute_background_disabled check (allow_background = false);

drop policy if exists "Members queue own compute sessions" on public.sabily_compute_sessions;
create policy "Members queue own compute sessions" on public.sabily_compute_sessions
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and status = 'queued'
    and verified_units = 0
    and started_at is null
    and ended_at is null
    and exists (
      select 1 from public.sabily_compute_jobs j
      where j.id = job_id and j.status = 'approved'
    )
  );
