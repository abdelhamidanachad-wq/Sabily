-- Follow-up fixes applied as migration 20261101012829.
alter table public.sabily_profiles add column if not exists city text not null default 'Casablanca';
alter table public.sabily_community_posts add column if not exists author_name text not null default 'Sabily member';
alter table public.sabily_community_comments add column if not exists author_name text not null default 'Sabily member';

drop policy if exists sabily_community_posts_read on public.sabily_community_posts;
create policy sabily_community_posts_read on public.sabily_community_posts
for select to authenticated
using (
  exists (
    select 1 from public.sabily_communities c
    where c.id = public.sabily_community_posts.community_id
      and (c.visibility = 'public' or c.created_by = (select auth.uid()))
  )
);

drop policy if exists sabily_community_posts_create on public.sabily_community_posts;
create policy sabily_community_posts_create on public.sabily_community_posts
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.sabily_community_members m
    where m.community_id = public.sabily_community_posts.community_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy if exists sabily_community_comments_create on public.sabily_community_comments;
create policy sabily_community_comments_create on public.sabily_community_comments
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.sabily_community_posts p
    join public.sabily_community_members m on m.community_id = p.community_id
    where p.id = public.sabily_community_comments.post_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);
