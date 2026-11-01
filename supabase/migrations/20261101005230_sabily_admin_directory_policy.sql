drop policy if exists sabily_roles_read_self on public.sabily_user_roles;
create policy sabily_roles_read_self on public.sabily_user_roles
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.sabily_has_role(array['admin','super_admin']))
);