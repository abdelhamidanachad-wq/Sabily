import { useEffect, useState, type FormEvent } from "react";
import { Gift, LoaderCircle, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "./supabase";

export default function NoorSandboxAdmin(){
 const [enabled,setEnabled]=useState(false),[entries,setEntries]=useState(0),[members,setMembers]=useState(0);
 const [email,setEmail]=useState(""),[points,setPoints]=useState("100"),[reason,setReason]=useState("Private beta test credit");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 const refresh=async()=>{if(!supabase)return;const {data,error:invokeError}=await supabase.functions.invoke("sabily-noor-sandbox",{body:{action:"status"}});if(invokeError||data?.error){setError(invokeError?.message||data?.error||"Could not load Noor sandbox.");return;}setEnabled(Boolean(data.enabled));setEntries(data.entries||0);setMembers(data.memberAccounts||0);};
 useEffect(()=>{void refresh()},[]);
 const toggle=async()=>{setBusy(true);setError("");setMessage("");const {data,error:invokeError}=await supabase!.functions.invoke("sabily-noor-sandbox",{body:{action:"set_enabled",enabled:!enabled}});setBusy(false);if(invokeError||data?.error){setError(invokeError?.message||data?.error||"Could not update test mode.");return;}setEnabled(Boolean(data.enabled));setMessage(data.enabled?"Noor test points are now enabled for the private beta.":"Noor test-point issuance is paused.");};
 const grant=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError("");setMessage("");const {data,error:invokeError}=await supabase!.functions.invoke("sabily-noor-sandbox",{body:{action:"grant_points",email,points:Number(points),reason}});setBusy(false);if(invokeError||data?.error){setError(invokeError?.message||data?.error||"Could not grant test points.");return;}setMessage("Added "+data.entry.points+" non-redeemable test points to "+email+".");setEmail("");await refresh();};
 return <section className="noor-sandbox-admin">
  <div className="noor-sandbox-head"><div><span className="eyebrow">SUPER ADMIN · INTERNAL TEAM TEST</span><h3>Noor rewards sandbox</h3><p>Issue test points to your team without touching the financial Noor ledger, donations or payouts.</p></div><div className="noor-sandbox-icon"><Gift size={23}/></div></div>
  <div className="noor-sandbox-stats"><article><b>{members.toLocaleString()}</b><small>Member accounts</small></article><article><b>{entries.toLocaleString()}</b><small>Test ledger entries</small></article><article><b>{enabled?"ON":"OFF"}</b><small>Test issuance</small></article></div>
  <div className="noor-sandbox-toggle"><div><b>Private beta test mode</b><small>Only enables non-redeemable sandbox points. No cash value, transfers or withdrawals.</small></div><button disabled={busy} onClick={()=>void toggle()} aria-label={enabled?"Pause Noor test mode":"Enable Noor test mode"}>{enabled?<ToggleRight size={30}/>:<ToggleLeft size={30}/>} {enabled?"Enabled":"Disabled"}</button></div>
  <form className="noor-sandbox-grant" onSubmit={grant}><h4>Grant test points to a member</h4><label>Member email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="member@example.com"/></label><div className="noor-sandbox-form-row"><label>Points<input type="number" min="1" max="10000" required value={points} onChange={e=>setPoints(e.target.value)}/></label><label>Reason<input required minLength={3} maxLength={250} value={reason} onChange={e=>setReason(e.target.value)}/></label></div><button className="admin-action-btn" disabled={!enabled||busy}><Gift size={14}/> {busy?<LoaderCircle size={14}/>:"Grant sandbox points"}</button></form>
  <div className="noor-sandbox-guard"><ShieldCheck size={16}/><span>Test ledger is isolated from production Noor balances. Worship activity is never scored. Do not announce monetary value or redemption during beta.</span></div>
  {error&&<p className="notice error">{error}</p>}{message&&<p className="notice success">{message}</p>}
 </section>;
}
