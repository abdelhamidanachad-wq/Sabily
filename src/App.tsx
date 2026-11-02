import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Home, BookOpen, Clock3, Compass, Users, UserCircle2, LogOut, Plus,
  Send, MapPin, MoonStar, Sun, Globe2, Heart, MessageCircle, ShieldCheck,
  Search, ChevronLeft, ChevronRight, RefreshCw, X, Sparkles, Menu,
  Activity, BookHeart, CalendarDays, Wallet, HandHeart, Target, Bell, GraduationCap, Brain, Film, ShieldAlert, Award, LayoutDashboard, Settings2, Cpu, Ellipsis, Radio
} from "lucide-react";
import { supabase, supabaseReady, getSabilyRole, type SabilyRole } from "./supabase";
import AdminWorkspace from "./AdminWorkspace";
import GlassModule from "./GlassModule";
import { NotificationCentre, AdSlot } from "./ExperienceLayer";
import EventsModule, { EventsPreview } from "./EventsModule";

type Profile = {
  user_id: string; display_name: string | null; username: string | null; bio: string | null;
  country_code: string | null; locale: string; city: string; onboarding_complete: boolean; interests?: string[] | null;
};
type Community = {
  id: string; name: string; slug: string; description: string; category: string;
  country_code: string | null; created_by: string; created_at: string;
};
type Post = { id: string; community_id: string; author_id: string; author_name: string; body: string; created_at: string };
type Comment = { id: string; post_id: string; author_id: string; author_name: string; body: string; created_at: string };

const countries: Record<string,string> = {
  MA:"Morocco", SA:"Saudi Arabia", EG:"Egypt", ID:"Indonesia", TR:"Turkey", PK:"Pakistan",
  GB:"United Kingdom", FR:"France", US:"United States", AE:"United Arab Emirates",
  DZ:"Algeria", TN:"Tunisia", NG:"Nigeria", MY:"Malaysia", QA:"Qatar", KW:"Kuwait",
  JO:"Jordan", IQ:"Iraq", DE:"Germany", CA:"Canada"
};
const countryOptions = Object.entries(countries);
const nav = [
  { id:"Home", label:"Home", icon:Home },
  { id:"Worship", label:"Worship", icon:MoonStar },
  { id:"Quran", label:"Quran", icon:BookOpen },
  { id:"Tajweed", label:"Tajweed", icon:GraduationCap },
  { id:"Hadith", label:"Hadith Nawawi", icon:BookHeart },
  { id:"Tasbih", label:"Tasbih", icon:Activity },
  { id:"Azkar", label:"Azkar", icon:MoonStar },
  { id:"Noor Compute", label:"Noor Compute", icon:Cpu },
  { id:"Communities", label:"Communities", icon:Users },
  { id:"Events", label:"Events & gatherings", icon:CalendarDays },
  { id:"Live Worship", label:"Live worship", icon:Radio },
  { id:"Live Jumu'ah", label:"Live Jumu'ah", icon:Radio },
  { id:"Live Taraweeh", label:"Live Taraweeh", icon:MoonStar },
  { id:"AI Companion", label:"AI Companion", icon:Sparkles },
  { id:"Noor Wallet", label:"Noor rewards", icon:Wallet },
  { id:"Sadaqa", label:"Sadaqa", icon:HandHeart },
  { id:"Growth", label:"Growth planner", icon:Target },
  { id:"Calendar", label:"Islamic calendar", icon:CalendarDays },
  { id:"Reminders", label:"Reminders", icon:Bell },
  { id:"Qibla", label:"Qibla", icon:Compass },
  { id:"Content Centre", label:"Content centre", icon:Film },
  { id:"Share Studio", label:"Share cards", icon:Sparkles },
  { id:"Knowledge", label:"Islamic knowledge", icon:BookOpen },
  { id:"Quizzes", label:"Quizzes & games", icon:Brain },
  { id:"Digital Wellbeing", label:"Digital wellbeing", icon:Heart },
  { id:"Members", label:"Member levels", icon:Award },
  { id:"Mini Apps", label:"Mini apps", icon:LayoutDashboard },
  { id:"Moderation", label:"Moderation", icon:ShieldAlert },
  { id:"Content Studio", label:"AI content studio", icon:Sparkles },
  { id:"Admin Studio", label:"Admin studio", icon:Settings2 },
  { id:"Personalize", label:"Personalize", icon:Settings2 },
  { id:"Profile", label:"Profile", icon:UserCircle2 }
];
const mobileNav = [
  { id:"Home", label:"Home", icon:Home },
  { id:"Quran", label:"Quran", icon:BookOpen },
  { id:"Prayer", label:"Prayer", icon:Clock3 },
  { id:"Azkar", label:"Azkar", icon:MoonStar },
  { id:"Mini Apps", label:"More", icon:Ellipsis }
];
const navGroups=[
 {label:"TODAY",ids:["Home","Prayer","Worship","Azkar","Tasbih","Qibla","Calendar","Reminders"]},
 {label:"GATHER",ids:["Events","Live Worship","Live Jumu'ah","Live Taraweeh"]},
 {label:"READ & LEARN",ids:["Quran","Tajweed","Hadith","Knowledge","Quizzes"]},
 {label:"COMMUNITY",ids:["Communities","Members","Content Centre","Share Studio"]},
 {label:"TOOLS",ids:["AI Companion","Noor Compute","Noor Wallet","Sadaqa","Growth","Digital Wellbeing","Mini Apps"]},
 {label:"MANAGE",ids:["Moderation","Content Studio","Admin Studio"]},
 {label:"ACCOUNT",ids:["Personalize","Profile"]}
];
const specialPagePaths:Record<string,string>={Worship:"/app/worship",Azkar:"/app/worship/azkar",Tasbih:"/app/worship/tasbih",Calendar:"/app/worship/calendar",Reminders:"/app/worship/reminders",Qibla:"/app/worship/qibla",Events:"/app/events","Live Worship":"/app/live","Live Jumu'ah":"/app/live/jummah","Live Taraweeh":"/app/live/taraweeh",Tajweed:"/app/learn/tajweed",Hadith:"/app/learn/hadith",Knowledge:"/app/learn/knowledge",Quizzes:"/app/learn/quizzes","AI Companion":"/app/tools/ai","Noor Compute":"/app/tools/compute","Noor Wallet":"/app/tools/wallet",Sadaqa:"/app/tools/sadaqa",Growth:"/app/tools/growth","Digital Wellbeing":"/app/tools/wellbeing","Share Studio":"/app/tools/share",Explore:"/app/tools/explore","Mini Apps":"/app/tools/explore","Content Centre":"/app/content","Content Studio":"/app/content/studio","Admin Studio":"/app/admin-studio",Moderation:"/app/moderation",Admin:"/admin/overview"};
const modulePageKeys:Record<string,string>={Quran:"module.quran",Prayer:"module.prayer",Worship:"module.prayer",Qibla:"module.qibla",Communities:"module.communities",Azkar:"module.azkar",Tasbih:"module.azkar","AI Companion":"module.ai",Reminders:"module.reminders","Noor Wallet":"module.wallet",Events:"module.events","Live Worship":"module.live","Live Jumu'ah":"module.live","Live Taraweeh":"module.live"};
function routeForPage(page:string){return specialPagePaths[page]||"/app/"+page.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");}
function pageForRoute(path:string){if(path.startsWith("/admin"))return "Admin";const known=[...nav.map(item=>item.id),"Explore"];return known.find(page=>routeForPage(page)===path)||"Home";}
function initialPublicRoute():"landing"|"signin"|"signup"{if(typeof window==="undefined")return "landing";if(window.location.pathname==="/sign-in"||window.location.pathname.startsWith("/app/")||window.location.pathname.startsWith("/admin"))return "signin";if(window.location.pathname==="/sign-up")return "signup";return "landing";}
const prayerNames = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];
const prayerMethodLabels:Record<number,string>={1:"Karachi",2:"ISNA",3:"Muslim World League",4:"Umm al-Qura (Makkah)",5:"Egyptian Survey",21:"Morocco"};

function Brand() {
  return <div className="brand-lockup"><div className="brand-mark">S</div><div><strong>sabily</strong><small>A BETTER PATH, TOGETHER</small></div></div>;
}
function hijriDate() {
  try { return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day:"numeric", month:"long", year:"numeric" }).format(new Date()); }
  catch { return new Intl.DateTimeFormat("en-u-ca-islamic", { day:"numeric", month:"long", year:"numeric" }).format(new Date()); }
}
function qiblaFrom(lat:number, lon:number) {
  const kaabaLat = 21.4225 * Math.PI / 180, kaabaLon = 39.8262 * Math.PI / 180;
  const phi = lat * Math.PI / 180, delta = kaabaLon - lon * Math.PI / 180;
  const y = Math.sin(delta), x = Math.cos(phi) * Math.tan(kaabaLat) - Math.sin(phi) * Math.cos(delta);
  return (Math.atan2(y,x) * 180 / Math.PI + 360) % 360;
}
function PublicLanding({ onSignIn, onSignUp }: { onSignIn:()=>void; onSignUp:()=>void }) {
  const features = [
    { icon:BookOpen, title:"Qur’an & learning", body:"Read the Qur’an and build a steady habit of learning, reflection and discovery." },
    { icon:Clock3, title:"Prayer & daily rhythm", body:"Keep prayer times and meaningful daily practices close at hand." },
    { icon:Compass, title:"Qibla direction", body:"Find the direction of the Kaaba with your device location, only when you allow it." },
    { icon:Users, title:"Communities", body:"Meet people around shared interests, exchange encouragement and learn together." },
    { icon:Heart, title:"Good deeds & growth", body:"Make space for personal growth, service and small actions that matter." },
    { icon:ShieldCheck, title:"A thoughtful space", body:"A calmer digital experience built around faith, care and responsible community." }
  ];
  return <div className="public-home">
    <header className="public-nav"><Brand/><nav><a href="#features">Features</a><a href="#about">Our approach</a></nav><div className="public-nav-actions"><button className="public-text-btn" onClick={onSignIn}>Sign in</button><button className="primary-btn" onClick={onSignUp}>Create account <ChevronRight size={16}/></button></div></header>
    <main>
      <section className="public-hero">
        <div className="public-hero-copy"><span className="eyebrow">ONE COMMUNITY. MANY PATHS TO GOOD.</span><h1>A better path,<br/><em>together.</em></h1><p>Faith, learning, personal growth and meaningful action — brought together in one welcoming space for Muslims everywhere.</p><div className="public-hero-actions"><button className="primary-btn" onClick={onSignUp}>Start your journey <ChevronRight size={17}/></button><button className="secondary-btn" onClick={onSignIn}>I already have an account</button></div><div className="public-verse">“And whoever does an atom's weight of good will see it.”<small>Qur'an 99:7 · Translation wording may vary</small></div></div>
        <div className="public-hero-art"><div className="public-orbit orbit-one"></div><div className="public-orbit orbit-two"></div><div className="public-emblem"><div className="brand-mark">S</div><strong>sabily</strong><small>A BETTER PATH, TOGETHER</small></div><div className="floating-note note-top"><MoonStar size={17}/> Faith & reflection</div><div className="floating-note note-bottom"><Heart size={17}/> Good deeds, every day</div></div>
      </section>
      <section className="public-proof"><div><strong>One space</strong><span>for faith and everyday life</span></div><div><strong>Learn together</strong><span>at your own pace</span></div><div><strong>Grow with purpose</strong><span>one good step at a time</span></div></section>
      <section className="public-features" id="features"><div className="public-section-head"><span className="eyebrow">WHAT YOU CAN DO</span><h2>Tools for a more intentional day.</h2><p>Start with the essentials and grow into a richer journey as Sabily evolves.</p></div><div className="public-feature-grid">{features.map(({icon:Icon,title,body})=><article className="public-feature-card" key={title}><div className="public-feature-icon"><Icon size={21}/></div><h3>{title}</h3><p>{body}</p></article>)}</div></section>
      <section className="public-approach" id="about"><div><span className="eyebrow">OUR APPROACH</span><h2>Technology should support what matters.</h2></div><p>Sabily is designed to encourage learning, worship, connection and service — without turning your attention into a commodity. We aim for a calmer, more useful digital space, with care for sources, privacy and people.</p></section>
      <section className="public-cta"><div><span className="eyebrow">YOUR NEXT GOOD STEP</span><h2>Begin your journey with Sabily.</h2><p>Create an account and make this space your own.</p></div><button className="primary-btn" onClick={onSignUp}>Create your free account <ChevronRight size={17}/></button></section>
    </main>
    <footer className="public-footer"><Brand/><span>Built with care. Shared for the sake of good.</span><button className="public-text-btn" onClick={onSignIn}>Sign in</button></footer>
  </div>;
}

function Login({ initialSignup=false, onBack, onSignedIn }: { initialSignup?:boolean; onBack:()=>void; onSignedIn:(id:string,email:string)=>void }) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [signup,setSignup]=useState(initialSignup); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function authenticate(nextEmail:string,nextPassword:string,createIfMissing=false) {
    if (!supabase) throw new Error("Sabily is waiting for its Supabase connection. Please check the deployment configuration.");
    let result=await supabase.auth.signInWithPassword({email:nextEmail,password:nextPassword});
    if (result.error && createIfMissing && /invalid login credentials/i.test(result.error.message)) {
      const created=await supabase.auth.signUp({email:nextEmail,password:nextPassword,options:{data:{full_name:"Sabily Demo"}}});
      if (created.error) throw created.error;
      if (created.data.user && created.data.session) return {user:created.data.user,session:created.data.session};
      throw new Error("Demo account created. Confirm demo@sabily.io by email, then use Demo access again. If confirmation is enabled, configure Supabase email settings first.");
    }
    if (result.error) throw result.error;
    if (!result.data.user || !result.data.session) throw new Error("Account created. If email confirmation is disabled in Supabase, you can sign in immediately.");
    return result.data;
  }
  async function submit(e:FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (!supabase) throw new Error("Sabily is waiting for its Supabase connection. Please check the deployment configuration.");
      if (signup) {
        const result=await supabase.auth.signUp({email,password,options:{data:{full_name:email.split("@")[0]}}});
        if (result.error) throw result.error;
        if (result.data.user && result.data.session) onSignedIn(result.data.user.id,result.data.user.email||email);
        else setError("Account created. If email confirmation is disabled in Supabase, you can sign in immediately. The admin account receives its role automatically when abdel@sabily.io signs up.");
      } else {
        const result=await authenticate(email,password);
        onSignedIn(result.user.id,result.user.email||email);
      }
    } catch(err) { setError(err instanceof Error?err.message:"Sign-in failed. Please try again."); }
    finally { setBusy(false); }
  }
  async function useDemo() {
    setBusy(true);setError("");
    try {
      const result=await authenticate("demo@sabily.io","Demo1234",true);
      onSignedIn(result.user.id,result.user.email||"demo@sabily.io");
    } catch(err) { setError(err instanceof Error?err.message:"Demo sign-in failed."); }
    finally { setBusy(false); }
  }
  return <div className="auth-page">
    <div className="auth-visual"><button className="auth-back" onClick={onBack}><ChevronLeft size={16}/> Back to Sabily</button><Brand/><div className="auth-hero"><span className="eyebrow">ONE COMMUNITY · MANY PATHS TO GOOD</span><h1>A better path,<br/><em>together.</em></h1><p>Faith, learning, community and meaningful action — in one welcoming space for Muslims everywhere.</p><div className="auth-verse">“So whoever does an atom's weight of good will see it.”<small>Qur'an 99:7 · Translation wording may vary</small></div></div><small className="auth-foot">Built with care. Shared for the sake of good.</small></div>
    <div className="auth-form-wrap"><form className="auth-card" onSubmit={submit}><span className="eyebrow">WELCOME TO SABILY</span><h2>{signup?"Create your account":"Sign in to Sabily"}</h2><p>{signup?"Join a global community built around faith, growth and service.":"Continue your journey and help shape the community."}</p><label>Login email (no mailbox needed for this beta)</label><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>{!signup&&email.trim().toLowerCase()==="abdel@sabily.io"&&<div className="auth-help-note">First-time owner setup? Choose “Create an account” below. The server will assign the super-admin role to this exact email.</div>}<label>Password</label><input type="password" required minLength={6} autoComplete={signup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/><button className="primary-btn full-btn" disabled={busy}>{busy?"Please wait…":signup?"Create account":"Sign in"}</button>{error&&<div className="notice error">{error}</div>}{!signup&&<button type="button" className="demo-access-btn" onClick={useDemo} disabled={busy}>Try the demo account <ChevronRight size={15}/></button>}<p className="auth-switch">{signup?"Already a member?":"New to Sabily?"} <button type="button" className="link-btn" onClick={()=>{setSignup(!signup);setError("");}}>{signup?"Sign in":"Create an account"}</button></p><div className="auth-trust"><ShieldCheck size={15}/> Your account and community activity are protected by Supabase authentication and database policies.</div></form></div>
  </div>;
}

export default function App() {
  const [user,setUser]=useState<{id:string;email:string;role:SabilyRole}|null>(null);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [page,setPage]=useState(()=>typeof window==="undefined"?"Home":pageForRoute(window.location.pathname));
  const [publicScreen,setPublicScreen]=useState<"landing"|"signin"|"signup">(initialPublicRoute);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState("");
  const [communities,setCommunities]=useState<Community[]>([]);
  const [memberships,setMemberships]=useState<string[]>([]);
  const [selectedCommunity,setSelectedCommunity]=useState<Community|null>(null);
  const [posts,setPosts]=useState<Post[]>([]);
  const [comments,setComments]=useState<Comment[]>([]);
  const [postDraft,setPostDraft]=useState("");
  const [commentDraft,setCommentDraft]=useState<Record<string,string>>({});
  const [search,setSearch]=useState("");
  const [showCreate,setShowCreate]=useState(false);
  const [showMobileMore,setShowMobileMore]=useState(false);
  const [newName,setNewName]=useState("");
  const [newDescription,setNewDescription]=useState("");
  const [newCategory,setNewCategory]=useState("Quran & learning");
  const [prayerTimes,setPrayerTimes]=useState<Record<string,string>|null>(null);
  const [prayerDate,setPrayerDate]=useState("");
  const [prayerError,setPrayerError]=useState("");
  const [prayerMethod,setPrayerMethod]=useState(21);
  const [prayerTimezone,setPrayerTimezone]=useState("");
  const [prayerFetchedDay,setPrayerFetchedDay]=useState("");
  const [clockNow,setClockNow]=useState(()=>Date.now());
  const [coords,setCoords]=useState<{lat:number;lon:number}|null>(null);
  const [qibla,setQibla]=useState<number|null>(null);
  const [compassHeading,setCompassHeading]=useState<number|null>(null);
  const [compassStatus,setCompassStatus]=useState("");
  const orientationListener=useRef<((event:Event)=>void)|null>(null);
  const [surahs,setSurahs]=useState<any[]>([]);
  const [surahNo,setSurahNo]=useState(1);
  const [verses,setVerses]=useState<any[]>([]);
  const [quranBusy,setQuranBusy]=useState(false);
  const [translationEnabled,setTranslationEnabled]=useState(false);
  const [translationVerses,setTranslationVerses]=useState<any[]>([]);
  const [translationBusy,setTranslationBusy]=useState(false);
  const [translationError,setTranslationError]=useState("");
  const [quranFontSize,setQuranFontSize]=useState(30);
  const [profileName,setProfileName]=useState("");
  const [profileCity,setProfileCity]=useState("Casablanca");
  const [profileCountry,setProfileCountry]=useState("MA");
  const [profileLocale,setProfileLocale]=useState("en");
  const [profileBio,setProfileBio]=useState("");
  const [selectedInterests,setSelectedInterests]=useState<string[]>([]);
  const [mainGoal,setMainGoal]=useState("Build a consistent worship routine");
  const [dailyMinutes,setDailyMinutes]=useState("15");
  const [theme,setTheme]=useState("sand");
  const [homeWidgets,setHomeWidgets]=useState<string[]>(["prayer","quick","toolkit","events","goodness"]);
  const [moduleSettings,setModuleSettings]=useState<Record<string,{enabled:boolean;readiness?:string}>>({});
  const interestOptions=["Qur’an reading","Tajweed","Prayer consistency","Hadith & Seerah","Islamic knowledge","Personal growth","Community","Charity & volunteering","Family learning"];

  const showToast=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),3500);};

  useEffect(()=>{
    const syncRoute=()=>{
      const path=window.location.pathname;
      if(path==="/sign-in"){setPage("Home");setPublicScreen("signin");return;}
      if(path==="/sign-up"){setPage("Home");setPublicScreen("signup");return;}
      if(path==="/"){setPage("Home");setPublicScreen("landing");return;}
      setPage(pageForRoute(path));
    };
    window.addEventListener("popstate",syncRoute);
    return()=>window.removeEventListener("popstate",syncRoute);
  },[]);
  useEffect(()=>{
    const target=!user?(publicScreen==="signin"?"/sign-in":publicScreen==="signup"?"/sign-up":"/"):!profile?.onboarding_complete?"/onboarding":page==="Admin"&&window.location.pathname.startsWith("/admin/")?window.location.pathname:routeForPage(page);
    if(window.location.pathname!==target)window.history.pushState({},"",target);
  },[page,publicScreen,user?.id,profile?.onboarding_complete]);

  const hydrate = useCallback(async (id:string,email:string) => {
    if (!supabase) return;
    const {data:roleRow}=await supabase.from("sabily_user_roles").select("role").eq("user_id",id).maybeSingle();
    const role=(roleRow?.role||"member") as SabilyRole;
    setUser({id,email,role});
    const {data:existing}=await supabase.from("sabily_profiles").select("*").eq("user_id",id).maybeSingle();
    let p=existing as Profile|null;
    if (!p) {
      const {data:created,error}=await supabase.from("sabily_profiles").upsert({
        user_id:id,display_name:email.split("@")[0],country_code:"MA",locale:"en",city:"Casablanca",interests:[],onboarding_complete:false
      },{onConflict:"user_id"}).select("*").single();
      if (error) { showToast("Could not initialise your profile: "+error.message); return; }
      p=created as Profile;
    }
    setProfile(p);
    setProfileName(p.display_name||email.split("@")[0]); setProfileCity(p.city||"Casablanca");
    setProfileCountry(p.country_code||"MA"); setProfileLocale("en"); setProfileBio(p.bio||"");
    setSelectedInterests(Array.isArray(p.interests)?p.interests:[]);
    try { const {data:authData}=await supabase.auth.getUser(); const meta=authData.user?.user_metadata||{}; const saved=JSON.parse(localStorage.getItem("sabily-ui-"+id)||"{}"); const prefs=meta.sabily_preferences||{}; if(saved.theme||prefs.theme)setTheme(saved.theme||prefs.theme); if(Array.isArray(saved.homeWidgets)||Array.isArray(prefs.homeWidgets))setHomeWidgets(saved.homeWidgets||prefs.homeWidgets); if(saved.goal||meta.sabily_goal)setMainGoal(saved.goal||meta.sabily_goal); if(saved.minutes||meta.sabily_daily_minutes)setDailyMinutes(saved.minutes||String(meta.sabily_daily_minutes)); } catch {}
    setLoading(false);
  },[]);

  useEffect(()=>{
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({data})=>{
      const u=data.session?.user;
      if (u) await hydrate(u.id,u.email||"");
      else setLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if (event==="SIGNED_OUT" || !session) { setUser(null);setProfile(null);setLoading(false); }
    });
    return ()=>subscription.unsubscribe();
  },[hydrate]);

  useEffect(()=>{
    if(!supabase||!user)return;
    const db=supabase;let active=true;
    void (async()=>{const {data,error}=await db.from("sabily_app_settings").select("key,value").like("key","module.%");if(!error&&active)setModuleSettings(Object.fromEntries((data||[]).map((row:any)=>[row.key,row.value])));})();
    return()=>{active=false};
  },[user?.id]);

  const loadPrayer = useCallback(async (p:Profile|null) => {
    if (!p) return;
    setPrayerError("");
    const country=countries[p.country_code||"MA"]||"Morocco";
    const city=p.city||"Casablanca";
    try {
      const url="https://api.aladhan.com/v1/timingsByCity?city="+encodeURIComponent(city)+"&country="+encodeURIComponent(country)+"&method="+prayerMethod;
      const response=await fetch(url); const json=await response.json();
      if (json.code!==200) throw new Error(json.status||"Prayer times unavailable");
      const timezone=json.data.meta?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
      setPrayerTimes(json.data.timings); setPrayerTimezone(timezone); setPrayerFetchedDay(new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())); setPrayerDate(json.data.date.readable+" · "+json.data.date.hijri.date+" · "+(prayerMethodLabels[prayerMethod]||"Custom method"));
    } catch { setPrayerError("Prayer times could not be loaded. Check your connection or update your city in Profile."); }
  },[prayerMethod]);

  useEffect(()=>{ if(profile) loadPrayer(profile); },[profile,loadPrayer]);
  const prayerLocalDay=useMemo(()=>new Intl.DateTimeFormat("en-CA",{timeZone:prayerTimezone||Intl.DateTimeFormat().resolvedOptions().timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(clockNow)),[prayerTimezone,clockNow]);
  useEffect(()=>{if(profile&&prayerFetchedDay&&prayerLocalDay!==prayerFetchedDay)void loadPrayer(profile);},[profile,prayerFetchedDay,prayerLocalDay,loadPrayer]);
  useEffect(()=>{if(!user||!profile)return;const saved=localStorage.getItem("sabily-prayer-method-"+user.id);const method=saved?Number(saved):profile.country_code==="MA"?21:3;if(Number.isFinite(method))setPrayerMethod(method);},[user?.id,profile?.country_code]);
  useEffect(()=>{const timer=window.setInterval(()=>setClockNow(Date.now()),30000);return()=>window.clearInterval(timer);},[]);

  const loadCommunities=useCallback(async ()=>{
    if(!supabase||!user)return;
    const [{data:groups,error},{data:members}] = await Promise.all([
      supabase.from("sabily_communities").select("*").eq("visibility","public").order("created_at",{ascending:false}),
      supabase.from("sabily_community_members").select("community_id").eq("user_id",user.id).eq("status","active")
    ]);
    if(error){showToast(error.message);return;}
    setCommunities((groups||[]) as Community[]);
    setMemberships((members||[]).map((m:any)=>m.community_id));
  },[user]);

  const loadPosts=useCallback(async (group:Community)=>{
    if(!supabase)return;
    const {data,error}=await supabase.from("sabily_community_posts").select("*").eq("community_id",group.id).order("created_at",{ascending:false}).limit(40);
    if(error){showToast(error.message);return;}
    const items=(data||[]) as Post[]; setPosts(items);
    if(items.length){
      const {data:cs}=await supabase.from("sabily_community_comments").select("*").in("post_id",items.map(p=>p.id)).order("created_at",{ascending:true});
      setComments((cs||[]) as Comment[]);
    } else setComments([]);
  },[]);

  useEffect(()=>{if(user&&page==="Communities")loadCommunities();},[user,page,loadCommunities]);
  useEffect(()=>{if(selectedCommunity&&page==="Communities")loadPosts(selectedCommunity);},[selectedCommunity,page,loadPosts]);

  useEffect(()=>{
    if(page!=="Quran"||surahs.length)return;
    setQuranBusy(true);
    fetch("https://api.alquran.cloud/v1/surah").then(r=>r.json()).then(j=>setSurahs(j.data||[])).catch(()=>showToast("Quran index could not be loaded.")).finally(()=>setQuranBusy(false));
  },[page,surahs.length]);

  useEffect(()=>{
    if(page!=="Quran")return;
    setQuranBusy(true);
    fetch("https://api.alquran.cloud/v1/surah/"+surahNo+"/quran-uthmani").then(r=>r.json()).then(j=>{if(j.code!==200)throw new Error("Qur’an text unavailable");setVerses(j.data?.ayahs||[]);}).catch(()=>showToast("This surah could not be loaded.")).finally(()=>setQuranBusy(false));
  },[page,surahNo]);
  useEffect(()=>{
    if(!user)return;
    const saved=Number(localStorage.getItem("sabily-quran-surah-"+user.id));
    if(saved>=1&&saved<=114)setSurahNo(saved);
  },[user?.id]);
  useEffect(()=>{if(user)localStorage.setItem("sabily-quran-surah-"+user.id,String(surahNo));},[user?.id,surahNo]);
  useEffect(()=>{
    if(page!=="Quran"||!translationEnabled)return;
    let active=true;setTranslationBusy(true);setTranslationError("");
    fetch("https://api.alquran.cloud/v1/surah/"+surahNo+"/en.sahih").then(r=>r.json()).then(j=>{if(j.code!==200)throw new Error("Translation unavailable");if(active)setTranslationVerses(j.data?.ayahs||[]);}).catch(()=>{if(active){setTranslationVerses([]);setTranslationError("The English translation could not be loaded. Arabic text remains available.");}}).finally(()=>{if(active)setTranslationBusy(false);});
    return()=>{active=false};
  },[page,surahNo,translationEnabled]);

  const saveProfile=async(e:FormEvent)=>{
    e.preventDefault(); if(!supabase||!user)return; setBusy(true);
    const patch={user_id:user.id,display_name:profileName.trim(),city:profileCity.trim(),country_code:profileCountry,locale:profileLocale,bio:profileBio.trim(),interests:selectedInterests,onboarding_complete:true};
    const {data,error}=await supabase.from("sabily_profiles").upsert(patch,{onConflict:"user_id"}).select("*").single();
    if(error)showToast(error.message);else{setProfile(data as Profile); await supabase.auth.updateUser({data:{sabily_goal:mainGoal,sabily_daily_minutes:dailyMinutes}}); showToast("Your profile and personal goals have been saved.");}
    setBusy(false);
  };

  const createCommunity=async(e:FormEvent)=>{
    e.preventDefault();if(!supabase||!user||!newName.trim())return;setBusy(true);
    const slug=newName.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+Math.random().toString(36).slice(2,6);
    const {data,error}=await supabase.from("sabily_communities").insert({
      name:newName.trim(),slug,description:newDescription.trim(),category:newCategory,country_code:profile?.country_code||"MA",visibility:"public",created_by:user.id
    }).select("*").single();
    if(error){showToast(error.message);setBusy(false);return;}
    const {error:memberError}=await supabase.from("sabily_community_members").insert({community_id:data.id,user_id:user.id,role:"owner",status:"active"});
    if(memberError)showToast("Community created, but owner membership needs attention: "+memberError.message);
    setShowCreate(false);setNewName("");setNewDescription("");await loadCommunities();setSelectedCommunity(data as Community);showToast("Your community is live.");setBusy(false);
  };

  const joinCommunity=async(group:Community)=>{
    if(!supabase||!user)return;setBusy(true);
    const {error}=await supabase.from("sabily_community_members").insert({community_id:group.id,user_id:user.id,role:"member",status:"active"});
    if(error&& !error.message.toLowerCase().includes("duplicate"))showToast(error.message);
    else {setMemberships(old=>old.includes(group.id)?old:[...old,group.id]);setSelectedCommunity(group);showToast("You joined "+group.name+".");}
    setBusy(false);
  };

  const publishPost=async(e:FormEvent)=>{
    e.preventDefault();if(!supabase||!user||!profile||!selectedCommunity||!postDraft.trim())return;setBusy(true);
    const {error}=await supabase.from("sabily_community_posts").insert({
      community_id:selectedCommunity.id,author_id:user.id,author_name:profile.display_name||user.email.split("@")[0],body:postDraft.trim()
    });
    if(error)showToast(error.message);else{setPostDraft("");await loadPosts(selectedCommunity);}
    setBusy(false);
  };

  const publishComment=async(post:Post)=>{
    if(!supabase||!user||!profile)return;const body=(commentDraft[post.id]||"").trim();if(!body)return;
    const {error}=await supabase.from("sabily_community_comments").insert({
      post_id:post.id,author_id:user.id,author_name:profile.display_name||user.email.split("@")[0],body
    });
    if(error)showToast(error.message);else{setCommentDraft(old=>({...old,[post.id]:""}));if(selectedCommunity)await loadPosts(selectedCommunity);}
  };

  const reportCommunityPost=async(post:Post)=>{
    if(!supabase||!user)return;
    const reason=window.prompt("Tell the moderators why this post should be reviewed:","community_guidelines");
    if(!reason)return;
    const {error}=await supabase.from("sabily_reports").insert({reporter_id:user.id,target_type:"community_post",target_id:post.id,reason:"community_guidelines",details:reason.slice(0,1000)});
    showToast(error?"Could not submit report: "+error.message:"Report sent privately to the moderation team.");
  };

  const locate=()=>{
    if(!navigator.geolocation){showToast("Geolocation is not supported on this device.");return;}
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat=pos.coords.latitude,lon=pos.coords.longitude;setCoords({lat,lon});setQibla(qiblaFrom(lat,lon));
    },err=>showToast(err.message||"Location permission was not granted."),{enableHighAccuracy:true,timeout:12000});
  };
  const enableCompass=async()=>{
    if(!("DeviceOrientationEvent" in window)){setCompassStatus("This browser does not provide a device compass. Use the bearing and cardinal directions below.");return;}
    try{
      const Orientation=DeviceOrientationEvent as typeof DeviceOrientationEvent & {requestPermission?:()=>Promise<string>};
      if(Orientation.requestPermission){const permission=await Orientation.requestPermission();if(permission!=="granted"){setCompassStatus("Compass permission was not granted. You can still use the bearing and your map compass.");return;}}
      if(orientationListener.current){window.removeEventListener("deviceorientation",orientationListener.current,true);window.removeEventListener("deviceorientationabsolute",orientationListener.current,true);}
      const handler=(raw:Event)=>{
        const event=raw as DeviceOrientationEvent & {webkitCompassHeading?:number};
        const value=typeof event.webkitCompassHeading==="number"?event.webkitCompassHeading:event.absolute&&typeof event.alpha==="number"?(360-event.alpha+360)%360:null;
        if(value!==null){setCompassHeading(value);setCompassStatus("Compass aligned · rotate your device slowly if the reading drifts.");}
      };
      orientationListener.current=handler;
      window.addEventListener("deviceorientation",handler,true);
      window.addEventListener("deviceorientationabsolute",handler,true);
      setCompassStatus("Waiting for compass heading…");
    }catch{setCompassStatus("Compass access is unavailable. Use the calculated bearing with a physical compass.");}
  };
  useEffect(()=>()=>{if(orientationListener.current){window.removeEventListener("deviceorientation",orientationListener.current,true);window.removeEventListener("deviceorientationabsolute",orientationListener.current,true);}},[]);

  const todayHijri=useMemo(()=>hijriDate(),[]);
  const nextPrayer=useMemo(()=>{
    if(!prayerTimes)return null;
    const zone=prayerTimezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(clockNow));
    const current=Number(parts.find(x=>x.type==="hour")?.value||0)*60+Number(parts.find(x=>x.type==="minute")?.value||0);
    const rows=["Fajr","Dhuhr","Asr","Maghrib","Isha"].map(name=>{const match=(prayerTimes[name]||"").match(/(\d{1,2}):(\d{2})/);return match?{name,time:prayerTimes[name],minute:Number(match[1])*60+Number(match[2])}:null;}).filter(Boolean) as {name:string;time:string;minute:number}[];
    const upcoming=rows.find(row=>row.minute>current);
    if(upcoming)return {...upcoming,minutesLeft:upcoming.minute-current,tomorrow:false};
    const fajr=rows[0];return fajr?{...fajr,minutesLeft:1440-current+fajr.minute,tomorrow:true}:null;
  },[prayerTimes,prayerTimezone,clockNow]);
  const filteredCommunities=communities.filter(c=>(c.name+" "+c.description+" "+c.category).toLowerCase().includes(search.toLowerCase()));
  const isAdmin=user?.role==="admin"||user?.role==="super_admin";
  const isModerator=isAdmin||user?.role==="moderator";
  const isCreator=isAdmin||user?.role==="creator";
  const moduleEnabled=(id:string)=>{const key=modulePageKeys[id];return !key||moduleSettings[key]?.enabled!==false;};
  const visibleNav=nav.filter(item=>moduleEnabled(item.id)&&(item.id!=="Admin Studio"||isAdmin)&&(item.id!=="Content Studio"||isCreator)&&(item.id!=="Moderation"||isModerator));
  const visibleNavGroups=navGroups.map(group=>({...group,items:group.ids.map(id=>visibleNav.find(item=>item.id===id)).filter(Boolean) as typeof nav})).filter(group=>group.items.length>0);
  const direction=profile.locale==="ar"?"rtl":"ltr";
  const savePreferences=async(nextTheme=theme,nextWidgets=homeWidgets)=>{if(!user)return;const payload={theme:nextTheme,homeWidgets:nextWidgets,goal:mainGoal,minutes:dailyMinutes};localStorage.setItem("sabily-ui-"+user.id,JSON.stringify(payload));if(supabase)await supabase.auth.updateUser({data:{sabily_preferences:payload,sabily_goal:mainGoal,sabily_daily_minutes:dailyMinutes}});};
  const toggleWidget=(id:string)=>{const next=homeWidgets.includes(id)?homeWidgets.filter(x=>x!==id):[...homeWidgets,id];setHomeWidgets(next);void savePreferences(theme,next);};
  const moveWidget=(id:string,delta:number)=>{const i=homeWidgets.indexOf(id),j=i+delta;if(i<0||j<0||j>=homeWidgets.length)return;const next=[...homeWidgets];[next[i],next[j]]=[next[j],next[i]];setHomeWidgets(next);void savePreferences(theme,next);};

  if(loading)return <div className="loading-screen"><div className="brand-mark">S</div><span>Preparing your Sabily space…</span></div>;
  if(!user) return publicScreen==="landing"
    ? <PublicLanding onSignIn={()=>setPublicScreen("signin")} onSignUp={()=>setPublicScreen("signup")}/>
    : <Login initialSignup={publicScreen==="signup"} onBack={()=>setPublicScreen("landing")} onSignedIn={(id,email)=>{setLoading(true);hydrate(id,email);}}/>;
  if(!profile)return <div className="loading-screen"><div className="brand-mark">S</div><span>Setting up your profile…</span></div>;
  if(modulePageKeys[page]&&moduleSettings[modulePageKeys[page]]?.enabled===false)return <div className="admin-denied"><div><Settings2 size={32}/><h2>This module is paused</h2><p>{moduleSettings[modulePageKeys[page]]?.readiness?.replaceAll("_"," ")||"A platform administrator has paused this feature."}</p><button className="primary-btn" onClick={()=>setPage("Home")}>Return to Home</button></div></div>;
  if(!profile.onboarding_complete)return <div className="onboarding-screen"><form className="onboarding-card onboarding-diagnostic" onSubmit={saveProfile}><Brand/><span className="eyebrow">LET'S MAKE THIS YOUR SPACE</span><h1>Welcome to Sabily.</h1><p>Set your location and language so prayer times, community discovery and the app experience can be relevant to you.</p><label>Display name</label><input required value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="How should we call you?"/><label>City</label><input required value={profileCity} onChange={e=>setProfileCity(e.target.value)} placeholder="Casablanca"/><label>Country</label><select value={profileCountry} onChange={e=>setProfileCountry(e.target.value)}>{countryOptions.map(([code,name])=><option value={code} key={code}>{name}</option>)}</select><label>What would you like Sabily to help you with?</label><div className="interest-picker">{interestOptions.map(item=><button type="button" key={item} className={selectedInterests.includes(item)?"interest-chip selected":"interest-chip"} onClick={()=>setSelectedInterests(old=>old.includes(item)?old.filter(x=>x!==item):[...old,item])}>{item}</button>)}</div><label>Your main goal</label><select value={mainGoal} onChange={e=>setMainGoal(e.target.value)}><option>Build a consistent worship routine</option><option>Read and understand more Qur’an</option><option>Learn Islamic knowledge step by step</option><option>Improve my recitation</option><option>Connect with a positive community</option><option>Build healthier daily habits</option></select><label>Time you can realistically give each day</label><select value={dailyMinutes} onChange={e=>setDailyMinutes(e.target.value)}><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour or more</option></select><label>App language</label><select value={profileLocale} onChange={e=>setProfileLocale(e.target.value)}><option value="en">English · UI language available</option></select><button className="primary-btn full-btn" disabled={busy}>{busy?"Saving…":"Continue to Sabily"}</button></form></div>;
  if(page==="Admin")return isAdmin?<div className="admin-return"><button className="back-app-btn" onClick={()=>setPage("Home")}><ChevronLeft size={16}/> Back to Sabily</button><AdminWorkspace/></div>:<div className="admin-denied"><div><ShieldCheck size={34}/><h2>Admin access only</h2><p>This account does not have administrator permissions.</p><button className="primary-btn" onClick={()=>setPage("Home")}>Return to Sabily</button></div></div>;

  return <div className="member-app" dir={direction} lang={profile.locale||"en"} data-theme={theme}>
    <aside className="member-sidebar"><Brand/><div className="global-pill"><Globe2 size={15}/> Global Muslim community</div><nav>{visibleNavGroups.map(group=><div className="member-nav-group" key={group.label}><span className="member-nav-group-label">{group.label}</span>{group.items.map(item=><button key={item.id} className={page===item.id?"member-nav active":"member-nav"} onClick={()=>{setPage(item.id);setSelectedCommunity(null);}}><item.icon size={18}/><span>{item.label}</span></button>)}</div>)}</nav><div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{(profile.display_name||"S").slice(0,1).toUpperCase()}</div><div><b>{profile.display_name||user.email.split("@")[0]}</b><small>{countries[profile.country_code||"MA"]||"Global member"}</small></div></div>{isAdmin&&<button className="admin-link" onClick={()=>setPage("Admin")}><ShieldCheck size={16}/> Admin workspace</button>}<button className="signout-link" onClick={async()=>{await supabase?.auth.signOut();}}><LogOut size={16}/> Sign out</button></div></aside>
    <main className="member-main">
      <header className="member-topbar"><div><span className="topbar-kicker">SABILY / {page.toUpperCase()}</span><h2>{page==="Home"?"Assalamu alaykum, "+(profile.display_name||"friend"):page==="Noor Wallet"?"Noor rewards":page}</h2></div><div className="topbar-right"><button className="noor-mini-pill" onClick={()=>setPage("Noor Wallet")}><Sparkles size={14}/> NOOR PREVIEW</button><NotificationCentre userId={user.id} onToast={showToast}/><button className="personalize-top-btn" onClick={()=>setPage("Personalize")} aria-label="Personalize Sabily"><Settings2 size={17}/></button><span className={supabaseReady?"backend-status live":"backend-status"}><i/>{supabaseReady?"Connected":"Offline setup"}</span><div className="avatar small-avatar">{(profile.display_name||"S").slice(0,1).toUpperCase()}</div></div></header>
      <div className="member-content">
        {page==="Home"&&<div className="home-layout">
          <section className="welcome-banner"><div><span className="eyebrow">YOUR DAILY PATH</span><h1>Small steps.<br/><em>Lasting impact.</em></h1><p>A little worship, a little learning, a little good — every day matters.</p><button className="banner-btn" onClick={()=>setPage("Quran")}>Continue your journey <ChevronRight size={16}/></button><button className="banner-customize" onClick={()=>setPage("Personalize")}><Settings2 size={14}/> Make this home yours</button></div><div className="banner-art"><div className="moon-orbit"><MoonStar size={72}/></div><span>إِنَّ مَعَ الْعُسْرِ يُسْرًا</span></div></section>
          {homeWidgets.map(widget=>widget==="prayer"?<section className="home-widget" key="prayer"><div className="section-heading"><div><span className="eyebrow">TODAY</span><h3>Your day at a glance</h3></div><span className="date-chip">{todayHijri}</span></div><section className="prayer-card"><div className="prayer-card-head"><div><Clock3 size={18}/><b>Prayer times</b></div><span><MapPin size={13}/>{profile.city}, {countries[profile.country_code||"MA"]||""}</span></div>{nextPrayer&&<div className="home-next-prayer"><div><small>NEXT PRAYER</small><b>{nextPrayer.name} · {nextPrayer.time}</b></div><strong>{Math.floor(nextPrayer.minutesLeft/60)}h {nextPrayer.minutesLeft%60}m</strong></div>}{prayerTimes?<div className="prayer-grid">{prayerNames.map(n=><div className="prayer-time" key={n}><small>{n}</small><b>{prayerTimes[n]||"—"}</b></div>)}</div>:<div className="prayer-loading">{prayerError||"Loading local prayer times…"}</div>}<div className="prayer-card-foot"><span>{prayerDate||("Calculated local timings · "+(prayerMethodLabels[prayerMethod]||"Custom"))}</span><button onClick={()=>loadPrayer(profile)}><RefreshCw size={14}/> Refresh</button></div></section></section>:widget==="quick"?<div className="quick-grid home-widget" key="quick"><button onClick={()=>setPage("Quran")}><BookOpen/><b>Read Quran</b><small>Continue with the words of Allah</small></button><button onClick={()=>setPage("Tasbih")}><Activity/><b>Digital Tasbih</b><small>Remember Allah with presence</small></button><button onClick={()=>setPage("Communities")}><Users/><b>Find your people</b><small>Learn and grow together</small></button></div>:widget==="toolkit"?<section className="home-toolkit home-widget" key="toolkit"><div className="section-heading"><div><span className="eyebrow">YOUR SABILY TOOLKIT</span><h3>One space for your whole journey</h3></div><button className="toolkit-link" onClick={()=>setPage("Explore")}>Explore all <ChevronRight size={14}/></button></div><GlassModule page="Explore" userId={user.id} role={user.role} displayName={profile.display_name||"friend"} city={profile.city} prayerTimes={prayerTimes} prayerDate={prayerDate} onNavigate={setPage} onToast={showToast}/></section>:widget==="events"?<EventsPreview key="events" onNavigate={setPage}/>:widget==="goodness"?<section className="good-card home-widget" key="goodness"><div className="good-icon"><Heart size={20}/></div><div><b>Goodness grows when shared.</b><p>Join a community, encourage someone, or take one small step towards a better day.</p></div><button onClick={()=>setPage("Communities")}>Explore <ChevronRight size={15}/></button></section>:null)}
        </div>}

        {page==="Prayer"&&<div className="page-stack"><section className="page-intro"><span className="eyebrow">DAILY WORSHIP</span><h1>Prayer times</h1><p>Local calculation for your selected city. Confirm the method and timings with your local mosque when needed.</p></section>{nextPrayer&&<section className="next-prayer-card"><div><span className="eyebrow">{nextPrayer.tomorrow?"NEXT PRAYER · TOMORROW":"UP NEXT"}</span><h2>{nextPrayer.name}</h2><p>{nextPrayer.time} · {prayerTimezone||profile.city}</p></div><div className="next-prayer-countdown" aria-live="polite"><b>{Math.floor(nextPrayer.minutesLeft/60)}h {nextPrayer.minutesLeft%60}m</b><small>remaining</small></div></section>}<section className="prayer-card large-prayer"><div className="prayer-card-head"><div><Clock3 size={18}/><b>{profile.city}, {countries[profile.country_code||"MA"]}</b></div><label className="prayer-method-select">Calculation method<select value={prayerMethod} onChange={e=>{const next=Number(e.target.value);setPrayerMethod(next);localStorage.setItem("sabily-prayer-method-"+user.id,String(next));}}>{Object.entries(prayerMethodLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button onClick={()=>loadPrayer(profile)}><RefreshCw size={14}/> Update</button></div>{prayerTimes?<div className="prayer-list">{prayerNames.map(n=><div key={n}><span>{n}</span><b>{prayerTimes[n]||"—"}</b></div>)}</div>:<p>{prayerError||"Loading prayer timings…"}</p>}<div className="prayer-card-foot"><span>{prayerDate||("AlAdhan · "+(prayerMethodLabels[prayerMethod]||"Custom"))}</span></div></section><p className="disclaimer">Prayer times are calculated estimates, not an official mosque timetable. You can change your city and country in Profile.</p></div>}

        {page==="Qibla"&&<div className="page-stack"><section className="page-intro"><span className="eyebrow">DIRECTION OF PRAYER</span><h1>Find your Qibla</h1><p>Allow location access to calculate the direction from your current position to the Kaaba in Makkah.</p></section><section className="qibla-panel"><div className="compass-wrap"><div className="compass-ring" style={{transform:"rotate("+(-(compassHeading??0))+"deg)"}}><span className="compass-n">N</span><span className="compass-e">E</span><span className="compass-s">S</span><span className="compass-w">W</span><div className="compass-needle" style={{transform:"translate(-50%,-50%) rotate("+(qibla??0)+"deg)"}}><div className="needle-top"/><div className="needle-bottom"/></div><div className="compass-center"><Compass size={22}/></div></div></div><div className="qibla-result">{qibla!==null?<><span className="eyebrow">QIBLA BEARING FROM TRUE NORTH</span><strong>{qibla.toFixed(1)}°</strong><p>{coords?.lat.toFixed(4)}, {coords?.lon.toFixed(4)}</p></>:<><span className="eyebrow">YOUR DIRECTION</span><strong>—</strong><p>Location permission is needed</p></>}<button className="primary-btn" onClick={locate}><MapPin size={16}/> {qibla===null?"Use my location":"Refresh location"}</button><button className="secondary-btn" onClick={()=>void enableCompass()}><Compass size={16}/> {compassHeading===null?"Enable device compass":"Refresh compass"}</button>{compassHeading!==null&&<p className="compass-heading-value">Device heading {compassHeading.toFixed(0)}° from north</p>}{compassStatus&&<p className="compass-status" role="status">{compassStatus}</p>}</div></section><p className="disclaimer">The bearing is calculated from geographic coordinates. The compass aligns when your browser provides an absolute device heading; otherwise use the bearing with a physical compass. Move the phone in a figure-eight motion if the sensor drifts.</p></div>}

        {page==="Quran"&&<div className="quran-layout"><section className="page-intro"><span className="eyebrow">THE NOBLE QURAN</span><h1>Read & reflect</h1><p>A quiet reading space with Uthmani Arabic, optional Saheeh International translation and surah recitation.</p></section><div className="quran-toolbar"><label className="quran-select">Choose a surah<select value={surahNo} onChange={e=>setSurahNo(Number(e.target.value))}>{surahs.map(s=><option value={s.number} key={s.number}>{s.number}. {s.englishName} · {s.name}</option>)}</select></label><div className="quran-reader-controls"><button className="glass-button" disabled={!surahs.length||surahNo<=1} onClick={()=>setSurahNo(n=>Math.max(1,n-1))} aria-label="Previous surah"><ChevronLeft size={15}/> Previous</button><button className="glass-button" disabled={!surahs.length||surahNo>=surahs.length} onClick={()=>setSurahNo(n=>Math.min(surahs.length,n+1))} aria-label="Next surah">Next <ChevronRight size={15}/></button><button className={translationEnabled?"glass-button active":"glass-button"} aria-pressed={translationEnabled} onClick={()=>setTranslationEnabled(on=>!on)}>{translationEnabled?"Hide":"Show"} English translation</button><button className="reader-font-btn" disabled={quranFontSize<=22} onClick={()=>setQuranFontSize(size=>Math.max(22,size-2))} aria-label="Decrease Arabic text size">A−</button><button className="reader-font-btn" disabled={quranFontSize>=40} onClick={()=>setQuranFontSize(size=>Math.min(40,size+2))} aria-label="Increase Arabic text size">A+</button></div></div><section className="quran-audio-panel"><div><span className="eyebrow">RECITATION</span><b>{surahs.find(s=>s.number===surahNo)?.englishName||"Selected surah"} · Mishary Alafasy</b></div><audio controls preload="none" aria-label="Play full surah recitation" src={"https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/"+surahNo+".mp3"}/></section>{translationError&&<p className="notice error" role="status">{translationError}</p>}{translationBusy&&<p className="glass-footnote" role="status">Loading English translation…</p>}<section className="verses-panel" style={{"--quran-font-size":quranFontSize+"px"} as React.CSSProperties}>{quranBusy?<div className="empty-state">Loading Qur’an text…</div>:verses.map((verse,index)=><article className="verse-row" key={verse.number}><span className="verse-number">{verse.numberInSurah}</span><div className="verse-reading"><p lang="ar" dir="rtl" style={{fontSize:quranFontSize}}>{verse.text}</p>{translationEnabled&&<p className="verse-translation">{translationVerses[index]?.text||""}</p>}</div></article>)}</section><p className="disclaimer">Arabic text and the English translation are served by AlQuran Cloud; translation wording reflects the selected edition and may vary. Confirm readings with a trusted mushaf or teacher.</p></div>}

        {page==="Communities"&&<div className="community-layout"><section className="page-intro community-intro"><div><span className="eyebrow">ONE UMMAH · MANY COMMUNITIES</span><h1>Find your people.</h1><p>Join a circle of learning, encouragement and good deeds — or start one of your own.</p></div><button className="primary-btn" onClick={()=>setShowCreate(true)}><Plus size={16}/> Create community</button></section>{selectedCommunity?<><button className="back-link" onClick={()=>setSelectedCommunity(null)}><ChevronLeft size={16}/> All communities</button><section className="selected-community"><div className="community-symbol"><Users size={25}/></div><div className="selected-community-info"><span className="eyebrow">{selectedCommunity.category}</span><h2>{selectedCommunity.name}</h2><p>{selectedCommunity.description||"A welcoming space to connect and grow together."}</p></div>{memberships.includes(selectedCommunity.id)?<span className="joined-pill">Joined</span>:<button className="primary-btn" disabled={busy} onClick={()=>joinCommunity(selectedCommunity)}>Join community</button>}</section>{memberships.includes(selectedCommunity.id)&&<form className="post-composer" onSubmit={publishPost}><textarea value={postDraft} onChange={e=>setPostDraft(e.target.value)} placeholder="Share a reflection, question or encouragement…" maxLength={5000}/><div><small>Keep it beneficial, respectful and kind.</small><button className="primary-btn" disabled={busy||!postDraft.trim()}><Send size={15}/> Publish</button></div></form>}<div className="feed-list">{posts.length?posts.map(post=><article className="feed-post" key={post.id}><div className="post-author"><div className="avatar">{(post.author_name||"S").slice(0,1).toUpperCase()}</div><div><b>{post.author_name}</b><small>{new Date(post.created_at).toLocaleString()}</small></div></div><p>{post.body}</p><button className="community-report-btn" onClick={()=>reportCommunityPost(post)}>Report to moderators</button><div className="comment-list">{comments.filter(c=>c.post_id===post.id).map(c=><div className="comment-row" key={c.id}><b>{c.author_name}</b><span>{c.body}</span></div>)}</div>{memberships.includes(selectedCommunity.id)&&<div className="comment-composer"><input value={commentDraft[post.id]||""} onChange={e=>setCommentDraft(old=>({...old,[post.id]:e.target.value}))} placeholder="Write a kind reply…"/><button onClick={()=>publishComment(post)} aria-label="Send comment"><Send size={15}/></button></div>}</article>):<div className="empty-state">No posts yet. Start the conversation with something beneficial.</div>}</div></>:<><div className="community-tools"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search communities, topics or interests"/></div><button className="refresh-btn" onClick={loadCommunities}><RefreshCw size={15}/> Refresh</button></div><div className="community-grid">{filteredCommunities.map(group=><article className="community-card" key={group.id}><div className="community-card-top"><div className="community-symbol"><Users size={23}/></div><span className="category-pill">{group.category}</span></div><h3>{group.name}</h3><p>{group.description||"A welcoming space to connect and grow together."}</p><div className="community-card-foot"><span><Globe2 size={13}/>{group.country_code?countries[group.country_code]||"Global":"Global"}</span>{memberships.includes(group.id)?<button className="joined-button" onClick={()=>setSelectedCommunity(group)}>Open group <ChevronRight size={14}/></button>:<button className="join-button" disabled={busy} onClick={()=>joinCommunity(group)}>Join <Plus size={14}/></button>}</div></article>)}</div>{filteredCommunities.length===0&&<div className="empty-state">No communities found. Create the first one around something good.</div>}</>}</div>}

        {page==="Personalize"&&<div className="page-stack personalize-page"><section className="page-intro"><span className="eyebrow">YOUR SPACE, YOUR RHYTHM</span><h1>Make Sabily yours.</h1><p>Choose a visual theme, arrange your home widgets and tune your personal programme. Your choices sync to your account.</p></section><section className="personalize-panel"><span className="eyebrow">APPEARANCE</span><h2>Choose your atmosphere</h2><div className="theme-options">{[["emerald","Emerald","Deep green · lime"],["midnight","Midnight","Dark blue · cool"],["sand","Warm sand","Soft neutral"],["light","Daylight","Clean light"]].map(([id,name,desc])=><button type="button" key={id} className={theme===id?"theme-choice selected":"theme-choice"} onClick={()=>{setTheme(id);void savePreferences(id,homeWidgets);}}><span className={"theme-swatch "+id}/><b>{name}</b><small>{desc}</small>{theme===id&&<span className="theme-selected">Selected</span>}</button>)}</div></section><section className="personalize-panel"><span className="eyebrow">HOME SCREEN</span><h2>Your daily toolkit</h2><p>Show only what helps. Move widgets up or down to set your preferred order.</p><div className="widget-arrange-list">{[["prayer","Prayer times","Your local daily prayer schedule"],["quick","Quick actions","Qur’an, Tasbih and community shortcuts"],["toolkit","Learning & tools","Your wider Sabily toolkit"],["events","Events & worship","Upcoming community gatherings and live worship"],["goodness","Community encouragement","A gentle prompt to connect and contribute"]].map(([id,name,desc])=><div className="widget-arrange-row" key={id}><label><input type="checkbox" checked={homeWidgets.includes(id)} onChange={()=>toggleWidget(id)}/><span><b>{name}</b><small>{desc}</small></span></label><div><button type="button" aria-label={"Move "+name+" up"} disabled={!homeWidgets.includes(id)||homeWidgets.indexOf(id)===0} onClick={()=>moveWidget(id,-1)}>↑</button><button type="button" aria-label={"Move "+name+" down"} disabled={!homeWidgets.includes(id)||homeWidgets.indexOf(id)===homeWidgets.length-1} onClick={()=>moveWidget(id,1)}>↓</button></div></div>)}</div></section><section className="personalize-panel"><span className="eyebrow">YOUR PERSONAL PLAN</span><h2>Keep your goals realistic.</h2><label>Main goal</label><select value={mainGoal} onChange={e=>setMainGoal(e.target.value)}><option>Build a consistent worship routine</option><option>Read and understand more Qur’an</option><option>Learn Islamic knowledge step by step</option><option>Improve my recitation</option><option>Connect with a positive community</option><option>Build healthier daily habits</option></select><label>Daily time budget</label><select value={dailyMinutes} onChange={e=>setDailyMinutes(e.target.value)}><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour or more</option></select><label>Interests</label><div className="interest-picker">{interestOptions.map(item=><button type="button" key={item} className={selectedInterests.includes(item)?"interest-chip selected":"interest-chip"} onClick={()=>setSelectedInterests(old=>old.includes(item)?old.filter(x=>x!==item):[...old,item])}>{item}</button>)}</div><button className="primary-btn" onClick={async()=>{if(supabase&&user)await supabase.from("sabily_profiles").update({interests:selectedInterests}).eq("user_id",user.id);await savePreferences();showToast("Your personal plan and preferences have been saved.");}}>Save my preferences</button></section></div>}
        {page==="Profile"&&<div className="page-stack"><section className="page-intro"><span className="eyebrow">YOUR ACCOUNT</span><h1>Your profile</h1><p>Manage your identity, location and language preferences.</p></section><form className="profile-form" onSubmit={saveProfile}><div className="profile-avatar-large">{(profile.display_name||"S").slice(0,1).toUpperCase()}</div><label>Display name</label><input required value={profileName} onChange={e=>setProfileName(e.target.value)}/><label>City</label><input required value={profileCity} onChange={e=>setProfileCity(e.target.value)}/><label>Country</label><select value={profileCountry} onChange={e=>setProfileCountry(e.target.value)}>{countryOptions.map(([code,name])=><option value={code} key={code}>{name}</option>)}</select><label>Language</label><select value={profileLocale} onChange={e=>setProfileLocale(e.target.value)}><option value="en">English · UI language available</option></select><label>About you</label><textarea rows={3} value={profileBio} onChange={e=>setProfileBio(e.target.value)} maxLength={300} placeholder="A little about your interests…"/><div className="profile-meta"><span>{user.email}</span><span className="role-pill">{user.role.replace("_"," ")}</span></div><button className="primary-btn" disabled={busy}>{busy?"Saving…":"Save profile"}</button></form><div className="profile-note"><ShieldCheck size={18}/><p>Your profile and personal settings are stored securely. Community posts show the display name you choose.</p></div></div>}
        {["Events","Live Worship","Live Jumu'ah","Live Taraweeh"].includes(page)&&<EventsModule userId={user.id} view={page==="Events"?"events":page==="Live Worship"?"live":page==="Live Jumu'ah"?"jummah":"taraweeh"} onNavigate={setPage} onToast={showToast}/>}
        {!["Home","Prayer","Qibla","Quran","Communities","Events","Live Worship","Live Jumu'ah","Live Taraweeh","Profile","Personalize","Admin"].includes(page)&&<GlassModule page={page} userId={user.id} role={user.role} displayName={profile.display_name||"friend"} city={profile.city} prayerTimes={prayerTimes} prayerDate={prayerDate} onNavigate={setPage} onToast={showToast}/>}
      </div>
      {!["Quran","Worship","Prayer","Tasbih","Tahajjud","Wird","Qibla","Reminders","Events","Live Worship","Live Jumu'ah","Live Taraweeh"].includes(page)&&<><AdSlot key={"banner-"+page} userId={user.id} placementKey="app_footer_banner" format="banner"/><AdSlot key={"interstitial-"+page} userId={user.id} placementKey="between_sections_interstitial" format="interstitial"/><AdSlot key={"popup-"+page} userId={user.id} placementKey="home_discovery_popup" format="popup"/></>}<footer className="member-footer"><span>© 2026 Sabily</span><span>Faith · Growth · Service · Community</span></footer>
    </main>
    {toast&&<div className="toast-message">{toast}</div>}
    {showCreate&&<div className="modal-backdrop" onClick={()=>setShowCreate(false)}><form className="create-modal" onClick={e=>e.stopPropagation()} onSubmit={createCommunity}><div className="modal-head"><div><span className="eyebrow">BUILD SOMETHING GOOD</span><h2>Create a community</h2></div><button type="button" className="close-btn" onClick={()=>setShowCreate(false)}><X size={18}/></button></div><label>Community name</label><input required minLength={3} maxLength={80} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Quran Study Circle"/><label>Description</label><textarea rows={3} maxLength={500} value={newDescription} onChange={e=>setNewDescription(e.target.value)} placeholder="What brings this community together?"/><label>Category</label><select value={newCategory} onChange={e=>setNewCategory(e.target.value)}>{["Quran & learning","Daily worship","Personal growth","Charity & volunteering","Muslim professionals","Local community","Family & youth","General"].map(c=><option key={c}>{c}</option>)}</select><p className="modal-note">New communities are public and searchable. Keep the space welcoming and follow Sabily's community guidelines.</p><button className="primary-btn full-btn" disabled={busy}>{busy?"Creating…":"Create community"}</button></form></div>}
    {showMobileMore&&<div className="mobile-more-backdrop" onClick={()=>setShowMobileMore(false)}><section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title" onClick={e=>e.stopPropagation()}><div className="mobile-more-head"><div><span className="eyebrow">YOUR SABILY TOOLKIT</span><h2 id="mobile-more-title">More to explore</h2></div><button className="close-btn" aria-label="Close menu" onClick={()=>setShowMobileMore(false)}><X size={18}/></button></div><div className="mobile-more-grid">{visibleNav.filter(item=>!mobileNav.some(primary=>primary.id===item.id)&&item.id!=="Admin Studio"&&item.id!=="Content Studio"&&item.id!=="Moderation").map(item=><button key={item.id} onClick={()=>{setPage(item.id);setSelectedCommunity(null);setShowMobileMore(false);}}><item.icon size={19}/><span>{item.label}</span><ChevronRight size={15}/></button>)}{isModerator&&<button onClick={()=>{setPage("Moderation");setShowMobileMore(false);}}><ShieldAlert size={19}/><span>Moderation</span><ChevronRight size={15}/></button>}{isCreator&&<button onClick={()=>{setPage("Content Studio");setShowMobileMore(false);}}><Sparkles size={19}/><span>Content studio</span><ChevronRight size={15}/></button>}{isAdmin&&<button onClick={()=>{setPage("Admin");setShowMobileMore(false);}}><ShieldCheck size={19}/><span>Admin workspace</span><ChevronRight size={15}/></button>}</div></section></div>}
    <nav className="mobile-nav">{mobileNav.map(item=><button key={item.id} className={(page===item.id||(item.id==="Mini Apps"&&showMobileMore))?"active":""} onClick={()=>{if(item.id==="Mini Apps"){setShowMobileMore(true);return;}setPage(item.id);setSelectedCommunity(null);setShowMobileMore(false);}}><item.icon size={19}/><span>{item.label}</span></button>)}</nav>
  </div>;
}
