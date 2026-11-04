import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return new Response(JSON.stringify({ error: "Sign-in required" }), { status: 401, headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ error: "Server auth is not configured" }), { status: 500, headers: cors });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: cors });

  const { data: roleRow, error: roleError } = await admin
    .from("sabily_user_roles").select("role").eq("user_id", authData.user.id).maybeSingle();
  if (roleError) return new Response(JSON.stringify({ error: "Could not verify permissions" }), { status: 500, headers: cors });

  let body: { prompt?: string; title?: string; model?: string; language?: string; jobType?: string; provider?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: cors }); }
  const role = roleRow?.role ?? "member";
  const requestedJobType = body.jobType ?? "article";
  const elevatedRoles = ["admin", "super_admin"];
  const memberChat = role === "member" && requestedJobType === "chat";
  if (!elevatedRoles.includes(role) && !memberChat) return new Response(JSON.stringify({ error: "AI chat is available to members; Sabily Content Studio generation is restricted to admins." }), { status: 403, headers: cors });
  if (requestedJobType === "chat") {
    const { data: allowedByQuota, error: quotaError } = await admin.rpc("sabily_consume_ai_quota", { p_user_id: authData.user.id, p_daily_limit: 20 });
    if (quotaError) return new Response(JSON.stringify({ error: "AI usage limits are not configured. Apply the AI chat quota migration." }), { status: 503, headers: cors });
    if (!allowedByQuota) return new Response(JSON.stringify({ error: "Daily AI chat limit reached. Please try again tomorrow." }), { status: 429, headers: cors });
  }

  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 10 || prompt.length > 12000) return new Response(JSON.stringify({ error: "Prompt must be 10–12,000 characters" }), { status: 400, headers: cors });

  const provider = body.provider === "gemini" ? "gemini" : body.provider === "openai" ? "openai" : "vercel_ai_gateway";
  const model = (body.model ?? (provider === "gemini" ? "gemini-2.5-flash" : provider === "openai" ? "gpt-4o-mini" : "openai/gpt-4o-mini")).trim();
  let apiKey = Deno.env.get(provider === "openai" ? "OPENAI_API_KEY" : provider === "gemini" ? "GEMINI_API_KEY" : "AI_GATEWAY_API_KEY");
  if (!apiKey && provider !== "vercel_ai_gateway") {
    const { data: storedKey } = await admin.rpc("sabily_get_provider_secret", { p_name: `sabily_provider_${provider}` });
    apiKey = storedKey ? String(storedKey) : undefined;
  }

  const { data: job, error: insertError } = await admin.from("sabily_ai_jobs").insert({
    user_id: authData.user.id,
    job_type: ["article","lesson","summary","translation","research","chat"].includes(body.jobType ?? "") ? body.jobType : "article",
    provider,
    model,
    prompt,
    status: apiKey ? "processing" : "failed",
    moderation_status: "pending",
    usage: { language: body.language ?? "en" }
  }).select("id").single();
  if (insertError) return new Response(JSON.stringify({ error: "Could not create AI job" }), { status: 500, headers: cors });

  if (!apiKey) {
    await admin.from("sabily_ai_jobs").update({ output: { message: "AI provider key is not configured on the server." }, status: "failed", completed_at: new Date().toISOString() }).eq("id", job.id);
    return new Response(JSON.stringify({ error: "AI provider is not configured. Add AI_GATEWAY_API_KEY or OPENAI_API_KEY as a Supabase Edge Function secret.", jobId: job.id }), { status: 503, headers: cors });
  }

  const endpoint = provider === "openai"
    ? "https://api.openai.com/v1/chat/completions"
    : provider === "gemini"
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
      : "https://ai-gateway.vercel.sh/v1/chat/completions";
  try {
    const systemPrompt = "You are Sabily's careful educational writing assistant. Be respectful, distinguish established sources from interpretation, do not invent religious quotations or citations, and mark material needing scholarly review. Return useful draft content only; never claim that a draft is an authoritative religious ruling.";
    const requestBody = provider === "gemini"
      ? { systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5 } }
      : { model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], temperature: 0.5 };
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: provider === "gemini" ? { "Content-Type": "application/json" } : { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      await admin.from("sabily_ai_jobs").update({ status: "failed", output: { error: result?.error?.message ?? "Provider request failed" }, completed_at: new Date().toISOString() }).eq("id", job.id);
      return new Response(JSON.stringify({ error: result?.error?.message ?? "AI provider request failed", jobId: job.id }), { status: upstream.status === 429 ? 429 : 502, headers: cors });
    }
    const text = provider === "gemini"
      ? (result?.candidates?.[0]?.content?.parts ?? []).map((part: { text?: string }) => part.text ?? "").join("\n")
      : result?.choices?.[0]?.message?.content ?? "";
    await admin.from("sabily_ai_jobs").update({
      status: "review",
      moderation_status: "pending",
      output: { title: body.title ?? "", content: text, providerResponseId: result.id ?? null },
      usage: { provider, model, tokens: result?.usage ?? {}, language: body.language ?? "en" },
      completed_at: new Date().toISOString()
    }).eq("id", job.id);
    return new Response(JSON.stringify({ jobId: job.id, status: "review", title: body.title ?? "", content: text, note: "Draft saved for human review. It has not been published." }), { status: 200, headers: cors });
  } catch (err) {
    await admin.from("sabily_ai_jobs").update({ status: "failed", output: { error: "Network or provider error" }, completed_at: new Date().toISOString() }).eq("id", job.id);
    return new Response(JSON.stringify({ error: "Network or provider error", jobId: job.id }), { status: 502, headers: cors });
  }
});