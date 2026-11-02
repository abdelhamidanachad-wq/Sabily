-- Member clients may read only the non-secret module availability flags.
drop policy if exists sabily_modules_read_authenticated on public.sabily_app_settings;
create policy sabily_modules_read_authenticated on public.sabily_app_settings
for select to authenticated using (key like 'module.%');


