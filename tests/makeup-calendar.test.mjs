import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeupDetails,makeupGroups} from '../academy.js';
const students=[{id:'a',name:'이다연',schoolYear:'중3'},{id:'b',name:'김민준',schoolYear:'초3'},{id:'c',name:'김하준',schoolYear:'초3'}];
assert.deepEqual(makeupGroups(['a','c','b','b'],students),[{grade:'초3',names:['김민준','김하준']},{grade:'중3',names:['이다연']}]);
assert.equal(makeupDetails({type:'보충',note:'bad'}),null);assert.equal(makeupDetails({type:'안내',note:'{}'}),null);
const src=fs.readFileSync('academy.js','utf8');const block=src.slice(src.indexOf("      if(kind==='makeup'){"),src.indexOf("      if(kind==='makeup-cancel'){"));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function saveCase({ids=['a','b'],end='13:00',admin=true,error=null}={}){
 let payload;
 const db={from:t=>{assert.equal(t,'academic_events');return {upsert:p=>{payload=p;return {select:async()=>({error,data:error?null:[{id:p.id}]})};}};}};
 const fn=new AsyncFunction('db','FormData','admin','allStudents','requestId',`let day='',month='';const kind='makeup',id='',f={},d={day:'2026-09-20',title:'시험 보충',start:'10:00',end:'${end}'};${block};return {day,month};`);
 const result=await fn(db,class{getAll(){return ids;}},()=>admin,()=>students,()=> 'stable-id');return {payload,result};
}
const r=await saveCase();assert.equal(r.payload.visibility,'내부');assert.equal(r.payload.start_date,r.payload.end_date);assert.equal(r.result.month,'2026-09');assert.deepEqual(makeupDetails({type:r.payload.type,note:r.payload.note}).studentIds,['a','b']);
for(const opts of [{ids:[]},{ids:['missing']},{end:'09:00'},{admin:false},{error:Error('server')}])await assert.rejects(()=>saveCase(opts));
console.log('PASS: grade grouping, name linkage, duplicate selection, internal calendar-only persistence, time/student validation and server failures');
