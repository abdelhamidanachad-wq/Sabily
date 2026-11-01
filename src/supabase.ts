import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseReady = Boolean(url && key && !url.includes("YOUR_PROJECT"));
export const supabase = supabaseReady
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

export type SabilyRole = "member" | "creator" | "moderator" | "admin" | "super_admin";

export async function getSabilyRole(userId: string): Promise<SabilyRole> {
  if (!supabase) return "member";
  const { data, error } = await supabase
    .from("sabily_user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data?.role ?? "member") as SabilyRole;
}