-- Keep content-table RLS predicates init-plan friendly and index FK lookups.
drop policy if exists "Members manage own content preferences" on public.sabily_content_preferences;
create policy "Members manage own content preferences" on public.sabily_content_preferences for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Members manage own content interactions" on public.sabily_content_interactions;
create policy "Members manage own content interactions" on public.sabily_content_interactions for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Read published content or own/admin drafts" on public.sabily_content_items;
create policy "Read published content or own/admin drafts" on public.sabily_content_items for select to authenticated using (
 (review_status='approved' and published_at is not null and published_at<=now())
 or created_by=(select auth.uid())
 or exists(select 1 from public.sabily_user_roles r where r.user_id=(select auth.uid()) and r.role in ('creator','admin','super_admin'))
);
drop policy if exists "Creators submit own pending content" on public.sabily_content_items;
create policy "Creators submit own pending content" on public.sabily_content_items for insert to authenticated with check (
 created_by=(select auth.uid()) and review_status in ('draft','pending_review')
 and exists(select 1 from public.sabily_user_roles r where r.user_id=(select auth.uid()) and r.role in ('creator','admin','super_admin'))
);
drop policy if exists "Creators update own drafts and admins review" on public.sabily_content_items;
create policy "Creators update own drafts and admins review" on public.sabily_content_items for update to authenticated using (
 (created_by=(select auth.uid()) and review_status in ('draft','pending_review'))
 or exists(select 1 from public.sabily_user_roles r where r.user_id=(select auth.uid()) and r.role in ('admin','super_admin'))
) with check (
 (created_by=(select auth.uid()) and review_status in ('draft','pending_review'))
 or exists(select 1 from public.sabily_user_roles r where r.user_id=(select auth.uid()) and r.role in ('admin','super_admin'))
);
create index if not exists sabily_content_interactions_content_id_idx on public.sabily_content_interactions(content_id);
create index if not exists sabily_content_items_created_by_idx on public.sabily_content_items(created_by);
create index if not exists sabily_content_items_reviewed_by_idx on public.sabily_content_items(reviewed_by);
create index if not exists sabily_content_sources_verified_by_idx on public.sabily_content_sources(verified_by);
