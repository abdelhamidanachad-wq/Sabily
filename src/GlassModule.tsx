import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, BookHeart, BookOpen, Brain, CalendarDays,
  Check, ChevronRight, CircleHelp, Clock3, Coins, Flame, Heart, HeartHandshake,
  Lightbulb, LockKeyhole, MessageCircle, MoonStar, Play, RotateCcw, ShieldCheck,
  Sparkles, Target, TrendingUp, Volume2, Wallet, HandHeart, Award, Headphones,
  Bookmark, Compass, Bell, CheckCircle2
} from "lucide-react";

type ModuleProps = {
  page: string;
  displayName: string;
  city: string;
  prayerTimes: Record<string,string> | null;
  prayerDate: string;
  onNavigate: (page:string)=>void;
  onToast: (message:string)=>void;
};

const prayers = ["Fajr","Dhuhr","Asr","Maghrib","Isha"];
const adhkar = [
  {title:"SubhanAllah",arabic:"سُبْحَانَ اللَّهِ",hint:"Glory be to Allah",target:33},
  {title:"Alhamdulillah",arabic:"الْحَمْدُ لِلَّهِ",hint:"All praise belongs to Allah",target:33},
  {title:"Allahu Akbar",arabic:"اللَّهُ أَكْبَرُ",hint:"Allah is the Greatest",target:34}
];

function GlassCard({children,className=""}:{children:React.ReactNode;className?:string}) {
  return <section className={"glass-card "+className}>{children}</section>;
}
function SectionTitle({eyebrow,title,description}:{eyebrow:string;title:string;description?:string}) {
  return <div className="glass-section-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>;
}
function PrayerTracker({prayerTimes,onToast}:{prayerTimes:Record<string,string>|null;onToast:(s:string)=>void}) {
  const key="sabily-prayer-checks-"+new Date().toISOString().slice(0,10);
  const [done,setDone]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem(key)||"[]")}catch{return[]}});
  useEffect(()=>{localStorage.setItem(key,JSON.stringify(done))},[done,key]);
  const toggle=(name:string)=>{setDone(old=>{const next=old.includes(name)?old.filter(x=>x!==name):[...old,name];if(!old.includes(name))onToast(name+" prayer marked complete. May Allah accept it.");return next;})};
  return <GlassCard className="prayer-tracker-card"><div className="glass-card-head"><div><span className="eyebrow">YOUR FIVE DAILY PRAYERS</span><h3>Prayer tracker</h3></div><div className="completion-ring" style={{"--progress":(done.length/5*100)+"%"} as React.CSSProperties}><strong>{done.length}/5</strong></div></div><div className="prayer-check-list">{prayers.map(name=><button key={name} className={done.includes(name)?"prayer-check done":"prayer-check"} onClick={()=>toggle(name)}><span className="prayer-check-icon">{done.includes(name)?<Check size={16}/>:<span/>}</span><span><b>{name}</b><small>{prayerTimes?.[name]||"Prayer time"}</small></span><span className="prayer-check-state">{done.includes(name)?"Completed":"Mark done"}</span></button>)}</div><p className="glass-footnote">Private to this device for now. Sync across devices will be enabled with the worship journal backend.</p></GlassCard>;
}
function Tasbih() {
  const [count,setCount]=useState(0);const [target,setTarget]=useState(33);const [phrase,setPhrase]=useState(adhkar[0].title);
  const progress=Math.min(100,count/target*100);
  return <div className="tasbih-layout"><GlassCard className="tasbih-main"><div className="tasbih-topline"><span className="eyebrow">DIGITAL TASBIH</span><span className="live-chip"><span/> SESSION</span></div><div className="tasbih-phrase"><span>{adhkar.find(a=>a.title===phrase)?.hint}</span><h2 lang="ar" dir="rtl">{adhkar.find(a=>a.title===phrase)?.arabic}</h2><b>{phrase}</b></div><div className="tasbih-counter-wrap"><div className="tasbih-progress" style={{"--progress":progress+"%"} as React.CSSProperties}><button className="tasbih-count-btn" onClick={()=>setCount(c=>c+1)} aria-label="Increment tasbih"><strong>{count}</strong><small>TAP TO COUNT</small></button></div></div><div className="tasbih-controls"><button className="glass-button" onClick={()=>setCount(0)}><RotateCcw size={15}/> Reset</button><label>Target <select value={target} onChange={e=>setTarget(Number(e.target.value))}><option value={33}>33</option><option value={34}>34</option><option value={99}>99</option><option value={100}>100</option></select></label><span>{count>=target?"Target reached · Alhamdulillah":Math.max(target-count,0)+" remaining"}</span></div></GlassCard><div className="tasbih-side">{adhkar.map(a=><button className={phrase===a.title?"adhkar-choice active":"adhkar-choice"} key={a.title} onClick={()=>{setPhrase(a.title);setCount(0);setTarget(a.target)}}><span lang="ar" dir="rtl">{a.arabic}</span><b>{a.title}</b><small>{a.target} repetitions</small></button>)}<GlassCard><span className="eyebrow">A GENTLE REMINDER</span><p className="glass-small-copy">Take your time. The aim is remembrance with presence, not speed.</p></GlassCard></div></div>;
}
function FeatureGrid({onNavigate}:{onNavigate:(s:string)=>void}) {
 const items=[
  ["Tajweed centre","Learn recitation rules and articulation points","Tajweed",BookOpen,"available"],
  ["Hadith Nawawi","A dedicated path through the Forty Hadith","Hadith",BookHeart,"library"],
  ["AI companion","Ask, reflect and build a learning plan","AI Companion",Sparkles,"setup"],
  ["Noor rewards","A transparent ledger for verified good actions","Noor Wallet",Wallet,"ledger"],
  ["Sadaqa & giving","Support reviewed causes with clear records","Sadaqa",HeartHandshake,"giving"],
  ["Growth planner","Goals, habits and a calmer digital routine","Growth",Target,"planner"],
  ["Jumu'ah & Ramadan","Friday reminders and seasonal worship guides","Calendar",CalendarDays,"planner"],
  ["Qibla finder","Find the direction of the Kaaba","Qibla",Compass,"available"]
 ] as const;
 return <div className="glass-feature-grid">{items.map(([title,desc,page,Icon,status])=><button className="glass-feature-tile" key={title} onClick={()=>onNavigate(page)}><span className="glass-feature-icon"><Icon size={19}/></span><span className="glass-feature-copy"><b>{title}</b><small>{desc}</small></span><span className="glass-feature-arrow"><ChevronRight size={16}/></span></button>)}</div>;
}
function HadithPage() {
 return <div className="glass-page-stack"><SectionTitle eyebrow="PROPHETIC GUIDANCE" title="Hadith Nawawi" description="A focused learning space for Imam al-Nawawi's Forty Hadith, with source references and careful translation review."/><GlassCard className="library-hero"><div className="library-orb"><BookHeart size={35}/></div><div><span className="eyebrow">THE FORTY HADITH</span><h2>Foundations of the faith.</h2><p>The collection will be presented with Arabic text, translation, source grading and study notes. We won't publish unverified quotations.</p><span className="setup-label"><LockKeyhole size={13}/> Curated library integration pending</span></div></GlassCard><div className="glass-feature-grid compact">{["Intention & sincerity","Islam, Iman and Ihsan","The pillars of Islam","Halal, haram and doubtful matters"].map((x,i)=><GlassCard key={x} className="hadith-topic"><span className="topic-number">{String(i+1).padStart(2,"0")}</span><b>{x}</b><small>Study topic · source-reviewed content</small></GlassCard>)}</div></div>;
}
function TajweedPage() {
 const lessons=[["Makharij al-Huruf","Articulation points of Arabic letters","Letter"],["Sifat al-Huruf","Characteristics and qualities of letters","Sound"],["Ahkam an-Noon","Rules of Noon Sakinah and Tanween","Rule"],["Al-Madd","The rules of elongation","Timing"],["Al-Ghunnah","Nasalisation and its application","Sound"],["Waqf & Ibtida","Stopping and starting correctly","Practice"]];
 return <div className="glass-page-stack"><SectionTitle eyebrow="QUR'AN RECITATION" title="Tajweed centre" description="Build confidence step by step, from articulation points to applied recitation. Learn with qualified teachers and verified examples."/><GlassCard className="tajweed-hero"><div><span className="eyebrow">YOUR RECITATION JOURNEY</span><h2>Beautify your recitation<br/><em>with knowledge.</em></h2><p>Structured lessons, listening practice and a place to track what you have learned.</p><div className="setup-label"><Headphones size={14}/> Audio lessons and live coach are planned next</div></div><div className="tajweed-glow"><Volume2 size={42}/><span>تَجْوِيد</span></div></GlassCard><div className="tajweed-grid">{lessons.map(([title,desc,tag],i)=><GlassCard className="tajweed-lesson" key={title}><span className="lesson-index">{String(i+1).padStart(2,"0")}</span><div><span className="eyebrow">{tag}</span><h3>{title}</h3><p>{desc}</p></div><span className="lesson-status">Coming soon</span></GlassCard>)}</div></div>;
}
function AIPage({onToast}:{onToast:(s:string)=>void}) {
 const [prompt,setPrompt]=useState("");
 return <div className="glass-page-stack"><SectionTitle eyebrow="SABILY INTELLIGENCE" title="Your learning companion" description="A thoughtful assistant for study plans, Qur'an learning and everyday questions — with clear source references and limits."/><GlassCard className="ai-companion-card"><div className="ai-orb"><Sparkles size={28}/></div><span className="eyebrow">SABILY AI</span><h2>Assalamu alaykum. What would you like to learn today?</h2><p>Ask for explanations, study plans or help finding trusted sources. The assistant will distinguish sourced information from general guidance and won't issue authoritative fatwas.</p><div className="ai-suggestions">{["Build me a Qur'an study plan","Explain a Tajweed rule","Help me learn the Forty Hadith"].map(x=><button key={x} onClick={()=>setPrompt(x)}>{x}<ChevronRight size={14}/></button>)}</div><div className="ai-input-row"><input value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Ask Sabily AI…"/><button onClick={()=>onToast("AI provider key is not configured yet. Add it in Supabase Edge Function secrets to activate the assistant.")}><Sparkles size={17}/></button></div><div className="setup-label"><LockKeyhole size={13}/> AI service awaits its secure provider key</div></GlassCard></div>;
}
function NoorPage({onToast}:{onToast:(s:string)=>void}) {
 return <div className="glass-page-stack"><SectionTitle eyebrow="GOODNESS, MADE VISIBLE" title="Noor rewards" description="A transparent points ledger for verified learning, service and community contributions. Noor points are not cryptocurrency or cash."/><GlassCard className="noor-balance"><div><span className="eyebrow">YOUR NOOR BALANCE</span><div className="noor-value">0 <small>NOOR</small></div><p>Points will be earned through approved activities and recorded transparently.</p></div><div className="noor-coin"><Sparkles size={32}/></div><div className="noor-balance-foot"><span><ShieldCheck size={14}/> Auditable reward ledger</span><span>Not redeemable for cash at this stage</span></div></GlassCard><div className="noor-rules">{[[BookOpen,"Learning","Complete verified learning activities"],[Heart,"Giving","Support reviewed Sadaqa campaigns"],[Users,"Community","Contribute positively to your circles"],[Activity,"Consistency","Build healthy worship and learning habits"]].map(([Icon,title,desc]:any)=><GlassCard className="noor-rule" key={title}><Icon size={19}/><div><b>{title}</b><small>{desc}</small></div><span>Coming soon</span></GlassCard>)}</div><GlassCard className="ledger-note"><Coins size={18}/><p>Future cashback or token features require a compliant payment partner, transparent terms, fraud controls and legal review. No monetary value is promised.</p></GlassCard></div>;
}
function SadaqaPage({onToast}:{onToast:(s:string)=>void}) {
 return <div className="glass-page-stack"><SectionTitle eyebrow="GIVE WITH TRUST" title="Sadaqa & giving" description="A clear place for charitable campaigns, sadaqa contributions and community support."/><GlassCard className="giving-hero"><div><span className="eyebrow">A GOOD DEED CAN TRAVEL FAR</span><h2>Give with intention.<br/><em>See the impact.</em></h2><p>Every campaign should show its organiser, beneficiary, purpose, fees and delivery updates before contributions are accepted.</p><button className="glass-primary" onClick={()=>onToast("Verified donation campaigns and payment processing are being prepared. No payments are collected in this preview.")}>Explore giving <ChevronRight size={16}/></button></div><div className="giving-icon"><HandHeart size={42}/></div></GlassCard><div className="giving-trust-grid">{[[ShieldCheck,"Verified organisers","Identity and beneficiary checks"],[Activity,"Transparent reporting","Updates on funds and outcomes"],[Heart,"Voluntary giving","No pressure or manipulative prompts"]].map(([Icon,title,desc]:any)=><GlassCard className="giving-trust" key={title}><Icon size={20}/><b>{title}</b><small>{desc}</small></GlassCard>)}</div><p className="glass-footnote">Payment collection is not active in this preview. Donation records and payment settlement will only be enabled after a compliant provider is integrated.</p></div>;
}
function GrowthPage() {
 const goals=["Read a portion of Qur'an","Pray all five daily prayers","Morning and evening adhkar","Learn one new Islamic concept","Do one act of service"];
 const key="sabily-growth-"+new Date().toISOString().slice(0,10);
 const [checked,setChecked]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem(key)||"[]")}catch{return[]}});
 useEffect(()=>{localStorage.setItem(key,JSON.stringify(checked))},[checked,key]);
 return <div className="glass-page-stack"><SectionTitle eyebrow="SMALL STEPS, LASTING IMPACT" title="Your growth planner" description="A gentle daily plan that supports consistency without guilt, streak pressure or endless scrolling."/><GlassCard className="growth-progress"><div><span className="eyebrow">TODAY'S INTENTIONS</span><h2>{checked.length} of {goals.length} completed</h2><p>Every sincere step matters. Pick what is realistic for your day.</p></div><div className="growth-progress-bar"><span style={{width:(checked.length/goals.length*100)+"%"}}/></div></GlassCard><GlassCard className="growth-list">{goals.map(g=><button key={g} className={checked.includes(g)?"growth-goal done":"growth-goal"} onClick={()=>setChecked(old=>old.includes(g)?old.filter(x=>x!==g):[...old,g])}><span>{checked.includes(g)?<Check size={16}/>:<span/>}</span>{g}</button>)}</GlassCard></div>;
}

export default function GlassModule({page,displayName,city,prayerTimes,prayerDate,onNavigate,onToast}:ModuleProps) {
 if(page==="Tasbih")return <Tasbih/>;
 if(page==="Hadith")return <HadithPage/>;
 if(page==="Tajweed")return <TajweedPage/>;
 if(page==="AI Companion")return <AIPage onToast={onToast}/>;
 if(page==="Noor Wallet")return <NoorPage onToast={onToast}/>;
 if(page==="Sadaqa")return <SadaqaPage onToast={onToast}/>;
 if(page==="Growth")return <GrowthPage/>;
 if(page==="Worship")return <div className="glass-page-stack"><SectionTitle eyebrow="IBADAH & DAILY RHYTHM" title={"Your worship, "+displayName} description={"Prayer times for "+city+". Build a gentle rhythm of worship and remembrance."}/><PrayerTracker prayerTimes={prayerTimes} onToast={onToast}/><div className="glass-feature-grid compact"><button className="glass-feature-tile" onClick={()=>onNavigate("Tasbih")}><span className="glass-feature-icon"><Activity size={19}/></span><span className="glass-feature-copy"><b>Tasbih & adhkar</b><small>Remember Allah with presence</small></span><ChevronRight size={16}/></button><button className="glass-feature-tile" onClick={()=>onNavigate("Prayer")}><span className="glass-feature-icon"><Clock3 size={19}/></span><span className="glass-feature-copy"><b>Prayer schedule</b><small>{prayerDate||"Local prayer timings"}</small></span><ChevronRight size={16}/></button><button className="glass-feature-tile" onClick={()=>onNavigate("Calendar")}><span className="glass-feature-icon"><CalendarDays size={19}/></span><span className="glass-feature-copy"><b>Jumu'ah & Ramadan</b><small>Friday and seasonal worship</small></span><ChevronRight size={16}/></button></div></div>;
 if(page==="Calendar")return <div className="glass-page-stack"><SectionTitle eyebrow="HIJRI RHYTHM" title="Islamic calendar" description="Plan around Jumu'ah, Ramadan, Taraweeh and meaningful dates. Local moon-sighting announcements will be clearly attributed."/><GlassCard className="calendar-card"><MoonStar size={27}/><div><span className="eyebrow">HIJRI DATE</span><h2>{new Intl.DateTimeFormat("en-u-ca-islamic", {day:"numeric",month:"long",year:"numeric"}).format(new Date())}</h2><p>Calendar dates are indicative. Confirm Ramadan and Eid with your trusted local authority.</p></div></GlassCard><div className="glass-feature-grid compact">{[["Jumu'ah","Friday reminders and Sunnah checklist"],["Ramadan","Fasting, Taraweeh and nightly reflection"],["Taraweeh","Personal prayer notes and reading plan"]].map(([t,d])=><GlassCard className="calendar-topic" key={t}><CalendarDays size={18}/><b>{t}</b><small>{d}</small><span className="setup-label">Planning module</span></GlassCard>)}</div></div>;
 if(page==="Reminders")return <div className="glass-page-stack"><SectionTitle eyebrow="GENTLE NUDGES" title="Reminders" description="Choose helpful reminders for prayer, adhkar, Jumu'ah and learning. Notifications are opt-in and quiet by default."/><GlassCard className="reminder-card"><Bell size={25}/><h2>Reminders are opt-in.</h2><p>Browser notifications and scheduled reminders will be connected after notification permissions and delivery infrastructure are configured.</p><span className="setup-label"><LockKeyhole size={13}/> Notification delivery not active in this preview</span></GlassCard></div>;
 return <div className="glass-page-stack"><SectionTitle eyebrow="SABILY · YOUR PATH" title="Your space" description="A connected home for worship, learning, community and giving."/><FeatureGrid onNavigate={onNavigate}/></div>;
}
