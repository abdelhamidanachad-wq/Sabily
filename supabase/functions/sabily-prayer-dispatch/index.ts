import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import webpush from "npm:web-push@3.6.7";

const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-sabily-cron-secret","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const out=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return out(405,{error:"Method not allowed"});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return out(500,{error:"Server configuration missing"});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:secret}=await db.rpc("sabily_get_prayer_cron_secret");
 const supplied=req.headers.get("x-sabily-cron-secret")||"";
 if(!secret||!supplied||supplied!==secret)return out(401,{error:"Invalid scheduler authorization"});
 const [{data:publicKey},{data:privateKey}]=await Promise.all([
  db.rpc("sabily_get_vapid_public_key"),db.rpc("sabily_get_vapid_private_key")
 ]);
 const subject=Deno.env.get("VAPID_SUBJECT")||"mailto:hello@sabily.io";
 if(!publicKey||!privateKey)return out(503,{error:"VAPID key pair is not configured in Supabase Vault."});
 webpush.setVapidDetails(subject,String(publicKey),String(privateKey));
 const now=new Date().toISOString();
 const {data:due,error}=await db.from("sabily_prayer_schedule").select("id,user_id,prayer_name,scheduled_at,timezone").is("delivered_at",null).lte("scheduled_at",now).order("scheduled_at").limit(250);
 if(error)return out(500,{error:"Could not load due prayer reminders"});
 let sent=0,failed=0,withoutSubscription=0,expired=0;
 for(const item of due||[]){
  const {data:subs,error:subError}=await db.from("sabily_push_subscriptions").select("id,endpoint,p256dh,auth_secret").eq("user_id",item.user_id).eq("enabled",true).limit(10);
  if(subError){failed++;continue;}
  if(!subs?.length){
   await db.from("sabily_prayer_schedule").update({delivered_at:now,delivery_status:"no_subscription"}).eq("id",item.id);
   withoutSubscription++;continue;
  }
  let delivered=false,hadError=false;
  for(const sub of subs){
   try{
    await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_secret}},JSON.stringify({
      title:item.prayer_name+" prayer time",
      body:"It is time for "+item.prayer_name+". Open Sabily for your prayer schedule.",
      url:"/app/prayer",tag:"sabily-prayer-"+item.prayer_name.toLowerCase()+"-"+item.id
    }));
    delivered=true;
   }catch(err){
    hadError=true;const status=(err as {statusCode?:number})?.statusCode;
    if(status===404||status===410){expired++;await db.from("sabily_push_subscriptions").update({enabled:false}).eq("id",sub.id);}
   }
  }
  if(delivered){
   await db.from("sabily_prayer_schedule").update({delivered_at:now,delivery_status:"sent",last_error:null}).eq("id",item.id);
   sent++;
  }else{
   await db.from("sabily_prayer_schedule").update({delivery_status:"failed",last_error:hadError?"Push provider rejected delivery":"No active subscription"}).eq("id",item.id);
   failed++;
  }
 }
 return out(200,{ok:true,checked:due?.length??0,sent,failed,withoutSubscription,expired});
});
