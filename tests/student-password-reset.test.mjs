import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('app.js','utf8');
const fn=source.slice(source.indexOf('async function resetAllStudentPasswords()'),source.indexOf('async function resetPassword(userId)'));
async function run({admin=true,confirm=true,failed=false,running=false}={}){
 const calls=[],messages=[];
 const state={students:[{id:'a',name:'학생A',loginId:'학생A',status:'재원'},{id:'b',name:'학생B',loginId:'학생B',status:'휴원'},{id:'deleted',status:'삭제'}]};
 const body=`let studentPasswordReset={running:${running},armed:${confirm}};${fn};await resetAllStudentPasswords();return studentPasswordReset;`;
 const result=await new (Object.getPrototypeOf(async function(){}).constructor)('canAdmin','state','toList','window','showMessage','render','invokeAdmin',body)(()=>admin,state,x=>x,{confirm:()=>confirm},x=>messages.push(x),()=>{},async(name,payload)=>{calls.push([name,payload]);if(failed&&payload.userId==='b')throw Error('network');return {error:null};});
 return {calls,messages,result};
}
let r=await run();assert.equal(r.calls.length,2);assert.ok(r.calls.every(([name,p])=>name==='admin-reset-password'&&p.newPassword==='123456'));assert.match(r.messages[0],/성공 2명 \/ 실패 0명/);
r=await run({failed:true});assert.equal(r.result.failed.length,1);assert.equal(r.result.running,false);assert.match(r.messages[0],/성공 1명 \/ 실패 1명/);
for(const opts of [{admin:false},{confirm:false},{running:true}])assert.equal((await run(opts)).calls.length,0);
console.log('PASS: student-only reset, deleted exclusion, admin and duplicate-run guards, cancellation, truthful partial-failure counts');
