-- VAPID key accessors: private key remains in Supabase Vault and is never exposed to clients.
create or replace function public.sabily_get_vapid_public_key()
returns text language sql security definer set search_path=public,vault
as $$ select decrypted_secret::text from vault.decrypted_secrets where name='sabily_vapid_public_key' limit 1; $$;
create or replace function public.sabily_get_vapid_private_key()
returns text language sql security definer set search_path=public,vault
as $$ select decrypted_secret::text from vault.decrypted_secrets where name='sabily_vapid_private_key' limit 1; $$;
revoke all on function public.sabily_get_vapid_public_key() from public,anon,authenticated;
revoke all on function public.sabily_get_vapid_private_key() from public,anon,authenticated;
grant execute on function public.sabily_get_vapid_public_key() to service_role;
grant execute on function public.sabily_get_vapid_private_key() to service_role;
