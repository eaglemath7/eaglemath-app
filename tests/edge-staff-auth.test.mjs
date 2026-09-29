import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
for(const name of ['admin-create-user','admin-delete-user','academy-ai']){
 let handler,role='admin',active=true,receivedToken,questionReads=0,createdPassword;
 const source=fs.readFileSync(`supabase/functions/${name}/index.ts`,'utf8').replace(/^import .*;\n/m,'');
 const client={auth:{admin:{createUser:async data=>{createdPassword=data.password;return {data:null,error:{message:'test stop before account creation'}};}},getUser:async token=>{receivedToken=token;return {data:{user:token==='valid'?{id:'admin'}:null},error:null};}},from:table=>{const chain={select:()=>chain,eq:()=>chain,single:async()=>table==='profiles'?{data:{id:'admin',role,active}}:(questionReads++,{data:null,error:Error('missing')})};return chain;}};
 vm.runInNewContext(stripTypeScriptTypes(source),{Request,Response,TextEncoder,console,Deno:{env:{get:()=> 'test'},serve:f=>handler=f},createClient:()=>client});
 const request=token=>handler(new Request('https://example.test/'+name,{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:'{}'}));
 assert.equal((await request()).status,401,name);
 assert.equal((await request('bad')).status,401,name);
 role='student';assert.equal((await request('valid')).status,403,name);
 role='admin';active=false;assert.equal((await request('valid')).status,403,name);
 active=true;assert.equal((await request('valid')).status,name==='academy-ai'?404:400,name);
 assert.equal(receivedToken,'valid');
 if(name==='academy-ai')assert.equal(questionReads,1);
 if(name==='admin-create-user'){
  for(const password of ['', '1234','eaglemath:short:v1:1234','123456']){
   const response=await handler(new Request('https://example.test/create',{method:'POST',headers:{Authorization:'Bearer valid'},body:JSON.stringify({role:'student',name:'테스트',loginId:'테스트',password})}));
   assert.equal(response.status,400);
   assert.equal(createdPassword,password==='123456'?'123456':'eaglemath:short:v1:1234');
  }
 }
}
console.log('PASS: registration, deletion and question AI explicitly verify bearer token; unauthorized/inactive users rejected before mutations');
