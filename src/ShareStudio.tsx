import { useMemo, useRef, useState } from "react";
import { Download, Share2, Copy, Sparkles, Image as ImageIcon, MessageCircle } from "lucide-react";

type CardKind = "adhkar" | "ayah" | "hadith" | "occasion";
type CardItem = { id:string; kind:CardKind; title:string; arabic:string; translation:string; reference:string; occasion?:string };
const cards:CardItem[] = [
 {id:"morning",kind:"adhkar",title:"A moment of remembrance",arabic:"سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",translation:"Glory be to Allah and praise is for Him.",reference:"Dhikr · Sahih al-Bukhari 6405"},
 {id:"evening",kind:"adhkar",title:"A gentle reminder",arabic:"لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",translation:"There is no power and no strength except through Allah.",reference:"Dhikr · Sahih al-Bukhari 6384"},
 {id:"ayah",kind:"ayah",title:"A promise of ease",arabic:"فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا",translation:"For indeed, with hardship comes ease. Indeed, with hardship comes ease.",reference:"Qur’an · Surah Ash-Sharh 94:5–6"},
 {id:"ayah2",kind:"ayah",title:"Remember your Lord",arabic:"فَاذْكُرُونِي أَذْكُرْكُمْ",translation:"So remember Me; I will remember you.",reference:"Qur’an · Al-Baqarah 2:152"},
 {id:"hadith",kind:"hadith",title:"The best among you",arabic:"خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",translation:"The best of you are those who learn the Qur’an and teach it.",reference:"Sahih al-Bukhari 5027"},
 {id:"eid",kind:"occasion",title:"Eid Mubarak",arabic:"عِيدٌ مُبَارَكٌ",translation:"May Allah accept your good deeds and fill your Eid with peace, joy and barakah.",reference:"Share the joy · From Sabily",occasion:"EID MUBARAK"},
 {id:"jumuah",kind:"occasion",title:"Jumu’ah Mubarak",arabic:"جُمُعَةٌ مُبَارَكَةٌ",translation:"May your Friday be filled with remembrance, mercy and blessings.",reference:"A blessed Friday · From Sabily",occasion:"JUMU’AH MUBARAK"},
 {id:"ramadan",kind:"occasion",title:"Ramadan Kareem",arabic:"رَمَضَانُ كَرِيمٌ",translation:"May this month bring you closer to Allah and fill your days with mercy.",reference:"A Ramadan greeting · From Sabily",occasion:"RAMADAN KAREEM"}
];
const palettes=[["#102e2a","#1b6253","#d9b878"],["#172744","#365a78","#e4c68d"],["#382a4e","#72517e","#e9cda0"],["#1c463c","#66846b","#e7d8ae"]];
export default function ShareStudio(){
 const [kind,setKind]=useState<CardKind>("adhkar"),[selected,setSelected]=useState("morning"),[palette,setPalette]=useState(0),[custom,setCustom]=useState("");
 const [status,setStatus]=useState("");
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const item=useMemo(()=>cards.find(x=>x.id===selected)||cards[0],[selected]);
 const visible=cards.filter(x=>x.kind===kind);
 const renderCard=async()=>{
  const canvas=canvasRef.current;if(!canvas)return null;
  const ctx=canvas.getContext("2d");if(!ctx)return null;
  const [c1,c2,gold]=palettes[palette];const w=1080,h=1350;canvas.width=w;canvas.height=h;
  const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,c1);grad.addColorStop(1,c2);ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle=gold+"88";ctx.lineWidth=2;
  for(let i=0;i<9;i++){ctx.beginPath();ctx.arc(w/2,h/2,170+i*55,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle=gold;ctx.textAlign="center";ctx.font="600 28px Arial";ctx.fillText("✦  S A B I L Y  ✦",w/2,115);
  ctx.fillStyle="#ffffff";ctx.font="500 38px Arial";ctx.fillText(item.occasion||item.title,w/2,290);
  ctx.fillStyle="#fffaf0";ctx.font="bold 66px 'Noto Naskh Arabic','Amiri',serif";
  const words=item.arabic.split(" ");let lines:string[]=[];let line="";
  for(const word of words){const next=line?line+" "+word:word;if(ctx.measureText(next).width>w-170){lines.push(line);line=word}else line=next}if(line)lines.push(line);
  lines.forEach((l,i)=>ctx.fillText(l,w/2,550+i*105));
  ctx.fillStyle="#f6f0e3";ctx.font="36px Arial";const text=custom.trim()||item.translation;
  const chunks=text.split(" ");let tline="";let rows:string[]=[];
  for(const word of chunks){const next=tline?tline+" "+word:word;if(ctx.measureText(next).width>w-180){rows.push(tline);tline=word}else tline=next}if(tline)rows.push(tline);
  rows.slice(0,4).forEach((l,i)=>ctx.fillText(l,w/2,900+i*55));
  ctx.fillStyle=gold;ctx.font="26px Arial";ctx.fillText(item.reference,w/2,1160);
  ctx.fillStyle="#ffffff";ctx.font="bold 31px Arial";ctx.fillText("sabily",w/2,1275);
  ctx.font="18px Arial";ctx.fillText("A BETTER PATH, TOGETHER",w/2,1310);
  return await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
 };
 const download=async()=>{const blob=await renderCard();if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="sabily-"+item.id+".png";a.click();URL.revokeObjectURL(url);setStatus("Image downloaded — ready to share.");};
 const share=async()=>{const blob=await renderCard();if(!blob)return;const file=new File([blob],"sabily-"+item.id+".png",{type:"image/png"});try{if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:item.title,text:item.translation});setStatus("Share sheet opened.");}else{await download();setStatus("Image downloaded. Attach it to your WhatsApp or social post.");}}catch(e){if(e instanceof Error&&e.name!=="AbortError")setStatus("Sharing isn't available here. Download the image instead.");}};
 const copyText=async()=>{await navigator.clipboard?.writeText(item.arabic+"\n"+(custom.trim()||item.translation)+"\n"+item.reference+"\n— Sabily");setStatus("Caption copied.");};
 const whatsapp=()=>{const text=encodeURIComponent(item.arabic+"\n"+(custom.trim()||item.translation)+"\n"+item.reference+"\n— Sabily");window.open("https://wa.me/?text="+text,"_blank","noopener,noreferrer");setStatus("WhatsApp opened. Attach the downloaded Sabily image for the branded card.");};
 return <div className="ecosystem-stack share-studio"><div className="ecosystem-header"><span className="eyebrow">SABILY · SHARE GOODNESS</span><h1>Share a reminder</h1><p>Create beautiful, watermarked Islamic greeting cards and reminders for WhatsApp, Instagram and Facebook.</p></div>
  <div className="share-kind-tabs">{([{id:"adhkar",label:"Adhkar"},{id:"ayah",label:"Qur’an ayat"},{id:"hadith",label:"Hadith"},{id:"occasion",label:"Greetings"}] as {id:CardKind;label:string}[]).map(x=><button key={x.id} className={kind===x.id?"active":""} onClick={()=>{setKind(x.id);setSelected(cards.find(c=>c.kind===x.id)!.id);setCustom("");}}>{x.label}</button>)}</div>
  <div className="share-studio-grid"><section className="ecosystem-card share-editor"><label className="studio-label">Choose a card</label><div className="share-choices">{visible.map(x=><button key={x.id} className={selected===x.id?"selected":""} onClick={()=>{setSelected(x.id);setCustom("");}}><b>{x.occasion||x.title}</b><small>{x.reference}</small></button>)}</div><label className="studio-label">Personal message (optional)</label><textarea className="studio-textarea" rows={3} maxLength={180} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Add a short personal message…"/><label className="studio-label">Card theme</label><div className="share-palettes">{palettes.map((p,i)=><button key={i} aria-label={"Theme "+(i+1)} className={palette===i?"selected":""} onClick={()=>setPalette(i)} style={{background:"linear-gradient(135deg,"+p[0]+","+p[1]+")"}}><span style={{background:p[2]}}/></button>)}</div><div className="share-actions"><button className="ecosystem-primary" onClick={share}><Share2 size={16}/> Share image</button><button className="ecosystem-secondary" onClick={download}><Download size={16}/> Download PNG</button><button className="ecosystem-secondary" onClick={whatsapp}><MessageCircle size={16}/> WhatsApp</button><button className="ecosystem-secondary" onClick={copyText}><Copy size={16}/> Copy text</button></div><p className="ecosystem-footnote">On supported phones, Share image opens the system share sheet so you can choose WhatsApp, Instagram Stories or Facebook. Otherwise download the PNG and attach it manually.</p>{status&&<p className="share-status" role="status">{status}</p>}</section>
  <section className="ecosystem-card share-preview"><div className="share-preview-head"><span><ImageIcon size={16}/> Live preview</span><span className="share-watermark-pill"><Sparkles size={13}/> Sabily watermark</span></div><div className="share-art" style={{background:"linear-gradient(145deg,"+palettes[palette][0]+","+palettes[palette][1]+")"}}><div className="share-art-ornament"/><span className="share-art-brand">✦ S A B I L Y ✦</span><h2>{item.occasion||item.title}</h2><div className="share-art-arabic" dir="rtl" lang="ar">{item.arabic}</div><p>{custom.trim()||item.translation}</p><small>{item.reference}</small><div className="share-art-watermark">sabily <span>· A BETTER PATH, TOGETHER</span></div></div></section></div>
  <canvas ref={canvasRef} className="share-hidden-canvas" aria-hidden="true"/>
 </div>;
}
