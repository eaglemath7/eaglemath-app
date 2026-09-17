import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'};
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'POST only'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')!, service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const user=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false}});
  const {data:auth,error:authError}=await user.auth.getUser();if(authError||!auth.user)return json({error:'로그인이 필요합니다'},401);
  const {data:profile}=await user.from('profiles').select('role,active').eq('id',auth.user.id).single();
  if(!profile?.active||!['admin','deputy'].includes(profile.role))return json({error:'관리자 전용입니다'},403);
  const b=await req.json();const ids=Array.isArray(b.studentIds)?[...new Set(b.studentIds)]:[];
  if((!ids.length&&!b.parentId)||ids.length>20)return json({error:'연결할 자녀를 선택해주세요'},400);
  const {data:students}=await service.from('students').select('id').in('id',ids);if(students?.length!==ids.length)return json({error:'학생 정보를 확인해주세요'},400);
  let parentId=b.parentId,createdId='';
  if(parentId){const {data:p}=await service.from('profiles').select('role,active').eq('id',parentId).single();if(p?.role!=='parent'||!p.active)return json({error:'학부모 계정을 확인해주세요'},400);}
  else{
   const name=String(b.name||'').trim(),loginId=String(b.loginId||'').trim(),password=String(b.password||'');
   if(!name||!loginId||password.length<6)return json({error:'이름·아이디와 6자 이상 비밀번호를 입력해주세요'},400);
   const email='p'+Array.from(new TextEncoder().encode(loginId)).map(v=>v.toString(16).padStart(2,'0')).join('')+'@eaglemath.local';
   const {data,error}=await service.auth.admin.createUser({email,password,email_confirm:true});if(error||!data.user)return json({error:error?.message||'계정 생성 실패'},400);
   parentId=createdId=data.user.id;
   const {error:pe}=await service.from('profiles').insert({id:parentId,role:'parent',name,login_id:'parent:'+loginId,active:true,must_change_password:true});
   if(pe){await service.auth.admin.deleteUser(createdId);return json({error:pe.message},400);}
  }
  const {error}=await service.rpc('academy_link_family',{p_parent:parentId,p_students:ids});
  if(error){if(createdId)await service.auth.admin.deleteUser(createdId);return json({error:error.message},400);}
  return json({parentId});
 }catch{return json({error:'가족 연결 처리 중 오류가 발생했습니다'},500);}
});
