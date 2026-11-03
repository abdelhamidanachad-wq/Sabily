import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Check, Clock3, Headphones, Info, Play, Save, Volume2 } from "lucide-react";
import { supabase } from "./supabase";

type Voice = { id: string; name: string; region: string; audio_url: string; attribution: string };
type Settings = { enabled: boolean; fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean; adhan_voice: string; adhan_audio_url: string | null; notification_mode: "notification" | "adhan_foreground"; timezone: string };
const defaults: Settings = { enabled: false, fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true, adhan_voice: "none", adhan_audio_url: null, notification_mode: "notification", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Casablanca" };
const prayers = [{key:"fajr",name:"Fajr"},{key:"dhuhr",name:"Dhuhr"},{key:"asr",name:"Asr"},{key:"maghrib",name:"Maghrib"},{key:"isha",name:"Isha"}];

type Props = { userId: string; city: string; prayerTimes: Record<string,string> | null; onToast: (message:string)=>void };

export default function PrayerExperience({userId,city,prayerTimes,onToast}:Props) {
  const [settings,setSettings] = useState<Settings>(defaults);
  const [voices,setVoices] = useState<Voice[]>([]);
  const [loaded,setLoaded] = useState(false);
  const [permission,setPermission] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [pushRegistered,setPushRegistered] = useState(false);
  const [saving,setSaving] = useState(false);
  const [nextLabel,setNextLabel] = useState("");
  const [scheduleTick,setScheduleTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement|null>(null);

  useEffect(()=>{
    let active=true;
    void (async()=>{
      if(!supabase){setLoaded(true);return;}
      const [prefs,library] = await Promise.all([
        supabase.from("sabily_prayer_settings").select("*").eq("user_id",userId).maybeSingle(),
        supabase.from("sabily_adhan_voices").select("id,name,region,audio_url,attribution").eq("active",true).order("region").order("name")
      ]);
      if(!active)return;
      if(prefs.data)setSettings({...defaults,...prefs.data});
      if(library.data)setVoices(library.data as Voice[]);
      const {data:pushRows}=await supabase.from("sabily_push_subscriptions").select("id").eq("user_id",userId).eq("enabled",true).limit(1);
      if(active)setPushRegistered(Boolean(pushRows?.length));
      if(library.error)onToast("Adhan voice library is not ready yet. Apply the private-beta database migrations.");
      setLoaded(true);
    })();
    return ()=>{active=false};
  },[userId]);

  const selectedVoice=useMemo(()=>voices.find(v=>v.id===settings.adhan_voice)||null,[voices,settings.adhan_voice]);
  const save=async(next:Settings)=>{
    setSettings(next);
    if(!supabase)return;
    setSaving(true);
    const {error}=await supabase.from("sabily_prayer_settings").upsert({user_id:userId,...next,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    setSaving(false);
    if(error)onToast("Could not save prayer settings: "+error.message);
    else onToast("Prayer and Adhan preferences saved.");
  };
  const update=(patch:Partial<Settings>)=>void save({...settings,...patch});

  const enableNotifications=async()=>{
    if(typeof Notification==="undefined"){onToast("This browser does not support notifications.");return;}
    if(!("serviceWorker" in navigator)){onToast("Service workers are unavailable in this browser.");return;}
    const result=await Notification.requestPermission();
    setPermission(result);
    if(result!=="granted"){onToast("Allow notifications in your browser settings to receive prayer alerts.");return;}
    try{
      const registration=await navigator.serviceWorker.ready;
      const vapid=import.meta.env.VITE_VAPID_PUBLIC_KEY as string|undefined;
      if(vapid&&supabase){
        let subscription=await registration.pushManager.getSubscription();
        if(!subscription){
          const pad="=".repeat((4-vapid.length%4)%4);
          const raw=atob((vapid+pad).replace(/-/g,"+").replace(/_/g,"/"));
          const applicationServerKey=Uint8Array.from(raw,char=>char.charCodeAt(0));
          subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});
        }
        const serialized=subscription.toJSON();
        const {error}=await supabase.from("sabily_push_subscriptions").upsert({user_id:userId,endpoint:subscription.endpoint,p256dh:serialized.keys?.p256dh,auth_secret:serialized.keys?.auth,user_agent:navigator.userAgent,enabled:true,last_seen_at:new Date().toISOString()},{onConflict:"user_id,endpoint"});
        if(error)throw error;
        setPushRegistered(true);
      }
      await registration.showNotification("Sabily prayer alerts enabled",{body:vapid?"This device is subscribed to prayer push alerts.":"Foreground reminders are enabled. Background delivery still needs VAPID configuration.",icon:"/sabily-mark.svg",tag:"sabily-prayer-enabled"});
      update({enabled:true});
    }catch(error){onToast(error instanceof Error?error.message:"Could not enable browser notifications.");}
  };

  const playAdhan=async()=>{
    const url=selectedVoice?.audio_url||settings.adhan_audio_url;
    if(!url){onToast("Choose an Adhan recording from the voice library first.");return;}
    if(!audioRef.current){audioRef.current=new Audio(url);}
    if(audioRef.current.src!==url)audioRef.current.src=url;
    audioRef.current.currentTime=0;
    try{await audioRef.current.play();}catch{onToast("Your browser blocked audio playback. Tap Preview Adhan again.");}
  };


  useEffect(()=>{
    if(!settings.enabled||permission!=="granted"||!pushRegistered||!prayerTimes||!supabase)return;
    const now=new Date();
    const rows=prayers.filter(p=>settings[p.key as keyof Settings]===true).map(p=>{
      const raw=prayerTimes[p.name];const match=String(raw||"").match(/(\d{1,2}):(\d{2})/);if(!match)return null;
      const at=new Date(now);at.setHours(Number(match[1]),Number(match[2]),0,0);if(at<=now)at.setDate(at.getDate()+1);
      return {user_id:userId,prayer_name:p.name,scheduled_at:at.toISOString(),timezone:settings.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"};
    }).filter(Boolean);
    if(rows.length)void supabase.from("sabily_prayer_schedule").upsert(rows as any[],{onConflict:"user_id,prayer_name,scheduled_at",ignoreDuplicates:true});
  },[settings,permission,pushRegistered,prayerTimes,userId]);

  useEffect(()=>{
    if(!settings.enabled||permission!=="granted"||pushRegistered||!prayerTimes)return;
    const now=new Date();
    const candidates=prayers.filter(p=>settings[p.key as keyof Settings]===true).map(p=>{
      const raw=prayerTimes[p.name];
      if(!raw)return null;
      const match=String(raw).match(/(\d{1,2}):(\d{2})/);
      if(!match)return null;
      const at=new Date(now);
      at.setHours(Number(match[1]),Number(match[2]),0,0);
      if(at<=now)at.setDate(at.getDate()+1);
      return {name:p.name,at};
    }).filter(Boolean) as {name:string;at:Date}[];
    candidates.sort((a,b)=>a.at.getTime()-b.at.getTime());
    const next=candidates[0];
    if(!next)return;
    setNextLabel(next.name+" · "+next.at.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}));
    const delay=next.at.getTime()-Date.now();
    const timer=window.setTimeout(async()=>{
      const title=next.name+" prayer time";
      const body="It is time for "+next.name+" in "+city+".";
      try{
        const registration=await navigator.serviceWorker.ready;
        await registration.showNotification(title,{body,icon:"/sabily-mark.svg",badge:"/sabily-mark.svg",tag:"sabily-prayer-"+next.name.toLowerCase(),data:{url:"/app/prayer"}});
      }catch{new Notification(title,{body,icon:"/sabily-mark.svg"});}
      if(settings.notification_mode==="adhan_foreground"&&(selectedVoice?.audio_url||settings.adhan_audio_url))await playAdhan();
      setScheduleTick(value=>value+1);
    },Math.min(delay,2147483000));
    return ()=>window.clearTimeout(timer);
  },[settings,permission,prayerTimes,city,selectedVoice,scheduleTick]);

  return <section className="prayer-experience">
    <div className="prayer-experience-head"><div className="prayer-experience-icon"><BellRing size={20}/></div><div><span className="eyebrow">YOUR DAILY PRAYER RHYTHM</span><h3>Adhan & prayer reminders</h3><p>Choose a recorded Adhan voice, set prayer alerts and test the sound on this device.</p></div><span className={settings.enabled&&permission==="granted"?"prayer-ready":"prayer-pending"}>{settings.enabled&&permission==="granted"?"Alerts enabled":"Setup needed"}</span></div>
    <div className="prayer-alert-callout"><Info size={16}/><span>Browser reminders can fire while Sabily is open or its reminder worker is active. Reliable delivery after the browser is fully closed requires the server-side scheduled push service and VAPID deployment.</span></div>
    <div className="prayer-reminder-controls"><div><b>Prayer notifications</b><small>Ask this browser for permission, then enable your prayer schedule.</small></div><button className="admin-action-btn" onClick={()=>void enableNotifications()} disabled={!loaded||permission==="unsupported"}><BellRing size={14}/> {permission==="granted"?"Enable prayer alerts":"Allow notifications"}</button></div>
    <div className="prayer-toggle-grid">{prayers.map(p=><label key={p.key}><span>{p.name}</span><input type="checkbox" checked={settings[p.key as keyof Settings] as boolean} disabled={!loaded||saving} onChange={e=>update({[p.key]:e.target.checked})}/></label>)}</div>
    <div className="prayer-voice-row"><label htmlFor="adhan-voice">Adhan voice recording</label><select id="adhan-voice" value={settings.adhan_voice} disabled={!loaded||saving} onChange={e=>{const voice=voices.find(v=>v.id===e.target.value);update({adhan_voice:e.target.value,adhan_audio_url:voice?.audio_url||null});}}><option value="none">No Adhan audio selected</option>{voices.map(v=><option key={v.id} value={v.id}>{v.name} · {v.region}</option>)}</select><button className="admin-action-btn" onClick={()=>void playAdhan()} disabled={!selectedVoice&&!settings.adhan_audio_url}><Play size={14}/> Preview Adhan</button></div>
    {selectedVoice&&<p className="prayer-attribution"><Headphones size={13}/> {selectedVoice.attribution}</p>}
    <label className="prayer-audio-mode"><span><b>Play Adhan while Sabily is open</b><small>Audio playback may be blocked by browser autoplay rules. Preview once to authorize audio.</small></span><input type="checkbox" checked={settings.notification_mode==="adhan_foreground"} onChange={e=>update({notification_mode:e.target.checked?"adhan_foreground":"notification"})}/></label>
    <div className="prayer-experience-foot"><span><Clock3 size={14}/> {nextLabel?"Next alert: "+nextLabel:"Enable alerts to schedule the next prayer."}</span><span>{permission==="granted"?"Browser permission granted":"Browser permission: "+permission}</span></div>
    {voices.length===0&&<p className="prayer-library-empty"><Volume2 size={15}/> No recordings have been added yet. A super-admin can add licensed Adhan recordings to the voice library from the admin workspace.</p>}
    <audio ref={audioRef} preload="none" hidden/>
    {saving&&<small className="prayer-saving"><Save size={12}/> Saving preferences…</small>}
  </section>;
}
