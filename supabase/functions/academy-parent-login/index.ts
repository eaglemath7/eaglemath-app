import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'};
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({},405);
 const fail=()=>json({error:'아이디 또는 비밀번호를 확인해주세요'},401);
 try{
  const b=await req.json(),loginId=String(b.loginId||'').trim(),password=String(b.password||'');if(!loginId||!password||loginId.length>100)return fail();
  const url=Deno.env.get('SUPABASE_URL')!,admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  // Resolve aliases only on the server, never expose parent IDs or auth emails.
  let {data:p}=await admin.from('profiles').select('id').eq('role','parent').eq('active',true).eq('login_id','parent:'+loginId).maybeSingle();
  if(!p){
   const {data:s}=await admin.from('profiles').select('id').eq('role','student').eq('active',true).eq('login_id',loginId).maybeSingle();
   if(s){const {data:link}=await admin.from('parent_students').select('parent_id').eq('student_id',s.id).maybeSingle();if(link)p={id:link.parent_id};}
  }
  if(!p)return fail();const {data:parent}=await admin.from('profiles').select('active,role').eq('id',p.id).single();if(!parent?.active||parent.role!=='parent')return fail();
  const {data:u}=await admin.auth.admin.getUserById(p.id);if(!u.user?.email)return fail();
  const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false}});
  const {data,error}=await client.auth.signInWithPassword({email:u.user.email,password});if(error||!data.session)return fail();
  return json({session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token}});
 }catch{return fail();}
});
