import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import webpush from "npm:web-push@3.6.7";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:cors});
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!token||!url||!service)return new Response(JSON.stringify({error:"Server configuration missing"}),{status:401,headers:cors});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authErr}=await admin.auth.getUser(token);
 if(authErr||!auth.user)return new Response(JSON.stringify({error:"Invalid session"}),{status:401,headers:cors});
 const {data:role}=await admin.from("sabily_user_roles").select("role").eq("user_id",auth.user.id).maybeSingle();
 if(!role||!["admin","super_admin"].includes(role.role))return new Response(JSON.stringify({error:"Admin access required"}),{status:403,headers:cors});
 const publicKey=Deno.env.get("VAPID_PUBLIC_KEY"),privateKey=Deno.env.get("VAPID_PRIVATE_KEY"),subject=Deno.env.get("VAPID_SUBJECT")||"mailto:hello@sabily.io";
 if(!publicKey||!privateKey)return new Response(JSON.stringify({error:"Configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY Edge Function secrets first."}),{status:503,headers:cors});
 let body:{notificationId?:string};try{body=await req.json()}catch{return new Response(JSON.stringify({error:"Invalid JSON"}),{status:400,headers:cors})}
 if(!body.notificationId)return new Response(JSON.stringify({error:"notificationId required"}),{status:400,headers:cors});
 const {data:note,error:noteErr}=await admin.from("sabily_notifications").select("id,title,body,action_url,status,user_id").eq("id",body.notificationId).single();
 if(noteErr||!note||note.status!=="sent")return new Response(JSON.stringify({error:"Sent notification not found"}),{status:404,headers:cors});
 webpush.setVapidDetails(subject,publicKey,privateKey);
 let query=admin.from("sabily_push_subscriptions").select("id,user_id,endpoint,p256dh,auth_secret").eq("enabled",true);
 if(note.user_id)query=query.eq("user_id",note.user_id);
 const {data:subs,error:subsErr}=await query.limit(1000);
 if(subsErr)return new Response(JSON.stringify({error:"Could not load push subscriptions"}),{status:500,headers:cors});
 const payload=JSON.stringify({title:note.title,body:note.body,url:note.action_url||"/",tag:note.id});
 let sent=0,failed=0,expired=0;
 for(const sub of subs||[]){try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_secret}},payload);sent++}catch(err){failed++;const status=(err as any)?.statusCode;if(status===404||status===410){expired++;await admin.from("sabily_push_subscriptions").update({enabled:false}).eq("id",sub.id)}}}
 return new Response(JSON.stringify({ok:true,sent,failed,expired,total:(subs||[]).length}),{status:200,headers:cors});
});