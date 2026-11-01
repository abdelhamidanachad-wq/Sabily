-- Sabily communities MVP schema (applied as migration 20261101012818).
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
  primary key (community_id, user_id)
);
create table public.sabily_community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.sabily_communities(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sabily_community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.sabily_community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index sabily_communities_country_category_idx on public.sabily_communities(country_code, category);
create index sabily_community_members_user_idx on public.sabily_community_members(user_id, status);
create index sabily_community_posts_feed_idx on public.sabily_community_posts(community_id, created_at desc);
create index sabily_community_comments_post_idx on public.sabily_community_comments(post_id, created_at);
alter table public.sabily_communities enable row level security;
alter table public.sabily_community_members enable row level security;
alter table public.sabily_community_posts enable row level security;
alter table public.sabily_community_comments enable row level security;
grant select, insert, update, delete on public.sabily_communities to authenticated;
grant select, insert, update, delete on public.sabily_community_members to authenticated;
grant select, insert, update, delete on public.sabily_community_posts to authenticated;
grant select, insert, update, delete on public.sabily_community_comments to authenticated;
create policy sabily_communities_read on public.sabily_communities for select to authenticated using (visibility = 'public' or created_by = (select auth.uid()));
create policy sabily_communities_create on public.sabily_communities for insert to authenticated with check (created_by = (select auth.uid()));
create policy sabily_communities_update on public.sabily_communities for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy sabily_communities_delete on public.sabily_communities for delete to authenticated using (created_by = (select auth.uid()));
create policy sabily_community_members_read_self on public.sabily_community_members for select to authenticated using (user_id = (select auth.uid()));
create policy sabily_community_members_join_public on public.sabily_community_members for insert to authenticated with check (
  user_id = (select auth.uid()) and role = 'member' and status = 'active'
  and exists (select 1 from public.sabily_communities c where c.id = community_id and c.visibility = 'public')
);
create policy sabily_community_members_owner_add_self on public.sabily_community_members for insert to authenticated with check (
  user_id = (select auth.uid()) and role = 'owner' and status = 'active'
  and exists (select 1 from public.sabily_communities c where c.id = community_id and c.created_by = (select auth.uid()))
);
create policy sabily_community_members_leave on public.sabily_community_members for delete to authenticated using (user_id = (select auth.uid()) and role <> 'owner');
create policy sabily_community_posts_read on public.sabily_community_posts for select to authenticated using (
  exists (select 1 from public.sabily_communities c where c.id = public.sabily_community_posts.community_id and (c.visibility = 'public' or c.created_by = (select auth.uid())))
);
create policy sabily_community_posts_create on public.sabily_community_posts for insert to authenticated with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.sabily_community_members m where m.community_id = community_id and m.user_id = (select auth.uid()) and m.status = 'active')
);
create policy sabily_community_posts_owner_update on public.sabily_community_posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy sabily_community_posts_owner_delete on public.sabily_community_posts for delete to authenticated using (author_id = (select auth.uid()));
create policy sabily_community_comments_read on public.sabily_community_comments for select to authenticated using (
  exists (select 1 from public.sabily_community_posts p where p.id = post_id)
);
create policy sabily_community_comments_create on public.sabily_community_comments for insert to authenticated with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.sabily_community_posts p join public.sabily_community_members m on m.community_id = p.community_id
    where p.id = post_id and m.user_id = (select auth.uid()) and m.status = 'active')
);
create policy sabily_community_comments_owner_delete on public.sabily_community_comments for delete to authenticated using (author_id = (select auth.uid()));
