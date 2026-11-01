import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers});
  if(req.method!=="POST") return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers});
  const token=(req.headers.get("Authorization")??"").replace(/^Bearer\\s+/i,"");
  if(!token) return new Response(JSON.stringify({error:"Sign-in required"}),{status:401,headers});
  const url=Deno.env.get("SUPABASE_URL"), serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!serviceKey) return new Response(JSON.stringify({error:"Server configuration missing"}),{status:500,headers});
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authErr}=await db.auth.getUser(token);
  if(authErr||!auth.user) return new Response(JSON.stringify({error:"Invalid session"}),{status:401,headers});
  const {data:roleRow,error:roleErr}=await db.from("sabily_user_roles").select("role").eq("user_id",auth.user.id).maybeSingle();
  if(roleErr) return new Response(JSON.stringify({error:"Unable to verify role"}),{status:500,headers});
  const role=roleRow?.role??"member";
  let body:any; try{body=await req.json();}catch{return new Response(JSON.stringify({error:"Invalid JSON"}),{status:400,headers});}
  const isAdmin=["admin","super_admin"].includes(role), isModerator=["moderator","admin","super_admin"].includes(role);
  let result:any=null, entityType="system", entityId:string|undefined;
  try{
    switch(body.action){
      case "set_role":{
        if(role!=="super_admin") return new Response(JSON.stringify({error:"Super-admin permission required"}),{status:403,headers});
        if(!body.userId||!["member","creator","moderator","admin","super_admin"].includes(body.role??"")) return new Response(JSON.stringify({error:"Valid userId and role required"}),{status:400,headers});
        const {data,error}=await db.from("sabily_user_roles").upsert({user_id:body.userId,role:body.role,granted_by:auth.user.id},{onConflict:"user_id"}).select("user_id,role").single();
        if(error) throw error; result=data; entityType="user_role"; entityId=body.userId; break;
      }
      case "moderate_post":{
        if(!isModerator) return new Response(JSON.stringify({error:"Moderator permission required"}),{status:403,headers});
        if(!body.postId||!["published","hidden","removed","pending"].includes(body.status??"")) return new Response(JSON.stringify({error:"postId and valid status required"}),{status:400,headers});
        const {data,error}=await db.from("sabily_forum_posts").update({status:body.status,updated_at:new Date().toISOString()}).eq("id",body.postId).select("id,status").single();
        if(error) throw error; result=data; entityType="forum_post"; entityId=body.postId; break;
      }
      case "moderate_comment":{
        if(!isModerator) return new Response(JSON.stringify({error:"Moderator permission required"}),{status:403,headers});
        if(!body.commentId||!["published","hidden","removed","pending"].includes(body.status??"")) return new Response(JSON.stringify({error:"commentId and valid status required"}),{status:400,headers});
        const {data,error}=await db.from("sabily_forum_comments").update({status:body.status}).eq("id",body.commentId).select("id,status").single();
        if(error) throw error; result=data; entityType="forum_comment"; entityId=body.commentId; break;
      }
      case "resolve_report":{
        if(!isModerator) return new Response(JSON.stringify({error:"Moderator permission required"}),{status:403,headers});
        if(!body.reportId||!["reviewing","resolved","dismissed","open"].includes(body.status??"")) return new Response(JSON.stringify({error:"reportId and valid status required"}),{status:400,headers});
        const {data,error}=await db.from("sabily_reports").update({status:body.status,assigned_to:auth.user.id,resolved_at:["resolved","dismissed"].includes(body.status)?new Date().toISOString():null}).eq("id",body.reportId).select("id,status").single();
        if(error) throw error; result=data; entityType="report"; entityId=body.reportId; break;
      }
      case "update_setting":{
        if(!isAdmin) return new Response(JSON.stringify({error:"Admin permission required"}),{status:403,headers});
        if(!body.settingKey||body.value===undefined) return new Response(JSON.stringify({error:"settingKey and value required"}),{status:400,headers});
        const {data,error}=await db.from("sabily_app_settings").upsert({key:body.settingKey,value:body.value,updated_at:new Date().toISOString(),updated_by:auth.user.id},{onConflict:"key"}).select("key,value").single();
        if(error) throw error; result=data; entityType="setting"; entityId=body.settingKey; break;
      }
      case "publish_content":{
        if(!["creator","admin","super_admin"].includes(role)) return new Response(JSON.stringify({error:"Creator permission required"}),{status:403,headers});
        if(!body.contentId||!["draft","review","published","archived"].includes(body.status??"")) return new Response(JSON.stringify({error:"contentId and valid status required"}),{status:400,headers});
        const {data,error}=await db.from("sabily_content").update({status:body.status,published_at:body.status==="published"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",body.contentId).select("id,status").single();
        if(error) throw error; result=data; entityType="content"; entityId=body.contentId; break;
      }
      default:return new Response(JSON.stringify({error:"Unsupported action"}),{status:400,headers});
    }
    await db.from("sabily_audit_log").insert({actor_id:auth.user.id,action:body.action??"unknown",entity_type:entityType,entity_id:entityId,details:{result}});
    return new Response(JSON.stringify({ok:true,result}),{status:200,headers});
  }catch{
    return new Response(JSON.stringify({error:"Action failed. Check record identifiers, permissions and schema."}),{status:500,headers});
  }
});