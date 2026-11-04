drop policy if exists "Members read approved published content" on public.sabily_content_items;
create policy "Read published content or own/admin drafts" on public.sabily_content_items for select to authenticated using (
 (review_status='approved' and published_at is not null and published_at<=now())
 or created_by=auth.uid()
 or exists(select 1 from public.sabily_user_roles r where r.user_id=auth.uid() and r.role in ('creator','admin','super_admin'))
);
grant insert,update on public.sabily_content_items to authenticated;
create policy "Creators submit own pending content" on public.sabily_content_items for insert to authenticated with check (
 created_by=auth.uid() and review_status in ('draft','pending_review')
 and exists(select 1 from public.sabily_user_roles r where r.user_id=auth.uid() and r.role in ('creator','admin','super_admin'))
);
create policy "Creators update own drafts and admins review" on public.sabily_content_items for update to authenticated using (
 (created_by=auth.uid() and review_status in ('draft','pending_review'))
 or exists(select 1 from public.sabily_user_roles r where r.user_id=auth.uid() and r.role in ('admin','super_admin'))
) with check (
 (created_by=auth.uid() and review_status in ('draft','pending_review'))
 or exists(select 1 from public.sabily_user_roles r where r.user_id=auth.uid() and r.role in ('admin','super_admin'))
);
