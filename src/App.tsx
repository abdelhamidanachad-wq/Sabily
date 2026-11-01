import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Home, BookOpen, Clock3, Compass, Users, UserCircle2, LogOut, Plus,
  Send, MapPin, MoonStar, Sun, Globe2, Heart, MessageCircle, ShieldCheck,
  Search, ChevronLeft, ChevronRight, RefreshCw, X, Sparkles, Menu
} from "lucide-react";
import { supabase, supabaseReady, getSabilyRole, type SabilyRole } from "./supabase";
import AdminWorkspace from "./AdminWorkspace";

type Profile = {
  user_id: string; display_name: string | null; username: string | null; bio: string | null;
  country_code: string | null; locale: string; city: string; onboarding_complete: boolean;
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
  { id:"Quran", label:"Quran", icon:BookOpen },
  { id:"Prayer", label:"Prayer", icon:Clock3 },
  { id:"Qibla", label:"Qibla", icon:Compass },
  { id:"Communities", label:"Communities", icon:Users },
  { id:"Profile", label:"Profile", icon:UserCircle2 }
];
const prayerNames = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];

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
function Login({ onSignedIn }: { onSignedIn:(id:string,email:string)=>void }) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [signup,setSignup]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submit(e:FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    if (!supabase) { setError("Sabily is waiting for its Supabase connection. Please check the deployment configuration."); setBusy(false); return; }
    const result = signup
      ? await supabase.auth.signUp({email,password,options:{data:{full_name:email.split("@")[0]}}})
      : await supabase.auth.signInWithPassword({email,password});
    if (result.error) setError(result.error.message);
    else if (result.data.user && result.data.session) onSignedIn(result.data.user.id,result.data.user.email||email);
    else setError("Account created. Check your email to confirm your address, then sign in.");
    setBusy(false);
  }
  return <div className="auth-page">
    <div className="auth-visual"><Brand/><div className="auth-hero"><span className="eyebrow">ONE UMMAH · MANY PATHS TO GOOD</span><h1>A better path,<br/><em>together.</em></h1><p>Faith, learning, community and meaningful action — in one welcoming space for Muslims everywhere.</p><div className="auth-verse">“So whoever does an atom's weight of good will see it.”<small>Qur'an 99:7 · Translation wording may vary</small></div></div><small className="auth-foot">Built with care. Shared for the sake of good.</small></div>
    <div className="auth-form-wrap"><form className="auth-card" onSubmit={submit}><span className="eyebrow">WELCOME TO SABILY</span><h2>{signup?"Create your account":"Your journey starts here"}</h2><p>{signup?"Join a global community built around faith, growth and service.":"Sign in to continue your journey."}</p><label>Email address</label><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><label>Password</label><input type="password" required minLength={6} autoComplete={signup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/><button className="primary-btn full-btn" disabled={busy}>{busy?"Please wait…":signup?"Create free account":"Sign in"}</button>{error&&<div className="notice error">{error}</div>}<p className="auth-switch">{signup?"Already a member?":"New to Sabily?"} <button type="button" className="link-btn" onClick={()=>{setSignup(!signup);setError("");}}>{signup?"Sign in":"Create an account"}</button></p><div className="auth-trust"><ShieldCheck size={15}/> Your account and community activity are protected by Supabase authentication and database policies.</div></form></div>
  </div>;
}

export default function App() {
  const [user,setUser]=useState<{id:string;email:string;role:SabilyRole}|null>(null);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [page,setPage]=useState("Home");
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
  const [newName,setNewName]=useState("");
  const [newDescription,setNewDescription]=useState("");
  const [newCategory,setNewCategory]=useState("Quran & learning");
  const [prayerTimes,setPrayerTimes]=useState<Record<string,string>|null>(null);
  const [prayerDate,setPrayerDate]=useState("");
  const [prayerError,setPrayerError]=useState("");
  const [coords,setCoords]=useState<{lat:number;lon:number}|null>(null);
  const [qibla,setQibla]=useState<number|null>(null);
  const [surahs,setSurahs]=useState<any[]>([]);
  const [surahNo,setSurahNo]=useState(1);
  const [verses,setVerses]=useState<any[]>([]);
  const [quranBusy,setQuranBusy]=useState(false);
  const [profileName,setProfileName]=useState("");
  const [profileCity,setProfileCity]=useState("Casablanca");
  const [profileCountry,setProfileCountry]=useState("MA");
  const [profileLocale,setProfileLocale]=useState("en");
  const [profileBio,setProfileBio]=useState("");

  const showToast=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),3500);};

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
    setProfileCountry(p.country_code||"MA"); setProfileLocale(p.locale||"en"); setProfileBio(p.bio||"");
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

  const loadPrayer = useCallback(async (p:Profile|null) => {
    if (!p) return;
    setPrayerError("");
    const country=countries[p.country_code||"MA"]||"Morocco";
    const city=p.city||"Casablanca";
    try {
      const url="https://api.aladhan.com/v1/timingsByCity?city="+encodeURIComponent(city)+"&country="+encodeURIComponent(country)+"&method=3";
      const response=await fetch(url); const json=await response.json();
      if (json.code!==200) throw new Error(json.status||"Prayer times unavailable");
      setPrayerTimes(json.data.timings); setPrayerDate(json.data.date.readable+" · "+json.data.date.hijri.date);
    } catch { setPrayerError("Prayer times could not be loaded. Check your connection or update your city in Profile."); }
  },[]);

  useEffect(()=>{ if(profile) loadPrayer(profile); },[profile,loadPrayer]);

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
    fetch("https://api.alquran.cloud/v1/surah/"+surahNo+"/quran-uthmani").then(r=>r.json()).then(j=>setVerses(j.data?.ayahs||[])).catch(()=>showToast("This surah could not be loaded.")).finally(()=>setQuranBusy(false));
  },[page,surahNo]);

  const saveProfile=async(e:FormEvent)=>{
    e.preventDefault(); if(!supabase||!user)return; setBusy(true);
    const patch={user_id:user.id,display_name:profileName.trim(),city:profileCity.trim(),country_code:profileCountry,locale:profileLocale,bio:profileBio.trim(),onboarding_complete:true};
    const {data,error}=await supabase.from("sabily_profiles").upsert(patch,{onConflict:"user_id"}).select("*").single();
    if(error)showToast(error.message);else{setProfile(data as Profile);showToast("Your profile has been saved.");}
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

  const locate=()=>{
    if(!navigator.geolocation){showToast("Geolocation is not supported on this device.");return;}
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat=pos.coords.latitude,lon=pos.coords.longitude;setCoords({lat,lon});setQibla(qiblaFrom(lat,lon));
    },err=>showToast(err.message||"Location permission was not granted."),{enableHighAccuracy:true,timeout:12000});
  };

  const todayHijri=useMemo(()=>hijriDate(),[]);
  const filteredCommunities=communities.filter(c=>(c.name+" "+c.description+" "+c.category).toLowerCase().includes(search.toLowerCase()));
  const isAdmin=user?.role==="admin"||user?.role==="super_admin";
  const direction=profile?.locale==="ar"?"rtl":"ltr";

  if(loading)return <div className="loading-screen"><div className="brand-mark">S</div><span>Preparing your Sabily space…</span></div>;
  if(!user)return <Login onSignedIn={(id,email)=>{setLoading(true);hydrate(id,email);}}/>;
  if(profile&&!profile.onboarding_complete)return <div className="onboarding-screen"><form className="onboarding-card" onSubmit={saveProfile}><Brand/><span className="eyebrow">LET'S MAKE THIS YOUR SPACE</span><h1>Welcome to Sabily.</h1><p>Set your location and language so prayer times, community discovery and the app experience can be relevant to you.</p><label>Display name</label><input required value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="How should we call you?"/><label>City</label><input required value={profileCity} onChange={e=>setProfileCity(e.target.value)} placeholder="Casablanca"/><label>Country</label><select value={profileCountry} onChange={e=>setProfileCountry(e.target.value)}>{countryOptions.map(([code,name])=><option value={code} key={code}>{name}</option>)}</select><label>App language</label><select value={profileLocale} onChange={e=>setProfileLocale(e.target.value)}><option value="en">English</option><option value="ar">العربية</option><option value="fr">Français</option></select><button className="primary-btn full-btn" disabled={busy}>{busy?"Saving…":"Continue to Sabily"}</button></form></div>;
  if(page==="Admin"&&isAdmin)return <div className="admin-return"><button className="back-app-btn" onClick={()=>setPage("Home")}><ChevronLeft size={16}/> Back to Sabily</button><AdminWorkspace/></div>;

  return <div className="member-app" dir={direction}>
    <aside className="member-sidebar"><Brand/><div className="global-pill"><Globe2 size={15}/> Global Muslim community</div><nav>{nav.map(item=><button key={item.id} className={page===item.id?"member-nav active":"member-nav"} onClick={()=>{setPage(item.id);setSelectedCommunity(null);}}><item.icon size={18}/><span>{item.label}</span></button>)}</nav><div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{(profile.display_name||"S").slice(0,1).toUpperCase()}</div><div><b>{profile.display_name||user.email.split("@")[0]}</b><small>{countries[profile.country_code||"MA"]||"Global member"}</small></div></div>{isAdmin&&<button className="admin-link" onClick={()=>setPage("Admin")}><ShieldCheck size={16}/> Admin workspace</button>}<button className="signout-link" onClick={async()=>{await supabase?.auth.signOut();}}><LogOut size={16}/> Sign out</button></div></aside>
    <main className="member-main">
      <header className="member-topbar"><div><span className="topbar-kicker">SABILY / {page.toUpperCase()}</span><h2>{page==="Home"?"Assalamu alaykum, "+(profile.display_name||"friend"):page}</h2></div><div className="topbar-right"><span className={supabaseReady?"backend-status live":"backend-status"}><i/>{supabaseReady?"Connected":"Offline setup"}</span><div className="avatar small-avatar">{(profile.display_name||"S").slice(0,1).toUpperCase()}</div></div></header>
      <div className="member-content">
        {page==="Home"&&<div className="home-layout">
          <section className="welcome-banner"><div><span className="eyebrow">YOUR DAILY PATH</span><h1>Small steps.<br/><em>Lasting impact.</em></h1><p>A little worship, a little learning, a little good — every day matters.</p><button className="banner-btn" onClick={()=>setPage("Quran")}>Continue your journey <ChevronRight size={16}/></button></div><div className="banner-art"><div className="moon-orbit"><MoonStar size={72}/></div><span>إِنَّ مَعَ الْعُسْرِ يُسْرًا</span></div></section>
          <div className="section-heading"><div><span className="eyebrow">TODAY</span><h3>Your day at a glance</h3></div><span className="date-chip">{todayHijri}</span></div>
          <section className="prayer-card"><div className="prayer-card-head"><div><Clock3 size={18}/><b>Prayer times</b></div><span><MapPin size={13}/>{profile.city}, {countries[profile.country_code||"MA"]||""}</span></div>{prayerTimes?<div className="prayer-grid">{prayerNames.map(n=><div className="prayer-time" key={n}><small>{n}</small><b>{prayerTimes[n]||"—"}</b></div>)}</div>:<div className="prayer-loading">{prayerError||"Loading local prayer times…"}</div>}<div className="prayer-card-foot"><span>{prayerDate||"Calculated local timings · MWL method"}</span><button onClick={()=>loadPrayer(profile)}><RefreshCw size={14}/> Refresh</button></div></section>
          <div className="quick-grid"><button onClick={()=>setPage("Quran")}><BookOpen/><b>Read Quran</b><small>Continue with the words of Allah</small></button><button onClick={()=>setPage("Qibla")}><Compass/><b>Find Qibla</b><small>Get your direction to Makkah</small></button><button onClick={()=>setPage("Communities")}><Users/><b>Find your people</b><small>Learn and grow together</small></button></div>
          <section className="good-card"><div className="good-icon"><Heart size={20}/></div><div><b>Goodness grows when shared.</b><p>Join a community, encourage someone, or take one small step towards a better day.</p></div><button onClick={()=>setPage("Communities")}>Explore <ChevronRight size={15}/></button></section>
        </div>}

        {page==="Prayer"&&<div className="page-stack"><section className="page-intro"><span className="eyebrow">DAILY WORSHIP</span><h1>Prayer times</h1><p>Local calculation for your selected city. Confirm the method and timings with your local mosque when needed.</p></section><section className="prayer-card large-prayer"><div className="prayer-card-head"><div><Clock3 size={18}/><b>{profile.city}, {countries[profile.country_code||"MA"]}</b></div><button onClick={()=>loadPrayer(profile)}><RefreshCw size={14}/> Update</button></div>{prayerTimes?<div className="prayer-list">{prayerNames.map(n=><div key={n}><span>{n}</span><b>{prayerTimes[n]||"—"}</b></div>)}</div>:<p>{prayerError||"Loading prayer timings…"}</p>}<div className="prayer-card-foot"><span>{prayerDate||"AlAdhan · Muslim World League calculation method"}</span></div></section><p className="disclaimer">Prayer times are calculated estimates, not an official mosque timetable. You can change your city and country in Profile.</p></div>}

        {page==="Qibla"&&<div className="page-stack"><section className="page-intro"><span className="eyebrow">DIRECTION OF PRAYER</span><h1>Find your Qibla</h1><p>Allow location access to calculate the direction from your current position to the Kaaba in Makkah.</p></section><section className="qibla-panel"><div className="compass-wrap"><div className="compass-ring"><span className="compass-n">N</span><span className="compass-e">E</span><span className="compass-s">S</span><span className="compass-w">W</span><div className="compass-needle" style={{transform:"translate(-50%,-50%) rotate("+(qibla??0)+"deg)"}}><div className="needle-top"/><div className="needle-bottom"/></div><div className="compass-center"><Compass size={22}/></div></div></div><div className="qibla-result">{qibla!==null?<><span className="eyebrow">QIBLA BEARING</span><strong>{qibla.toFixed(1)}°</strong><p>{coords?.lat.toFixed(4)}, {coords?.lon.toFixed(4)}</p></>:<><span className="eyebrow">YOUR DIRECTION</span><strong>—</strong><p>Location permission is needed</p></>}<button className="primary-btn" onClick={locate}><MapPin size={16}/> {qibla===null?"Use my location":"Refresh location"}</button></div></section><p className="disclaimer">The bearing is calculated from geographic coordinates. Your phone compass may need calibration; rotate the device in a figure-eight motion if the heading is unstable.</p></div>}

        {page==="Quran"&&<div className="quran-layout"><section className="page-intro"><span className="eyebrow">THE NOBLE QURAN</span><h1>Read & reflect</h1><p>Browse the Qur'an in Uthmani Arabic script. Audio, translations and memorisation tools will be added in later releases.</p></section><div className="quran-select"><label>Choose a surah</label><select value={surahNo} onChange={e=>setSurahNo(Number(e.target.value))}>{surahs.map(s=><option value={s.number} key={s.number}>{s.number}. {s.englishName} · {s.name}</option>)}</select></div><section className="verses-panel">{quranBusy?<div className="empty-state">Loading Qur'an text…</div>:verses.map(v=><article className="verse-row" key={v.number}><span className="verse-number">{v.numberInSurah}</span><p lang="ar" dir="rtl">{v.text}</p></article>)}</section><p className="disclaimer">Qur'an text is retrieved from AlQuran Cloud. Please report any display or text discrepancy before relying on a transcription.</p></div>}

        {page==="Communities"&&<div className="community-layout"><section className="page-intro community-intro"><div><span className="eyebrow">ONE UMMAH · MANY COMMUNITIES</span><h1>Find your people.</h1><p>Join a circle of learning, encouragement and good deeds — or start one of your own.</p></div><button className="primary-btn" onClick={()=>setShowCreate(true)}><Plus size={16}/> Create community</button></section>{selectedCommunity?<><button className="back-link" onClick={()=>setSelectedCommunity(null)}><ChevronLeft size={16}/> All communities</button><section className="selected-community"><div className="community-symbol"><Users size={25}/></div><div className="selected-community-info"><span className="eyebrow">{selectedCommunity.category}</span><h2>{selectedCommunity.name}</h2><p>{selectedCommunity.description||"A welcoming space to connect and grow together."}</p></div>{memberships.includes(selectedCommunity.id)?<span className="joined-pill">Joined</span>:<button className="primary-btn" disabled={busy} onClick={()=>joinCommunity(selectedCommunity)}>Join community</button>}</section>{memberships.includes(selectedCommunity.id)&&<form className="post-composer" onSubmit={publishPost}><textarea value={postDraft} onChange={e=>setPostDraft(e.target.value)} placeholder="Share a reflection, question or encouragement…" maxLength={5000}/><div><small>Keep it beneficial, respectful and kind.</small><button className="primary-btn" disabled={busy||!postDraft.trim()}><Send size={15}/> Publish</button></div></form>}<div className="feed-list">{posts.length?posts.map(post=><article className="feed-post" key={post.id}><div className="post-author"><div className="avatar">{(post.author_name||"S").slice(0,1).toUpperCase()}</div><div><b>{post.author_name}</b><small>{new Date(post.created_at).toLocaleString()}</small></div></div><p>{post.body}</p><div className="comment-list">{comments.filter(c=>c.post_id===post.id).map(c=><div className="comment-row" key={c.id}><b>{c.author_name}</b><span>{c.body}</span></div>)}</div>{memberships.includes(selectedCommunity.id)&&<div className="comment-composer"><input value={commentDraft[post.id]||""} onChange={e=>setCommentDraft(old=>({...old,[post.id]:e.target.value}))} placeholder="Write a kind reply…"/><button onClick={()=>publishComment(post)} aria-label="Send comment"><Send size={15}/></button></div>}</article>):<div className="empty-state">No posts yet. Start the conversation with something beneficial.</div>}</div></>:<><div className="community-tools"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search communities, topics or interests"/></div><button className="refresh-btn" onClick={loadCommunities}><RefreshCw size={15}/> Refresh</button></div><div className="community-grid">{filteredCommunities.map(group=><article className="community-card" key={group.id}><div className="community-card-top"><div className="community-symbol"><Users size={23}/></div><span className="category-pill">{group.category}</span></div><h3>{group.name}</h3><p>{group.description||"A welcoming space to connect and grow together."}</p><div className="community-card-foot"><span><Globe2 size={13}/>{group.country_code?countries[group.country_code]||"Global":"Global"}</span>{memberships.includes(group.id)?<button className="joined-button" onClick={()=>setSelectedCommunity(group)}>Open group <ChevronRight size={14}/></button>:<button className="join-button" disabled={busy} onClick={()=>joinCommunity(group)}>Join <Plus size={14}/></button>}</div></article>)}</div>{filteredCommunities.length===0&&<div className="empty-state">No communities found. Create the first one around something good.</div>}</>}</div>}

        {page==="Profile"&&<div className="page-stack"><section className="page-intro"><span className="eyebrow">YOUR ACCOUNT</span><h1>Your profile</h1><p>Manage your identity, location and language preferences.</p></section><form className="profile-form" onSubmit={saveProfile}><div className="profile-avatar-large">{(profile.display_name||"S").slice(0,1).toUpperCase()}</div><label>Display name</label><input required value={profileName} onChange={e=>setProfileName(e.target.value)}/><label>City</label><input required value={profileCity} onChange={e=>setProfileCity(e.target.value)}/><label>Country</label><select value={profileCountry} onChange={e=>setProfileCountry(e.target.value)}>{countryOptions.map(([code,name])=><option value={code} key={code}>{name}</option>)}</select><label>Language</label><select value={profileLocale} onChange={e=>setProfileLocale(e.target.value)}><option value="en">English</option><option value="ar">العربية</option><option value="fr">Français</option></select><label>About you</label><textarea rows={3} value={profileBio} onChange={e=>setProfileBio(e.target.value)} maxLength={300} placeholder="A little about your interests…"/><div className="profile-meta"><span>{user.email}</span><span className="role-pill">{user.role.replace("_"," ")}</span></div><button className="primary-btn" disabled={busy}>{busy?"Saving…":"Save profile"}</button></form><div className="profile-note"><ShieldCheck size={18}/><p>Your profile and personal settings are stored securely. Community posts show the display name you choose.</p></div></div>}
      </div>
      <footer className="member-footer"><span>© 2026 Sabily</span><span>Faith · Growth · Service · Community</span></footer>
    </main>
    {showCreate&&<div className="modal-backdrop" onClick={()=>setShowCreate(false)}><form className="create-modal" onClick={e=>e.stopPropagation()} onSubmit={createCommunity}><div className="modal-head"><div><span className="eyebrow">BUILD SOMETHING GOOD</span><h2>Create a community</h2></div><button type="button" className="close-btn" onClick={()=>setShowCreate(false)}><X size={18}/></button></div><label>Community name</label><input required minLength={3} maxLength={80} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Quran Study Circle"/><label>Description</label><textarea rows={3} maxLength={500} value={newDescription} onChange={e=>setNewDescription(e.target.value)} placeholder="What brings this community together?"/><label>Category</label><select value={newCategory} onChange={e=>setNewCategory(e.target.value)}>{["Quran & learning","Daily worship","Personal growth","Charity & volunteering","Muslim professionals","Local community","Family & youth","General"].map(c=><option key={c}>{c}</option>)}</select><p className="modal-note">New communities are public and searchable. Keep the space welcoming and follow Sabily's community guidelines.</p><button className="primary-btn full-btn" disabled={busy}>{busy?"Creating…":"Create community"}</button></form></div>}
    {toast&&<div className="toast-message">{toast}</div>}
    <nav className="mobile-nav">{nav.map(item=><button key={item.id} className={page===item.id?"active":""} onClick={()=>{setPage(item.id);setSelectedCommunity(null);}}><item.icon size={19}/><span>{item.label}</span></button>)}</nav>
  </div>;
}
