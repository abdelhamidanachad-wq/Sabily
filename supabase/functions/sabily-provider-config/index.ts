import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const providers = ["openai", "gemini", "elevenlabs", "higgsfield", "leonardo"] as const;
type Provider = typeof providers[number];
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !url || !service) return reply(401, { error: "Sign-in required" });
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return reply(401, { error: "Invalid session" });
  const { data: role, error: roleError } = await db.from("sabily_user_roles")
    .select("role").eq("user_id", auth.user.id).maybeSingle();
  if (roleError) return reply(500, { error: "Could not verify role" });
  let body: { action?: string; provider?: string; apiKey?: string };
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid JSON" }); }
  const action = body.action ?? "list";
  if (action === "public_config") {
    const { data: vapidPublicKey, error } = await db.rpc("sabily_get_vapid_public_key");
    if (error) return reply(503, { error: "Push notification public key is not configured." });
    return reply(200, { vapidPublicKey: vapidPublicKey ?? null });
  }
  if (role?.role !== "super_admin") return reply(403, { error: "Super-admin access required" });
  if (action === "list") {
    const { data, error } = await db.rpc("sabily_provider_secret_status");
    if (error) return reply(503, { error: "Supabase Vault is not available. Apply the private-beta migration and enable Vault." });
    const configured = new Set((data ?? []).map((row) => row.name));
    return reply(200, { providers: providers.map((provider) => ({
      provider, configured: configured.has(`sabily_provider_${provider}`),
      updatedAt: data?.find((row) => row.name === `sabily_provider_${provider}`)?.updated_at ?? null,
    })) });
  }
  if (action === "save") {
    const provider = body.provider as Provider;
    const apiKey = (body.apiKey ?? "").trim();
    if (!providers.includes(provider) || apiKey.length < 8 || apiKey.length > 4096) {
      return reply(400, { error: "Choose a provider and enter a valid API key." });
    }
    const { error } = await db.rpc("sabily_store_provider_secret", {
      p_name: `sabily_provider_${provider}`, p_secret: apiKey,
    });
    if (error) return reply(503, { error: "Could not store the credential in Supabase Vault. Apply the private-beta migration first." });
    await db.from("sabily_audit_log").insert({
      actor_id: auth.user.id, action: "provider_secret_updated", entity_type: "integration",
      entity_id: provider, details: { provider, credential_value_excluded: true },
    });
    return reply(200, { ok: true, provider, message: "Credential stored securely. The value will not be shown again." });
  }
  if (action === "test") {
    const provider = body.provider as Provider;
    if (!providers.includes(provider)) return reply(400, { error: "Unknown provider." });
    const { data: secret, error } = await db.rpc("sabily_get_provider_secret", { p_name: `sabily_provider_${provider}` });
    if (error || !secret) return reply(404, { error: "Save this provider key first." });
    const key = String(secret);
    try {
      let response: Response | null = null;
      if (provider === "openai") response = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      if (provider === "gemini") response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
      if (provider === "elevenlabs") response = await fetch("https://api.elevenlabs.io/v1/user", { headers: { "xi-api-key": key } });
      if (provider === "leonardo") response = await fetch("https://cloud.leonardo.ai/api/rest/v1/me", { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" } });
      if (provider === "higgsfield") return reply(200, { ok: true, verified: false, message: "Key is securely stored. Add the current Higgsfield API endpoint/contract before automated verification." });
      return reply(200, { ok: Boolean(response?.ok), verified: true, message: response?.ok ? "Provider authentication succeeded." : `Provider returned HTTP ${response?.status}.` });
    } catch {
      return reply(502, { error: "Provider could not be reached from the server." });
    }
  }
  return reply(400, { error: "Unsupported action" });
});
