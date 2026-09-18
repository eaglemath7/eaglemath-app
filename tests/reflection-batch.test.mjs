import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reflectionLessonBody,lessonAISource} from '../academy.js';
const source=fs.readFileSync('academy.js','utf8');
const block=source.slice(source.indexOf("      if(kind==='reflection-batch'){"),source.indexOf("      if(kind==='lesson'){"));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function run(fail=false){
 const refs=[{id:'r1',student_id:'s1',kind:'reflection',status:'submitted',day:'2026-09-18',body:{period:'1600',learned:'삼각비',assignment:'10쪽'}},{id:'r2',student_id:'s2',kind:'reflection',status:'submitted',day:'2026-09-19',body:{period:'1700',learned:'이차함수',assignment:'20쪽'}}];
 const original=JSON.stringify(refs),saved=[],notices=[];
 const old={id:'existing',student_id:'s1',kind:'lesson_draft',status:'draft',body:{reflection_id:'r1',internal_note:'비공개 메모',content:'강사가 수정한 내용'}};
 const fn=new AsyncFunction('env',`const {staff,visibleReflections,rows,items,reflectionLessonBody,lessonAISource,polish,save,requestId,name,alert}=env;let reflectionBatch=['r1','r2'],reflectionSelection=new Set(reflectionBatch),status={};const kind='reflection-batch',intent='ai-draft',d={'keywords:r1':'집중함'};try{${block};return {remaining:reflectionBatch,selected:[...reflectionSelection]};}catch(e){return {error:e.message,remaining:reflectionBatch,selected:[...reflectionSelection]};}`);
 const result=await fn({staff:()=>true,visibleReflections:()=>refs,rows:k=>k==='lesson_draft'?[old]:[],items:refs,reflectionLessonBody,lessonAISource,polish:async text=>{assert.ok(!text.includes('비공개 메모'));if(fail&&text.includes('이차함수'))throw Error('AI 실패');return '문장 '+text;},save:async v=>saved.push(v),requestId:k=>k,name:id=>id,alert:s=>notices.push(s)});
 assert.equal(JSON.stringify(refs),original);
 return {result,saved,notices};
}
let r=await run();assert.equal(r.saved.length,2);assert.deepEqual(r.saved.map(x=>[x.student_id,x.day,x.body.period,x.body.reflection_id]),[['s1','2026-09-18','1600','r1'],['s2','2026-09-19','1700','r2']]);assert.equal(r.saved[0].id,'existing');assert.equal(r.saved[0].body.content,'강사가 수정한 내용');assert.equal(r.saved[1].body.assignment,'20쪽');assert.ok(r.saved.every(x=>x.status==='draft'&&x.audience==='staff'));assert.deepEqual(r.result.remaining,[]);
r=await run(true);assert.equal(r.saved.length,1);assert.deepEqual(r.result.remaining,['r2']);assert.deepEqual(r.result.selected,['r2']);assert.match(r.result.error,/실패 1건/);
console.log('PASS: individual sources/dates/periods, draft reuse, edited text preservation, unpublished drafts, AI internal-note privacy, partial failure and retry selection');
