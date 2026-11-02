-- Additive admin foundations for user governance, report handling and module flags.
-- This is independent of the incomplete legacy migration chain.
create or replace function private.sabily_has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sabily_user_roles r
    where r.user_id = (select auth.uid()) and r.role = any(required_roles)
  );
$$;
revoke all on function private.sabily_has_role(text[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.sabily_has_role(text[]) to authenticated;

create table if not exists public.sabily_app_settings (
  key text primary key check (char_length(key) between 1 and 120),
  value jsonb not null default '{}'::jsonb,
  description text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.sabily_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sabily_audit_log_created_idx on public.sabily_audit_log(created_at desc);
create index if not exists sabily_audit_log_actor_idx on public.sabily_audit_log(actor_id,created_at desc);

create table if not exists public.sabily_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('community_post','community_comment')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 2 and 80),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists sabily_reports_queue_idx on public.sabily_reports(status,created_at desc);
create index if not exists sabily_reports_reporter_idx on public.sabily_reports(reporter_id,created_at desc);
create index if not exists sabily_reports_assigned_idx on public.sabily_reports(assigned_to,status);

alter table public.sabily_community_posts
  add column if not exists moderation_status text not null default 'published'
  check (moderation_status in ('published','hidden','removed','pending'));
alter table public.sabily_community_comments
  add column if not exists moderation_status text not null default 'published'
  check (moderation_status in ('published','hidden','removed','pending'));

create or replace function private.sabily_protect_moderation_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.moderation_status is distinct from old.moderation_status
     and coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'Moderation status can only be changed by the trusted moderation service';
  end if;
  return new;
end;
$$;
revoke all on function private.sabily_protect_moderation_status() from public, anon, authenticated;
drop trigger if exists sabily_protect_post_moderation on public.sabily_community_posts;
create trigger sabily_protect_post_moderation before update on public.sabily_community_posts
for each row execute function private.sabily_protect_moderation_status();
drop trigger if exists sabily_protect_comment_moderation on public.sabily_community_comments;
create trigger sabily_protect_comment_moderation before update on public.sabily_community_comments
for each row execute function private.sabily_protect_moderation_status();

alter table public.sabily_community_posts enable row level security;
alter table public.sabily_community_comments enable row level security;
drop policy if exists sabily_posts_read on public.sabily_community_posts;
create policy sabily_posts_read on public.sabily_community_posts for select to authenticated
using (moderation_status = 'published' or author_id = (select auth.uid()) or (select private.sabily_has_role(array['moderator','admin','super_admin'])));
drop policy if exists sabily_comments_read on public.sabily_community_comments;
create policy sabily_comments_read on public.sabily_community_comments for select to authenticated
using (moderation_status = 'published' or author_id = (select auth.uid()) or (select private.sabily_has_role(array['moderator','admin','super_admin'])));

alter table public.sabily_app_settings enable row level security;
alter table public.sabily_audit_log enable row level security;
alter table public.sabily_reports enable row level security;
grant select, insert on public.sabily_reports to authenticated;
grant select on public.sabily_app_settings, public.sabily_audit_log to authenticated;
create policy sabily_reports_submit_self on public.sabily_reports for insert to authenticated
with check (reporter_id = (select auth.uid()) and status = 'open' and assigned_to is null and resolved_at is null);
create policy sabily_reports_read_moderators on public.sabily_reports for select to authenticated
using ((select private.sabily_has_role(array['moderator','admin','super_admin'])));
create policy sabily_settings_read_admin on public.sabily_app_settings for select to authenticated
using ((select private.sabily_has_role(array['admin','super_admin'])));
create policy sabily_audit_read_super_admin on public.sabily_audit_log for select to authenticated
using ((select private.sabily_has_role(array['super_admin'])));

insert into public.sabily_app_settings(key,value,description) values
 ('module.quran','{"enabled":true,"readiness":"ready"}'::jsonb,'Qur’an reader'),
 ('module.prayer','{"enabled":true,"readiness":"ready"}'::jsonb,'Prayer times'),
 ('module.azkar','{"enabled":true,"readiness":"ready"}'::jsonb,'Daily remembrance'),
 ('module.qibla','{"enabled":true,"readiness":"ready"}'::jsonb,'Qibla direction'),
 ('module.communities','{"enabled":true,"readiness":"ready"}'::jsonb,'Member communities'),
 ('module.ai','{"enabled":false,"readiness":"provider_key_required"}'::jsonb,'AI companion'),
 ('module.reminders','{"enabled":false,"readiness":"delivery_provider_required"}'::jsonb,'Scheduled notifications'),
 ('module.wallet','{"enabled":false,"readiness":"financial_review_required"}'::jsonb,'Noor rewards and wallet'),
 ('integration.ai_gateway','{"configured":false}'::jsonb,'AI provider readiness; never store the provider secret here'),
 ('integration.push_delivery','{"configured":false}'::jsonb,'Push delivery readiness; never store VAPID secrets here')
on conflict (key) do nothing;


