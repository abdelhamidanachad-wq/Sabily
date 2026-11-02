import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const response = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return response(405, { error: "Method not allowed" });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return response(401, { error: "Sign-in required" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response(500, { error: "Server configuration missing" });
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return response(401, { error: "Invalid session" });
  const { data: roleRow, error: roleError } = await db.from("sabily_user_roles")
    .select("role").eq("user_id", auth.user.id).maybeSingle();
  if (roleError) return response(500, { error: "Unable to verify permissions" });
  const role = roleRow?.role ?? "member";
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return response(400, { error: "Invalid JSON" }); }
  const action = String(body.action ?? "");
  const isAdmin = ["admin", "super_admin"].includes(role);
  const isModerator = ["moderator", "admin", "super_admin"].includes(role);
  const isSuperAdmin = role === "super_admin";
  if (!isAdmin && !isModerator) return response(403, { error: "Administrator or moderator access required" });

  const log = async (actionName: string, entityType: string, entityId: string | null, details: Record<string, unknown> = {}) => {
    const { error } = await db.from("sabily_audit_log").insert({
      actor_id: auth.user.id, action: actionName, entity_type: entityType, entity_id: entityId, details,
    });
    if (error) throw error;
  };

  try {
    switch (action) {
      case "overview": {
        if (!isAdmin) return response(403, { error: "Administrator access required" });
        const [communities, posts, reports] = await Promise.all([
          db.from("sabily_communities").select("id", { count: "exact", head: true }),
          db.from("sabily_community_posts").select("id", { count: "exact", head: true }),
          db.from("sabily_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        ]);
        if (communities.error || posts.error || reports.error) throw new Error("Could not load dashboard counts");
        let userCount = 0;
        for (let page = 1; page <= 50; page++) {
          const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) throw error;
          userCount += data.users.length;
          if (data.users.length < 1000) break;
        }
        return response(200, { ok: true, result: { users: userCount, communities: communities.count ?? 0, posts: posts.count ?? 0, openReports: reports.count ?? 0 } });
      }
      case "list_users": {
        if (!isSuperAdmin) return response(403, { error: "Super-admin permission required" });
        const query = String(body.search ?? "").trim().toLowerCase();
        const requestedPage = Math.max(1, Math.floor(Number(body.page) || 1));
        const perPage = 100;
        let pageUsers: typeof auth.user[] = [];
        let total: number | null = null;
        if (query) {
          const matching = [];
          for (let scanPage = 1; scanPage <= 50; scanPage++) {
            const { data, error } = await db.auth.admin.listUsers({ page: scanPage, perPage: 1000 });
            if (error) throw error;
            matching.push(...data.users.filter((u) => (u.email ?? "").toLowerCase().includes(query) || String(u.user_metadata?.full_name ?? "").toLowerCase().includes(query)));
            if (data.users.length < 1000) break;
            if (scanPage === 50) return response(413, { error: "Directory search reached its safe page limit; refine your search." });
          }
          total = matching.length;
          pageUsers = matching.slice((requestedPage - 1) * perPage, requestedPage * perPage);
        } else {
          const { data, error } = await db.auth.admin.listUsers({ page: requestedPage, perPage });
          if (error) throw error;
          pageUsers = data.users;
        }
        const ids = pageUsers.map((u) => u.id);
        const [profiles, roles] = ids.length ? await Promise.all([
          db.from("sabily_profiles").select("user_id,display_name,city,country_code,onboarding_complete").in("user_id", ids),
          db.from("sabily_user_roles").select("user_id,role").in("user_id", ids),
        ]) : [{ data: [], error: null }, { data: [], error: null }];
        if (profiles.error || roles.error) throw new Error("Could not join profile and role records");
        const profileMap = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));
        const roleMap = new Map((roles.data ?? []).map((r) => [r.user_id, r.role]));
        const items = pageUsers.map((u) => ({
          id: u.id, email: u.email ?? "", createdAt: u.created_at, lastSignInAt: u.last_sign_in_at,
          bannedUntil: u.banned_until, emailConfirmedAt: u.email_confirmed_at,
          displayName: profileMap.get(u.id)?.display_name ?? String(u.user_metadata?.full_name ?? ""),
          city: profileMap.get(u.id)?.city ?? "", onboardingComplete: profileMap.get(u.id)?.onboarding_complete ?? false,
          role: roleMap.get(u.id) ?? "member", isSelf: u.id === auth.user.id,
        }));
        return response(200, { ok: true, result: { items, total, page: requestedPage, perPage, hasMore: items.length === perPage } });
      }
      case "set_role": {
        if (!isSuperAdmin) return response(403, { error: "Super-admin permission required" });
        const userId = String(body.userId ?? "");
        const nextRole = String(body.role ?? "");
        if (!userId || !["member", "creator", "moderator", "admin", "super_admin"].includes(nextRole)) {
          return response(400, { error: "A valid user ID and role are required" });
        }
        if (userId === auth.user.id && nextRole !== "super_admin") return response(400, { error: "You cannot remove your own super-admin access" });
        const { data, error } = await db.from("sabily_user_roles")
          .upsert({ user_id: userId, role: nextRole, granted_by: auth.user.id }, { onConflict: "user_id" })
          .select("user_id,role").single();
        if (error) throw error;
        await log(action, "user_role", userId, { role: nextRole });
        return response(200, { ok: true, result: data });
      }
      case "set_user_status": {
        if (!isSuperAdmin) return response(403, { error: "Super-admin permission required" });
        const userId = String(body.userId ?? "");
        const suspended = body.suspended === true;
        if (!userId) return response(400, { error: "User ID is required" });
        if (userId === auth.user.id) return response(400, { error: "You cannot suspend your own account" });
        const { data, error } = await db.auth.admin.updateUserById(userId, {
          ban_duration: suspended ? "876000h" : "none",
        });
        if (error) throw error;
        await log(action, "auth_user", userId, { suspended });
        return response(200, { ok: true, result: { userId, suspended: Boolean(data.user?.banned_until) } });
      }
      case "list_modules": {
        if (!isAdmin) return response(403, { error: "Administrator access required" });
        const { data, error } = await db.from("sabily_app_settings").select("key,value,description,updated_at").like("key", "module.%").order("key");
        if (error) throw error;
        return response(200, { ok: true, result: data ?? [] });
      }
      case "update_module": {
        if (!isSuperAdmin) return response(403, { error: "Super-admin permission required" });
        const key = String(body.key ?? "");
        const enabled = body.enabled;
        if (!/^module\.[a-z0-9_.-]{1,100}$/.test(key) || typeof enabled !== "boolean") return response(400, { error: "A valid module key and enabled value are required" });
        const { data: current, error: currentError } = await db.from("sabily_app_settings").select("value").eq("key", key).maybeSingle();
        if (currentError) throw currentError;
        if (!current) return response(404, { error: "Module configuration was not found" });
        const value = { ...(current.value as Record<string, unknown>), enabled };
        const { data, error } = await db.from("sabily_app_settings").update({ value, updated_by: auth.user.id, updated_at: new Date().toISOString() }).eq("key", key).select("key,value,description,updated_at").single();
        if (error) throw error;
        await log(action, "module", key, { enabled });
        return response(200, { ok: true, result: data });
      }
      case "list_integrations": {
        if (!isAdmin) return response(403, { error: "Administrator access required" });
        const items = [
          { id: "supabase", label: "Supabase", configured: Boolean(Deno.env.get("SUPABASE_URL") && Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")), secretsEditableHere: false },
          { id: "ai_gateway", label: "Vercel AI Gateway", configured: Boolean(Deno.env.get("AI_GATEWAY_API_KEY")), secretsEditableHere: false },
          { id: "openai", label: "OpenAI", configured: Boolean(Deno.env.get("OPENAI_API_KEY")), secretsEditableHere: false },
          { id: "web_push", label: "Web push delivery", configured: Boolean(Deno.env.get("VAPID_PUBLIC_KEY") && Deno.env.get("VAPID_PRIVATE_KEY")), secretsEditableHere: false },
        ];
        return response(200, { ok: true, result: items });
      }
      case "list_audit": {
        if (!isSuperAdmin) return response(403, { error: "Super-admin permission required" });
        const { data, error } = await db.from("sabily_audit_log").select("id,actor_id,action,entity_type,entity_id,details,created_at").order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return response(200, { ok: true, result: data ?? [] });
      }
      case "moderate_post":
      case "moderate_comment": {
        if (!isModerator) return response(403, { error: "Moderator permission required" });
        const idField = action === "moderate_post" ? "postId" : "commentId";
        const table = action === "moderate_post" ? "sabily_community_posts" : "sabily_community_comments";
        const id = String(body[idField] ?? "");
        const status = String(body.status ?? "");
        if (!id || !["published", "hidden", "removed", "pending"].includes(status)) return response(400, { error: "A valid record ID and moderation status are required" });
        const changes = action === "moderate_post" ? { moderation_status: status, updated_at: new Date().toISOString() } : { moderation_status: status };
        const { data, error } = await db.from(table).update(changes).eq("id", id).select("id,moderation_status").single();
        if (error) throw error;
        await log(action, action === "moderate_post" ? "community_post" : "community_comment", id, { status });
        return response(200, { ok: true, result: data });
      }
      case "resolve_report": {
        if (!isModerator) return response(403, { error: "Moderator permission required" });
        const reportId = String(body.reportId ?? "");
        const status = String(body.status ?? "");
        if (!reportId || !["reviewing", "resolved", "dismissed", "open"].includes(status)) return response(400, { error: "Report ID and valid status are required" });
        const { data, error } = await db.from("sabily_reports").update({
          status, assigned_to: auth.user.id,
          resolved_at: ["resolved", "dismissed"].includes(status) ? new Date().toISOString() : null,
        }).eq("id", reportId).select("id,status").single();
        if (error) throw error;
        await log(action, "report", reportId, { status });
        return response(200, { ok: true, result: data });
      }
      default:
        return response(400, { error: "Unsupported action" });
    }
  } catch (error) {
    console.error("Sabily admin action failed", action, error);
    return response(500, { error: "Action failed. Check record identifiers, permissions and schema." });
  }
});
