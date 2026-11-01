-- Sabily MVP core schema for the dedicated SABILY Supabase project.
-- Includes account profiles, server-managed platform roles, and community MVP tables.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.sabily_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  bio text,
  country_code text not null default 'MA',
  locale text not null default 'en' check (locale in ('en','ar','fr')),
  interests text[] not null default '{}',
  onboarding_complete boolean not null default false,
  city text not null default 'Casablanca',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sabily_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','creator','moderator','admin','super_admin')),
  created_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null
);

create table public.sabily_communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 500),
  category text not null default 'general',
  country_code text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sabily_community_members (
  community_id uuid not null references public.sabily_communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member')),
  status text not null default 'active' check (status in ('active','pending','banned')),
  joined_at timestamptz not null default now(),
  primary key (community_id,user_id)
);

create table public.sabily_community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.sabily_communities(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Sabily member',
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sabily_community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.sabily_community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Sabily member',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index sabily_communities_country_category_idx on public.sabily_communities(country_code,category);
create index sabily_community_members_user_idx on public.sabily_community_members(user_id,status);
create index sabily_community_posts_feed_idx on public.sabily_community_posts(community_id,created_at desc);
create index sabily_community_comments_post_idx on public.sabily_community_comments(post_id,created_at);

alter table public.sabily_profiles enable row level security;
alter table public.sabily_user_roles enable row level security;
alter table public.sabily_communities enable row level security;
alter table public.sabily_community_members enable row level security;
alter table public.sabily_community_posts enable row level security;
alter table public.sabily_community_comments enable row level security;

grant select,insert,update on public.sabily_profiles to authenticated;
grant select on public.sabily_user_roles to authenticated;
grant select,insert,update,delete on public.sabily_communities to authenticated;
grant select,insert,delete on public.sabily_community_members to authenticated;
grant select,insert,update,delete on public.sabily_community_posts to authenticated;
grant select,insert,delete on public.sabily_community_comments to authenticated;

create policy sabily_profiles_read_self on public.sabily_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy sabily_profiles_insert_self on public.sabily_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy sabily_profiles_update_self on public.sabily_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy sabily_roles_read_self on public.sabily_user_roles for select to authenticated using (user_id = (select auth.uid()));

create policy sabily_communities_read_public_or_owner on public.sabily_communities for select to authenticated using (visibility = 'public' or created_by = (select auth.uid()));
create policy sabily_communities_create_self on public.sabily_communities for insert to authenticated with check (created_by = (select auth.uid()));
create policy sabily_communities_update_owner on public.sabily_communities for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy sabily_communities_delete_owner on public.sabily_communities for delete to authenticated using (created_by = (select auth.uid()));

create policy sabily_members_read_self on public.sabily_community_members for select to authenticated using (user_id = (select auth.uid()));
create policy sabily_members_join_public on public.sabily_community_members for insert to authenticated with check (user_id = (select auth.uid()) and role = 'member' and status = 'active' and exists (select 1 from public.sabily_communities c where c.id = community_id and c.visibility = 'public'));
create policy sabily_members_owner_add_self on public.sabily_community_members for insert to authenticated with check (user_id = (select auth.uid()) and role = 'owner' and status = 'active' and exists (select 1 from public.sabily_communities c where c.id = community_id and c.created_by = (select auth.uid())));
create policy sabily_members_leave_self on public.sabily_community_members for delete to authenticated using (user_id = (select auth.uid()) and role <> 'owner');

create policy sabily_posts_read on public.sabily_community_posts for select to authenticated using (exists (select 1 from public.sabily_communities c where c.id = community_id and (c.visibility = 'public' or c.created_by = (select auth.uid()))));
create policy sabily_posts_create_member on public.sabily_community_posts for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.sabily_community_members m where m.community_id = sabily_community_posts.community_id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy sabily_posts_update_author on public.sabily_community_posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy sabily_posts_delete_author on public.sabily_community_posts for delete to authenticated using (author_id = (select auth.uid()));

create policy sabily_comments_read on public.sabily_community_comments for select to authenticated using (exists (select 1 from public.sabily_community_posts p join public.sabily_communities c on c.id = p.community_id where p.id = post_id and (c.visibility = 'public' or c.created_by = (select auth.uid()))));
create policy sabily_comments_create_member on public.sabily_community_comments for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.sabily_community_posts p join public.sabily_community_members m on m.community_id = p.community_id where p.id = sabily_community_comments.post_id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy sabily_comments_delete_author on public.sabily_community_comments for delete to authenticated using (author_id = (select auth.uid()));

-- Roles are never writable from the browser. Only this signup trigger can assign them.
create or replace function private.handle_new_sabily_user()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  insert into public.sabily_profiles (user_id,display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email,''),'@',1)))
  on conflict (user_id) do nothing;
  insert into public.sabily_user_roles (user_id,role)
  values (new.id, case when lower(coalesce(new.email,'')) = 'abdel@sabily.io' then 'super_admin' else 'member' end)
  on conflict (user_id) do nothing;
  return new;
end;
$function$;
revoke all on function private.handle_new_sabily_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_sabily on auth.users;
create trigger on_auth_user_created_sabily after insert on auth.users for each row execute function private.handle_new_sabily_user();

-- Keep the pre-installed RLS automation function out of the public Data API.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
