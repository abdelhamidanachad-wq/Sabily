create index if not exists sabily_events_created_by_idx on public.sabily_events (created_by);
create index if not exists sabily_events_updated_by_idx on public.sabily_events (updated_by);
create index if not exists sabily_event_rsvps_user_idx on public.sabily_event_rsvps (user_id);
