import {useEffect,useState} from "react";
import {supabase} from "./supabase";
import {Cpu,ShieldCheck,Wifi,PlugZap,Info,LockKeyhole} from "lucide-react";

type Props={userId:string;onToast:(message:string)=>void};
type Preferences={opted_in:boolean;max_cpu_percent:number;wifi_only:boolean;charging_only:boolean;allow_background:boolean};
const defaults:Preferences={opted_in:false,max_cpu_percent:20,wifi_only:true,charging_only:true,allow_background:false};

export default function NoorCompute({userId,onToast}:Props){
 const [prefs,setPrefs]=useState<Preferences>(defaults);
 const [loaded,setLoaded]=useState(false);
 const [saving,setSaving]=useState(false);
 useEffect(()=>{let active=true;(async()=>{if(supabase){const {data,error}=await supabase.from("sabily_compute_preferences").select("opted_in,max_cpu_percent,wifi_only,charging_only,allow_background").eq("user_id",userId).maybeSingle();if(error&&active){onToast("Noor Compute settings are not available yet. Apply the Noor Compute database migration first.");}if(data&&active)setPrefs({...defaults,...data});}if(active)setLoaded(true)})();return()=>{active=false}},[userId]);
 const save=async(next:Preferences)=>{setPrefs(next);if(!supabase){onToast("Connect Sabily to save your compute preferences.");return;}setSaving(true);const {error}=await supabase.from("sabily_compute_preferences").upsert({user_id:userId,...next,updated_at:new Date().toISOString()},{onConflict:"user_id"});setSaving(false);if(error){setPrefs(prefs);onToast("Could not save compute consent: "+error.message);}else onToast(next.opted_in?"Your opt-in preference is saved. Compute will not start until a verified workload is enabled.":"Compute contribution is switched off.");};
 const update=(patch:Partial<Preferences>)=>save({...prefs,...patch});
 return <section className="noor-compute-card">
  <div className="noor-compute-head"><div className="noor-compute-icon"><Cpu size={22}/></div><div><span className="eyebrow">SABILY NOOR COMPUTE</span><h3>Turn spare computing into useful work.</h3></div><span className="compute-status">Pilot setup</span></div>
  <p className="noor-compute-intro">Optionally contribute a small, capped share of your device's spare processing power to approved public-benefit computing projects. Your dhikr remains private and never determines your rewards.</p>
  <div className="compute-principles"><span><ShieldCheck size={15}/> Explicit opt-in</span><span><Wifi size={15}/> Wi-Fi only by default</span><span><PlugZap size={15}/> Charging only by default</span></div>
  <label className="compute-consent-row"><span><b>Allow compute contributions</b><small>Off by default. You can stop at any time.</small></span><input type="checkbox" checked={prefs.opted_in} disabled={!loaded||saving} onChange={e=>update({opted_in:e.target.checked})}/></label>
  <div className="compute-controls">
   <label><span>Maximum CPU share</span><select value={prefs.max_cpu_percent} disabled={!loaded||saving} onChange={e=>update({max_cpu_percent:Number(e.target.value)})}><option value={5}>5%</option><option value={10}>10%</option><option value={20}>20%</option><option value={30}>30%</option></select></label>
   <label className="compute-check"><input type="checkbox" checked={prefs.wifi_only} disabled={!loaded||saving} onChange={e=>update({wifi_only:e.target.checked})}/> Wi-Fi only</label>
   <label className="compute-check"><input type="checkbox" checked={prefs.charging_only} disabled={!loaded||saving} onChange={e=>update({charging_only:e.target.checked})}/> Only while charging</label>
   <label className="compute-check"><input type="checkbox" checked={prefs.allow_background} disabled={!loaded||saving} onChange={e=>update({allow_background:e.target.checked})}/> Allow background compute</label>
  </div>
  <div className="compute-honesty"><Info size={16}/><p><b>Not running yet.</b> This release saves your consent and safety limits only. No mining, background task or device workload starts until Sabily publishes an independently reviewed compute job and deploys its verifier.</p></div>
  <div className="compute-trust"><LockKeyhole size={14}/> Rewards are based only on server-verified useful compute units—not dhikr taps, prayer logs, screen time or time spent in worship.</div>
  <small className="compute-save-state">{saving?"Saving preferences…":loaded?"Your current settings are saved to your Sabily account.":"Loading your settings…"}</small>
 </section>;
}
