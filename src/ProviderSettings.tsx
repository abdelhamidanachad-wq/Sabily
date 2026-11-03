import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, PlugZap, Save, ShieldCheck, TestTube2 } from "lucide-react";
import { supabase } from "./supabase";

type Provider = "openai" | "gemini" | "elevenlabs" | "higgsfield" | "leonardo";
type ProviderState = { provider: Provider; configured: boolean; updatedAt: string | null };
const catalog: { id: Provider; label: string; purpose: string; placeholder: string }[] = [
  { id: "openai", label: "OpenAI / ChatGPT", purpose: "AI companion, writing, reasoning and structured generation", placeholder: "sk-…" },
  { id: "gemini", label: "Google Gemini", purpose: "Multimodal assistant and alternate AI model provider", placeholder: "AIza…" },
  { id: "elevenlabs", label: "ElevenLabs", purpose: "Text-to-speech, voice and future audio experiences", placeholder: "ElevenLabs API key" },
  { id: "higgsfield", label: "Higgsfield", purpose: "Creative image and video generation", placeholder: "Higgsfield API key" },
  { id: "leonardo", label: "Leonardo AI", purpose: "Image generation and creative assets", placeholder: "Leonardo API key" },
];

export default function ProviderSettings() {
  const [states, setStates] = useState<ProviderState[]>([]);
  const [values, setValues] = useState<Partial<Record<Provider, string>>>({});
  const [visible, setVisible] = useState<Partial<Record<Provider, boolean>>>({});
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    if (!supabase) return;
    const { data, error: invokeError } = await supabase.functions.invoke("sabily-provider-config", { body: { action: "list" } });
    if (invokeError || data?.error) { setError(invokeError?.message || data?.error || "Could not load provider status."); return; }
    setStates(data.providers || []);
  };
  useEffect(() => { void refresh(); }, []);

  const save = async (provider: Provider) => {
    const apiKey = (values[provider] || "").trim();
    if (!apiKey) { setError("Enter the API key before saving."); return; }
    setBusy(provider); setError(""); setFeedback("");
    const { data, error: invokeError } = await supabase!.functions.invoke("sabily-provider-config", { body: { action: "save", provider, apiKey } });
    setBusy("");
    if (invokeError || data?.error) { setError(invokeError?.message || data?.error || "Credential could not be saved."); return; }
    setValues(current => ({ ...current, [provider]: "" }));
    setFeedback(data.message || "Credential saved securely.");
    await refresh();
  };

  const test = async (provider: Provider) => {
    setBusy("test-" + provider); setError(""); setFeedback("");
    const { data, error: invokeError } = await supabase!.functions.invoke("sabily-provider-config", { body: { action: "test", provider } });
    setBusy("");
    if (invokeError || data?.error) { setError(invokeError?.message || data?.error || "Provider test failed."); return; }
    setFeedback(data.message || "Provider test completed.");
  };

  return <div className="provider-settings">
    <div className="provider-settings-intro"><div className="provider-settings-icon"><KeyRound size={20}/></div><div><span className="eyebrow">SUPER ADMIN · PRIVATE BETA</span><h3>AI & creative provider keys</h3><p>Enter credentials here. They are written to Supabase Vault by a server-side function; raw keys are never returned to the browser or saved in app settings.</p></div></div>
    <div className="provider-security-note"><ShieldCheck size={17}/><span>Only super-admins can save or test credentials. Never paste keys into chat, source code, GitHub, or public settings.</span></div>
    <div className="provider-grid">{catalog.map(provider => {
      const status = states.find(item => item.provider === provider.id);
      const saving = busy === provider.id;
      const testing = busy === "test-" + provider.id;
      return <article className="provider-card" key={provider.id}>
        <div className="provider-card-head"><div><h4>{provider.label}</h4><p>{provider.purpose}</p></div><span className={status?.configured ? "provider-status ready" : "provider-status missing"}>{status?.configured ? <><CheckCircle2 size={13}/> Key saved</> : <><CircleAlert size={13}/> Not configured</>}</span></div>
        <label className="provider-key-label" htmlFor={"provider-" + provider.id}>API key</label>
        <div className="provider-key-field"><input id={"provider-" + provider.id} type={visible[provider.id] ? "text" : "password"} autoComplete="new-password" value={values[provider.id] || ""} onChange={event => setValues(current => ({ ...current, [provider.id]: event.target.value }))} placeholder={status?.configured ? "Saved securely · enter a new key to rotate" : provider.placeholder}/><button type="button" aria-label={visible[provider.id] ? "Hide API key" : "Show API key"} onClick={() => setVisible(current => ({ ...current, [provider.id]: !current[provider.id] }))}>{visible[provider.id] ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
        <div className="provider-card-actions"><button className="admin-action-btn" disabled={!values[provider.id]?.trim() || saving || testing} onClick={() => void save(provider)}>{saving ? <LoaderCircle size={14} className="spin"/> : <Save size={14}/>} Save securely</button><button className="admin-action-btn secondary" disabled={!status?.configured || saving || testing} onClick={() => void test(provider)}>{testing ? <LoaderCircle size={14} className="spin"/> : <TestTube2 size={14}/>} Test connection</button></div>
        {status?.updatedAt && <small className="provider-updated">Last updated {new Date(status.updatedAt).toLocaleString()}</small>}
      </article>;
    })}</div>
    {error && <p className="notice error">{error}</p>}{feedback && <p className="notice success">{feedback}</p>}
    <div className="provider-next-step"><PlugZap size={16}/><span>Credentials unlock provider adapters only after each feature has a tested integration. AI chat, voice synthesis and image/video generation are separate capabilities with separate permissions and usage limits.</span></div>
  </div>;
}
