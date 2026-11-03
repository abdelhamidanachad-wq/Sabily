import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const out=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return out(405,{error:"Method not allowed"});
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!token||!url||!service)return out(401,{error:"Sign-in required"});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await db.auth.getUser(token);
 if(authError||!auth.user)return out(401,{error:"Invalid session"});
 const {data:role,error:roleError}=await db.from("sabily_user_roles").select("role").eq("user_id",auth.user.id).maybeSingle();
 if(roleError)return out(500,{error:"Could not verify permissions"});
 if(role?.role!=="super_admin")return out(403,{error:"Super-admin access required"});
 let body:{action?:string;enabled?:boolean;email?:string;points?:number;reason?:string};
 try{body=await req.json()}catch{return out(400,{error:"Invalid JSON"})}
 const action=body.action||"status";
 if(action==="status"){
  const [{data:mode},{count:entries},{count:members}]=await Promise.all([
   db.from("sabily_noor_test_settings").select("enabled,updated_at").eq("singleton",true).single(),
   db.from("sabily_noor_test_ledger").select("id",{count:"exact",head:true}),
   db.from("sabily_user_roles").select("user_id",{count:"exact",head:true}).eq("role","member")
  ]);
  return out(200,{enabled:Boolean(mode?.enabled),updatedAt:mode?.updated_at??null,entries:entries??0,memberAccounts:members??0,redeemable:false});
 }
 if(action==="set_enabled"){
  const enabled=body.enabled===true;
  const {error}=await db.from("sabily_noor_test_settings").upsert({singleton:true,enabled,updated_by:auth.user.id,updated_at:new Date().toISOString()},{onConflict:"singleton"});
  if(error)return out(500,{error:"Could not update Noor beta mode"});
  await db.from("sabily_audit_log").insert({actor_id:auth.user.id,action:"noor_test_mode_changed",entity_type:"noor_test_mode",details:{enabled,redeemable:false}});
  return out(200,{ok:true,enabled});
 }
 if(action==="grant_points"){
  const email=(body.email||"").trim().toLowerCase(),points=Math.floor(Number(body.points)),reason=(body.reason||"").trim();
  if(!email||!Number.isInteger(points)||points<1||points>10000||reason.length<3||reason.length>250)return out(400,{error:"Enter a valid member email, 1–10,000 points and a short reason."});
  const {data:users,error}=await db.auth.admin.listUsers({page:1,perPage:1000});
  if(error)return out(500,{error:"Could not search member accounts"});
  const target=users.users.find(user=>(user.email||"").toLowerCase()===email);
  if(!target)return out(404,{error:"No member account found for that email."});
  const {data:mode}=await db.from("sabily_noor_test_settings").select("enabled").eq("singleton",true).single();
  if(!mode?.enabled)return out(409,{error:"Enable Noor private-beta test mode before granting test points."});
  const {data:entry,error:insertError}=await db.from("sabily_noor_test_ledger").insert({user_id:target.id,points,reason,created_by:auth.user.id}).select("id,user_id,points,reason,created_at").single();
  if(insertError)return out(500,{error:"Could not add test points"});
  await db.from("sabily_audit_log").insert({actor_id:auth.user.id,action:"noor_test_points_granted",entity_type:"noor_test_ledger",entity_id:entry.id,details:{member_email:email,points,reason,redeemable:false}});
  return out(200,{ok:true,entry});
 }
 return out(400,{error:"Unsupported action"});
});
