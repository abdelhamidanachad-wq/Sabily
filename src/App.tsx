import { useEffect, useState } from "react";
import { Activity, BookOpen, Bot, Camera, CreditCard, FileText, Flag, HandHeart, KeyRound, LayoutDashboard, Library, LogOut, MessageCircle, Palette, Settings, ShieldCheck, Users, Wallet } from "lucide-react";
import { getSabilyRole, supabase, supabaseReady, type SabilyRole } from "./supabase";

const sections = [
  ["Overview", LayoutDashboard], ["People & roles", Users], ["Content studio", FileText],
  ["AI studio", Bot], ["Media maker", Camera], ["Community", MessageCircle],
  ["Library", Library], ["Themes & brand", Palette], ["API integrations", KeyRound],
  ["Ads & programs", Flag], ["Payments", CreditCard], ["Campaigns & giving", HandHeart],
  ["Rewards ledger", Wallet], ["System settings", Settings], ["Audit log", ShieldCheck]
] as const;

function Brand() {
  return <div className="brand-lockup"><div className="brand-mark">S</div><div><strong>sabily</strong><small>A BETTER PATH, TOGETHER</small></div></div>;
}

function Login({ signedIn }: { signedIn: (id: string, email: string, role: SabilyRole) => void }) {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [signup,setSignup] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!supabase) { setError("Add the Supabase URL and publishable key to .env.local."); return; }
    setBusy(true);
    const result = signup
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: email.split("@")[0] } } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) { setError(result.error.message); setBusy(false); return; }
    if (result.data.user && result.data.session) {
      try { signedIn(result.data.user.id, result.data.user.email || email, await getSabilyRole(result.data.user.id)); }
      catch (err) { setError(err instanceof Error ? err.message : "Could not load account permissions."); }
    } else setError("Account created. Confirm your email, then sign in.");
    setBusy(false);
  }
  return <div className="login-screen"><section className="login-left"><Brand/><div className="login-message"><span className="eyebrow">ONE COMMUNITY. MANY PATHS TO GOOD.</span><h1>Make your next step <em>mean something.</em></h1><p>Faith, learning, personal growth and meaningful action — brought together in one shared journey.</p><blockquote>“And whoever does an atom's weight of good will see it.”<small>Qur'an 99:7 · Translation wording may vary</small></blockquote></div><small>Built with care. Shared for the sake of good.</small></section><section className="login-right"><form className="login-card" onSubmit={submit}><span className="eyebrow">WELCOME TO SABILY</span><h2>{signup ? "Create your account" : "Sign in to Sabily"}</h2><p>Continue your journey and help shape the community.</p><label>Email address</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><label>Password</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/><button className="btn btn-primary" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</button>{error && <p className="error-box">{error}</p>}<p className="login-demo">{signup ? "New accounts start as members. " : "Need an account? "}<button type="button" className="text-link" onClick={()=>{setSignup(!signup);setError("");}}>{signup ? "Back to sign in" : "Create one"}</button></p></form></section></div>;
}

export default function App() {
  const [user,setUser] = useState<{id:string;email:string;role:SabilyRole}|null>(null);
  const [page,setPage] = useState("Overview");
  const [dark,setDark] = useState(true);
  const [prompt,setPrompt] = useState("");
  const [title,setTitle] = useState("");
  const [output,setOutput] = useState("");
  const [message,setMessage] = useState("");
  useEffect(()=>{
    if (!supabase) return;
    supabase.auth.getSession().then(async ({data})=>{
      const u=data.session?.user;
      if (u) setUser({id:u.id,email:u.email||"",role:await getSabilyRole(u.id)});
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(!session)setUser(null);});
    return ()=>subscription.unsubscribe();
  },[]);
  if (!user) return <Login signedIn={(id,email,role)=>setUser({id,email,role})}/>;
  const admin = user.role==="admin" || user.role==="super_admin";
  const visible = sections.filter(([name])=>{
    if (["People & roles","Themes & brand","API integrations","Ads & programs","Payments","System settings","Audit log"].includes(name) && !admin) return false;
    if (["AI studio","Content studio","Media maker"].includes(name) && user.role==="member") return false;
    return true;
  });
  async function generate() {
    if (!title.trim() || !prompt.trim()) { setMessage("Enter a title and prompt."); return; }
    if (!supabase) return;
    setMessage("Generating a draft for review…"); setOutput("");
    const {data,error}=await supabase.functions.invoke("sabily-ai",{body:{title,prompt,jobType:"article",provider:"vercel_ai_gateway",language:"en"}});
    if (error || data?.error) { setMessage(error?.message || data?.error || "AI request failed."); return; }
    setOutput(data.content || ""); setMessage(data.note || "Draft saved for human review.");
  }
  return <div className={dark ? "app-shell theme-dark" : "app-shell theme-light"}>
    <aside className="sidebar"><Brand/><div className="workspace-select"><b>Sabily Global</b><small>Platform workspace</small></div><nav>{visible.map(([name,Icon])=><button key={name} className={page===name?"nav-link active":"nav-link"} onClick={()=>{setPage(name);setMessage("");}}><Icon size={17}/><span>{name}</span></button>)}</nav><div className="profile-row"><div><b>{user.email}</b><small>{user.role.replace("_"," ")}</small></div><button className="icon-btn" onClick={async()=>{await supabase?.auth.signOut();setUser(null);}}><LogOut size={16}/></button></div></aside>
    <main className="main-area"><header className="topbar"><span>Sabily / {page}</span><div className="top-actions"><span className={supabaseReady?"connection connected":"connection"}>{supabaseReady?"Backend connected":"Preview setup"}</span><button className="icon-btn" onClick={()=>setDark(!dark)}>Theme</button></div></header>
      <div className="content-area"><div className="welcome-row"><div><span className="eyebrow">SABILY GLOBAL WORKSPACE</span><h1>{page==="Overview"?"As-salamu alaykum.":page}</h1><p className="muted">Faith · Growth · Service · Community</p></div></div>
      {page==="Overview" ? <div className="stat-grid">{[["Community","Members and roles"],["Learning","Content and library"],["Creation","AI and media studio"],["Giving","Campaigns and contributions"]].map(([a,b])=><section className="stat-card" key={a}><h3>{a}</h3><p>{b}</p></section>)}</div>
      : page==="AI studio" || page==="Content studio" ? <section className="panel studio-panel"><h3>Create a draft</h3><p>AI-assisted content is saved for human review, not published automatically.</p><label>Title</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Draft title"/><label>Prompt / instructions</label><textarea rows={7} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe what you want to create…"/><button className="btn btn-primary" onClick={generate}>Generate draft</button>{message&&<p className="form-message">{message}</p>}{output&&<pre className="generated-output">{output}</pre>}</section>
      : <section className="panel"><h3>{page} workspace</h3><p>This workspace is scaffolded. Live CRUD workflows and provider connections are being added module by module.</p><p className="health-note"><ShieldCheck size={17}/> Admin actions are protected by server-side role checks and database policies.</p>{message&&<p>{message}</p>}</section>}
      </div><footer className="app-footer"><span>© 2026 Sabily</span><span>Small good deeds. Lasting impact.</span></footer>
    </main>
  </div>;
}
