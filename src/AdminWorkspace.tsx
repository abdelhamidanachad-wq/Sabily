import { useEffect, useState, type FormEvent } from "react";
import { Activity, BookOpen, Bot, Camera, CreditCard, FileText, Flag, HandHeart, KeyRound, LayoutDashboard, Library, LogOut, MessageCircle, Palette, Settings, ShieldCheck, Users, Wallet, RefreshCw, Search, PlugZap, AlertTriangle, Check, Ban, Clock3, ChevronRight } from "lucide-react";
import { getSabilyRole, supabase, supabaseReady, type SabilyRole } from "./supabase";

const sections = [
  ["Overview", LayoutDashboard], ["People & roles", Users], ["Module configuration", Settings],
  ["Moderation", MessageCircle], ["Integrations", PlugZap], ["Security controls", KeyRound],
  ["Content studio", FileText], ["AI studio", Bot], ["Audit log", ShieldCheck]
] as const;

type DirectoryUser = { id:string; email:string; createdAt:string; lastSignInAt:string|null; bannedUntil:string|null; emailConfirmedAt:string|null; displayName:string; city:string; onboardingComplete:boolean; role:SabilyRole; isSelf:boolean };
type Report = { id:string; reporter_id:string|null; target_type:"community_post"|"community_comment"; target_id:string; reason:string; details:string; status:string; created_at:string; content?:string; author?:string };
const adminPaths:Record<string,string>={Overview:"/admin/overview","People & roles":"/admin/users","Module configuration":"/admin/modules",Moderation:"/admin/moderation",Integrations:"/admin/integrations","Security controls":"/admin/security","Content studio":"/admin/content","AI studio":"/admin/integrations/ai","Audit log":"/admin/audit"};
function adminPageForPath(path:string){return Object.entries(adminPaths).find(([,route])=>route===path)?.[0]||"Overview";}

function Brand() {
  return <div className="brand-lockup"><div className="brand-mark">S</div><div><strong>sabily</strong><small>A BETTER PATH, TOGETHER</small></div></div>;
}

function Login({ signedIn }: { signedIn: (id: string, email: string, role: SabilyRole) => void }) {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [signup,setSignup] = useState(false);
  async function submit(e: FormEvent) {
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

export default function AdminWorkspace() {
  const [user,setUser] = useState<{id:string;email:string;role:SabilyRole}|null>(null);
  const [page,setPage] = useState(()=>typeof window==="undefined"?"Overview":adminPageForPath(window.location.pathname));
  const [dark,setDark] = useState(true);
  const [prompt,setPrompt] = useState("");
  const [title,setTitle] = useState("");
  const [output,setOutput] = useState("");
  const [message,setMessage] = useState("");
  const [users,setUsers] = useState<DirectoryUser[]>([]);
  const [userSearch,setUserSearch] = useState("");
  const [userSearchDraft,setUserSearchDraft] = useState("");
  const [usersPage,setUsersPage] = useState(1);
  const [usersTotal,setUsersTotal] = useState<number|null>(null);
  const [usersHasMore,setUsersHasMore] = useState(false);
  const [modules,setModules] = useState<any[]>([]);
  const [integrations,setIntegrations] = useState<any[]>([]);
  const [audit,setAudit] = useState<any[]>([]);
  const [reports,setReports] = useState<Report[]>([]);
  const [overview,setOverview] = useState<Record<string,number>>({});
  const [resourceLoading,setResourceLoading] = useState(false);
  const [working,setWorking] = useState("");
  const [reloadKey,setReloadKey] = useState(0);
  useEffect(()=>{
    if (!supabase) return;
    supabase.auth.getSession().then(async ({data})=>{
      const u=data.session?.user;
      if (u) setUser({id:u.id,email:u.email||"",role:await getSabilyRole(u.id)});
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(!session)setUser(null);});
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    const target=adminPaths[page]||adminPaths.Overview;
    if(window.location.pathname!==target)window.history.pushState({},"",target);
  },[page]);
  useEffect(()=>{
    const sync=()=>{if(window.location.pathname.startsWith("/admin/"))setPage(adminPageForPath(window.location.pathname));};
    window.addEventListener("popstate",sync);return()=>window.removeEventListener("popstate",sync);
  },[]);
  useEffect(()=>{
    if (!user || !supabase) return;
    const db=supabase;
    let active=true;
    const load=async()=>{
      setResourceLoading(true);setMessage("");
      try {
        if(page==="Overview") { const {data,error}=await db.functions.invoke("sabily-admin",{body:{action:"overview"}});if(error||data?.error)throw new Error(error?.message||data?.error);if(active)setOverview(data.result||{}); }
        if(page==="People & roles") { const {data,error}=await db.functions.invoke("sabily-admin",{body:{action:"list_users",search:userSearch,page:usersPage}});if(error||data?.error)throw new Error(error?.message||data?.error);if(active){const result=data.result||{};setUsers(old=>usersPage===1?(result.items||[]):[...old,...(result.items||[])]);setUsersTotal(result.total??null);setUsersHasMore(Boolean(result.hasMore));} }
        if(page==="Module configuration") { const {data,error}=await db.functions.invoke("sabily-admin",{body:{action:"list_modules"}});if(error||data?.error)throw new Error(error?.message||data?.error);if(active)setModules(data.result||[]); }
        if(page==="Integrations") { const {data,error}=await db.functions.invoke("sabily-admin",{body:{action:"list_integrations"}});if(error||data?.error)throw new Error(error?.message||data?.error);if(active)setIntegrations(data.result||[]); }
        if(page==="Audit log") { const {data,error}=await db.functions.invoke("sabily-admin",{body:{action:"list_audit"}});if(error||data?.error)throw new Error(error?.message||data?.error);if(active)setAudit(data.result||[]); }
        if(page==="Moderation") {
          const {data,error}=await db.from("sabily_reports").select("id,reporter_id,target_type,target_id,reason,details,status,created_at").order("created_at",{ascending:false}).limit(100);
          if(error)throw error;
          const rows=(data||[]) as Report[], postIds=rows.filter(r=>r.target_type==="community_post").map(r=>r.target_id), commentIds=rows.filter(r=>r.target_type==="community_comment").map(r=>r.target_id);
          const [postRows,commentRows]=await Promise.all([postIds.length?db.from("sabily_community_posts").select("id,body,author_name").in("id",postIds):Promise.resolve({data:[],error:null}),commentIds.length?db.from("sabily_community_comments").select("id,body,author_name").in("id",commentIds):Promise.resolve({data:[],error:null})]);
          if(postRows.error||commentRows.error)throw postRows.error||commentRows.error;
          const contentMap=new Map([...(postRows.data||[]),...(commentRows.data||[])].map((row:any)=>[row.id,row]));
          if(active)setReports(rows.map(report=>({...report,content:contentMap.get(report.target_id)?.body||"Content unavailable or removed",author:contentMap.get(report.target_id)?.author_name||"Unknown member"})));
        }
      } catch(error) { if(active)setMessage(error instanceof Error?error.message:"Could not load this workspace."); }
      finally { if(active)setResourceLoading(false); }
    };
    void load();return()=>{active=false};
  },[page,user?.id,userSearch,usersPage,reloadKey]);
  if (!user) return <Login signedIn={(id,email,role)=>setUser({id,email,role})}/>;
  const admin = user.role==="admin" || user.role==="super_admin";
  if (!admin) return <div className="admin-denied"><h2>Admin access only</h2><p>Your account does not have administrator permissions.</p></div>;
  const visible = sections;
  async function generate() {
    if (!title.trim() || !prompt.trim()) { setMessage("Enter a title and prompt."); return; }
    if (!supabase) return;
    setMessage("Generating a draft for review…"); setOutput("");
    const {data,error}=await supabase.functions.invoke("sabily-ai",{body:{title,prompt,jobType:"article",provider:"vercel_ai_gateway",language:"en"}});
    if (error || data?.error) { setMessage(error?.message || data?.error || "AI request failed."); return; }
    setOutput(data.content || ""); setMessage(data.note || "Draft saved for human review.");
  }
  async function adminAction(action:string,payload:Record<string,unknown>) {
    if(!supabase)throw new Error("Supabase is not connected.");
    const {data,error}=await supabase.functions.invoke("sabily-admin",{body:{action,...payload}});
    if(error||data?.error)throw new Error(error?.message||data?.error||"Admin action failed.");
    return data?.result;
  }
  async function changeRole(target:DirectoryUser,nextRole:SabilyRole) {
    if(!window.confirm(`Change ${target.email}'s role to ${nextRole.replace("_"," ")}?`))return;
    setWorking(target.id);setMessage("");
    try{await adminAction("set_role",{userId:target.id,role:nextRole});setUsers(old=>old.map(row=>row.id===target.id?{...row,role:nextRole}:row));setMessage("Role updated and written to the audit log.");}
    catch(error){setMessage(error instanceof Error?error.message:"Could not update the role.");}
    finally{setWorking("");}
  }
  async function changeStatus(target:DirectoryUser) {
    const suspended= !target.bannedUntil;
    if(!window.confirm(`${suspended?"Suspend":"Restore"} ${target.email}'s access?`))return;
    setWorking(target.id);setMessage("");
    try{await adminAction("set_user_status",{userId:target.id,suspended});setUsers(old=>old.map(row=>row.id===target.id?{...row,bannedUntil:suspended?"suspended":null}:row));setMessage(`Account ${suspended?"suspended":"restored"} and action recorded.`);}
    catch(error){setMessage(error instanceof Error?error.message:"Could not change account status.");}
    finally{setWorking("");}
  }
  async function toggleModule(module:any) {
    const enabled=module.value?.enabled!==true;setWorking(module.key);setMessage("");
    try{const updated=await adminAction("update_module",{key:module.key,enabled});setModules(old=>old.map(row=>row.key===module.key?updated:row));setMessage(`${module.description} ${enabled?"enabled":"disabled"}.`);}
    catch(error){setMessage(error instanceof Error?error.message:"Could not update module configuration.");}
    finally{setWorking("");}
  }
  async function resolveReport(report:Report,status:string) {
    setWorking(report.id);setMessage("");
    try{await adminAction("resolve_report",{reportId:report.id,status});setReports(old=>old.map(row=>row.id===report.id?{...row,status}:row));setMessage("Report status updated and recorded.");}
    catch(error){setMessage(error instanceof Error?error.message:"Could not update report.");}
    finally{setWorking("");}
  }
  const filteredUsers=users;
  return <div className={dark ? "app-shell theme-dark admin-shell" : "app-shell theme-light admin-shell"}>
    <aside className="sidebar"><Brand/><div className="workspace-select"><b>Sabily Global</b><small>Platform workspace · Admin</small></div><nav>{visible.map(([name,Icon])=><button key={name} className={page===name?"nav-link active":"nav-link"} onClick={()=>{setPage(name);setMessage("");}}><Icon size={17}/><span>{name}</span></button>)}</nav><div className="profile-row"><div><b>{user.email}</b><small>{user.role.replace("_"," ")}</small></div><button className="icon-btn" onClick={async()=>{await supabase?.auth.signOut();setUser(null);}}><LogOut size={16}/></button></div></aside>
    <main className="main-area"><header className="topbar"><span>Sabily / Admin / {page}</span><div className="top-actions"><span className={supabaseReady?"connection connected":"connection"}>{supabaseReady?"Backend connected":"Preview setup"}</span><button className="icon-btn" onClick={()=>setDark(!dark)}>Theme</button></div></header>
      <div className="content-area"><div className="welcome-row"><div><span className="eyebrow">SABILY GLOBAL CONTROL</span><h1>{page==="Overview"?"Platform overview":page}</h1><p className="muted">Administration · Governance · Operations</p></div></div>
      {resourceLoading&&<p className="health-note"><RefreshCw size={16} className="spin-icon"/> Loading live Supabase data…</p>}
      {message&&<p className="form-message" role="status">{message}</p>}
      {page==="Overview"&&<><div className="stat-grid">{[["Members",overview.users??0,"Auth accounts"],["Communities",overview.communities??0,"Member spaces"],["Posts",overview.posts??0,"Community posts"],["Open reports",overview.openReports??0,"Needs moderator review"]].map(([label,value,detail])=><section className="stat-card" key={label}><span className="eyebrow">LIVE DATA</span><h3>{value}</h3><p>{label} · {detail}</p></section>)}</div><section className="panel"><h3>Operations at a glance</h3><p>Manage accounts and roles, review member reports, configure module availability, inspect integration readiness and review the security audit trail.</p><div className="admin-shortcuts">{[["People & roles","Manage member accounts"],["Moderation","Review reports"],["Module configuration","Control module access"],["Integrations","Check provider health"]].map(([target,caption])=><button key={target} onClick={()=>setPage(target)}><b>{target}</b><small>{caption}</small></button>)}</div></section></>}
      {page==="People & roles"&&<section className="panel admin-directory"><div className="admin-panel-head"><div><h3>User directory</h3><p>Search accounts, review onboarding and control platform roles and access.</p></div><button className="icon-btn" onClick={()=>setReloadKey(key=>key+1)} aria-label="Refresh user directory"><RefreshCw size={16}/></button></div><form className="admin-search" onSubmit={e=>{e.preventDefault();setUsers([]);setUsersPage(1);setUserSearch(userSearchDraft.trim());}}><Search size={17}/><input value={userSearchDraft} onChange={e=>setUserSearchDraft(e.target.value)} placeholder="Search all accounts by email or name"/><button className="admin-action-btn" type="submit">Search</button></form>{user.role!=="super_admin"&&<p className="health-note"><ShieldCheck size={16}/> Role changes and account suspension are restricted to super-admins.</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Member</th><th>Joined</th><th>Last active</th><th>Role</th><th>Status</th><th>Access</th></tr></thead><tbody>{filteredUsers.map(member=><tr key={member.id}><td><b>{member.displayName||"Sabily member"}</b><small>{member.email}</small><small>{member.city||"City not set"} · {member.onboardingComplete?"Onboarding complete":"Onboarding pending"}</small></td><td>{new Date(member.createdAt).toLocaleDateString()}</td><td>{member.lastSignInAt?new Date(member.lastSignInAt).toLocaleDateString():"Never"}</td><td><select aria-label={`Role for ${member.email}`} value={member.role} disabled={user.role!=="super_admin"||member.isSelf||working===member.id} onChange={e=>void changeRole(member,e.target.value as SabilyRole)}>{["member","creator","moderator","admin","super_admin"].map(role=><option key={role} value={role}>{role.replace("_"," ")}</option>)}</select></td><td><span className={member.bannedUntil?"admin-status suspended":"admin-status active"}>{member.bannedUntil?"Suspended":"Active"}</span></td><td><button className="admin-action-btn" disabled={user.role!=="super_admin"||member.isSelf||working===member.id} onClick={()=>void changeStatus(member)}>{member.bannedUntil?<><Check size={14}/> Restore</>:<><Ban size={14}/> Suspend</>}</button></td></tr>)}{!filteredUsers.length&&!resourceLoading&&<tr><td colSpan={6} className="admin-empty">No accounts match this search.</td></tr>}</tbody></table></div>{usersHasMore&&<button className="admin-action-btn" disabled={resourceLoading} onClick={()=>setUsersPage(page=>page+1)}>Load more accounts</button>}<p className="health-note"><AlertTriangle size={16}/> Showing {filteredUsers.length}{usersTotal!==null?" of "+usersTotal:" on page "+usersPage}. Changes are applied through the protected admin function and written to the audit log. Your own super-admin access cannot be removed here.</p></section>}
      {page==="Module configuration"&&<section className="panel"><h3>Module registry</h3><p>Only verified modules are enabled by default. Availability changes are applied server-side and audited.</p><div className="module-config-list">{modules.map(module=><div className="module-config-row" key={module.key}><div><b>{module.description||module.key}</b><small>{String(module.value?.readiness||"readiness not set").replaceAll("_"," ")}</small></div><span className={module.value?.enabled?"admin-status active":"admin-status suspended"}>{module.value?.enabled?"Enabled":"Disabled"}</span><button className="admin-action-btn" disabled={user.role!=="super_admin"||working===module.key} onClick={()=>void toggleModule(module)}>{module.value?.enabled?"Disable":"Enable"}</button></div>)}</div>{user.role!=="super_admin"&&<p className="health-note">Only a super-admin can change module availability.</p>}</section>}
      {page==="Integrations"&&<section className="panel"><div className="admin-panel-head"><div><h3>Integration health</h3><p>Secret values are never returned to this interface or stored in module settings.</p></div><PlugZap size={21}/></div><div className="integration-grid">{integrations.map(item=><article className="integration-card" key={item.id}><div><span className={item.configured?"integration-dot ready":"integration-dot missing"}/><h4>{item.label}</h4></div><p>{item.configured?"Server secret is configured":"Server secret is not configured"}</p><small>{item.secretsEditableHere?"Managed here":"Manage credentials in Supabase Edge Function secrets"}</small></article>)}</div><a className="dashboard-link" href="https://supabase.com/dashboard/project/vkjtievnxxiuoiptzxii/functions/secrets" target="_blank" rel="noreferrer">Open Supabase function secrets <ChevronRight size={15}/></a></section>}
      {page==="Security controls"&&<div className="admin-security-grid"><section className="panel"><ShieldCheck size={23}/><h3>Privileged actions</h3><p>Admin operations require a valid Supabase session and are checked against server-side roles in the JWT-protected Edge Function.</p><span className="admin-status active">JWT verification enabled</span></section><section className="panel"><KeyRound size={23}/><h3>Leaked-password protection</h3><p>Supabase Auth currently reports this control as needing attention. Enable leaked-password checks in Auth security settings before production signups.</p><a className="dashboard-link" href="https://supabase.com/dashboard/project/vkjtievnxxiuoiptzxii/auth/policies" target="_blank" rel="noreferrer">Open Supabase Auth security <ChevronRight size={15}/></a></section><section className="panel"><Ban size={23}/><h3>Account access</h3><p>Super-admins can suspend or restore member sign-in from People &amp; roles. Each change is recorded in the admin audit log.</p><button className="btn btn-primary" onClick={()=>setPage("People & roles")}>Manage accounts</button></section><section className="panel"><Activity size={23}/><h3>Audit trail</h3><p>Role, module, account and moderation changes record the acting user, target and outcome.</p><button className="btn btn-primary" disabled={user.role!=="super_admin"} onClick={()=>setPage("Audit log")}>Review audit log</button></section></div>}
      {page==="Moderation"&&<section className="panel"><div className="admin-panel-head"><div><h3>Community report queue</h3><p>Reports are private to moderators. Review context, then keep, hide or remove reported content.</p></div><button className="icon-btn" aria-label="Refresh report queue" onClick={()=>setPage("Moderation")}><RefreshCw size={16}/></button></div><div className="moderation-queue">{reports.map(report=><article className="report-card" key={report.id}><div className="report-card-head"><span className="admin-status">{report.status}</span><small>{new Date(report.created_at).toLocaleString()}</small></div><p className="report-target"><b>{report.author}</b> · {report.target_type.replace("community_","")} · {report.reason}</p><blockquote>{report.content}</blockquote>{report.details&&<p className="report-details">Reporter note: {report.details}</p>}<small>Report {report.id}</small><div className="report-actions">{report.status!=="reviewing"&&<button className="admin-action-btn" disabled={working===report.id} onClick={()=>void resolveReport(report,"reviewing")}>Start review</button>}<button className="admin-action-btn" disabled={working===report.id} onClick={()=>void resolveReport(report,"resolved")}>Keep content · resolve</button><button className="admin-action-btn danger" disabled={working===report.id} onClick={async()=>{const action=report.target_type==="community_post"?"moderate_post":"moderate_comment",payload=report.target_type==="community_post"?{postId:report.target_id,status:"hidden"}:{commentId:report.target_id,status:"hidden"};try{await adminAction(action,payload);await resolveReport(report,"resolved");}catch(error){setMessage(error instanceof Error?error.message:"Could not hide reported content.");}}}>Hide content &amp; resolve</button></div></article>)}{!reports.length&&!resourceLoading&&<div className="admin-empty">No member reports. The queue is clear.</div>}</div></section>}
      {page==="Audit log"&&<section className="panel"><div className="admin-panel-head"><div><h3>Security audit log</h3><p>Most recent privileged account, module and moderation changes.</p></div><ShieldCheck size={22}/></div>{user.role!=="super_admin"?<p className="health-note">Audit records are visible only to super-admins.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>{audit.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString()}</td><td>{row.actor_id===user.id?"You":row.actor_id||"System"}</td><td>{row.action}</td><td>{row.entity_type} · {row.entity_id||"—"}</td><td><code>{JSON.stringify(row.details)}</code></td></tr>)}{!audit.length&&<tr><td colSpan={5} className="admin-empty">No privileged changes recorded yet.</td></tr>}</tbody></table></div>}</section>}
      {(page==="AI studio"||page==="Content studio")&&<section className="panel studio-panel"><h3>Create a draft</h3><p>AI-assisted content is saved for human review, not published automatically.</p><label>Title</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Draft title"/><label>Prompt / instructions</label><textarea rows={7} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe what you want to create…"/><button className="btn btn-primary" onClick={generate}>Generate draft</button>{output&&<pre className="generated-output">{output}</pre>}</section>}
      {!["Overview","People & roles","Module configuration","Integrations","Security controls","Moderation","Audit log","AI studio","Content studio"].includes(page)&&<section className="panel"><h3>{page} workspace</h3><p>This section is not connected to a live service yet, so it is read-only.</p></section>}
      </div><footer className="app-footer"><span>© 2026 Sabily</span><span>Small good deeds. Lasting impact.</span></footer>
    </main>
  </div>;
}
