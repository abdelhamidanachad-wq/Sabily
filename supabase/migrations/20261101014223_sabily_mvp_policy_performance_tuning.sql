-- Performance and policy cleanup for the Sabily MVP.
create index if not exists sabily_communities_created_by_idx on public.sabily_communities(created_by);
create index if not exists sabily_community_comments_author_idx on public.sabily_community_comments(author_id);
create index if not exists sabily_community_posts_author_idx on public.sabily_community_posts(author_id);
create index if not exists sabily_user_roles_granted_by_idx on public.sabily_user_roles(granted_by);

drop policy if exists sabily_members_join_public on public.sabily_community_members;
drop policy if exists sabily_members_owner_add_self on public.sabily_community_members;
create policy sabily_members_insert_self on public.sabily_community_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'active'
  and (
    (role = 'member' and exists (
      select 1 from public.sabily_communities c
      where c.id = community_id and c.visibility = 'public'
    ))
    or
    (role = 'owner' and exists (
      select 1 from public.sabily_communities c
      where c.id = community_id and c.created_by = (select auth.uid())
    ))
  )
);