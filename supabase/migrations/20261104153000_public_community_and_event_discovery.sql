-- Allow unauthenticated visitors to discover only explicitly public communities
-- and published events. Existing authenticated policies remain unchanged.
grant select on table public.sabily_communities to anon;
grant select on table public.sabily_events to anon;

drop policy if exists sabily_communities_read_public_anon on public.sabily_communities;
create policy sabily_communities_read_public_anon
  on public.sabily_communities
  for select
  to anon
  using (visibility = 'public');

drop policy if exists sabily_events_read_published_anon on public.sabily_events;
create policy sabily_events_read_published_anon
  on public.sabily_events
  for select
  to anon
  using (event_status = 'published');
