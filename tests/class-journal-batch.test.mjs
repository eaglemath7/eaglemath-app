import assert from 'node:assert/strict';
import { createAcademy, mergeClassLessonBody, compactPendingStudents } from '../academy.js';

const originalGlobals={document:globalThis.document,FormData:globalThis.FormData,setInterval:globalThis.setInterval,alert:globalThis.alert,localStorage:globalThis.localStorage};
const listeners=new Map(),messages=[];
globalThis.document={addEventListener:(type,fn)=>listeners.set(type,[...(listeners.get(type)||[]),fn]),querySelector:()=>null,querySelectorAll:()=>[]};
globalThis.setInterval=()=>0;
globalThis.alert=message=>messages.push(message);
globalThis.localStorage={getItem:()=>null};
globalThis.FormData=class {constructor(form){this.entries=form.entries;} [Symbol.iterator](){return this.entries[Symbol.iterator]();} getAll(key){return this.entries.filter(([k])=>k===key).map(([,value])=>value);}};
try {
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
 const students=Array.from({length:11},(_,i)=>({id:'s'+i,name:'예시학생'+i,active:true,status:'재원'}));
 const sessions=students.map((s,i)=>({student_id:s.id,period:i===9?'1800-1900':'1700-1830',teacher_ids:[i===8?'other':'teacher'],lesson_type:'정규'}));
 const state={students,teachers:[{id:'teacher',name:'담당강사',active:true},{id:'other',name:'다른강사',active:true}],schedules:[],academicEvents:[],records:[],periods:[]};
 let records=[{id:'published',kind:'lesson',student_id:'s10',day,status:'published',body:{period:'1700-1830'}},
  {id:'existing',kind:'lesson_draft',student_id:'s2',day,status:'draft',body:{period:'1700-1830',content:'기존 개별 진도',assignment:'기존 개별 과제',parent_message:'기존 개별 코멘트'},updated_at:'version-0'}];
 const writes=[],publishes=[];let serial=0,failStudent='',failPublishStudent='';
 const db={from(table){const query={select:()=>query,eq:()=>query,order:()=>query,range:()=>query,then(resolve){resolve({data:table==='academy_items'?structuredClone(records):[],error:null});}};return query;},async rpc(name,args){
  if(name==='academy_lesson_sessions')return {data:sessions,error:null};
  if(name==='academy_children')return {data:students,error:null};
  if(name==='academy_save'){
   const item=args.p_item;
   if(item.kind==='lesson_draft'&&item.student_id===failStudent)return {error:{message:'모의 저장 실패'}};
   const value={...structuredClone(item),updated_at:'version-'+(++serial)};
   records=records.filter(r=>r.id!==value.id).concat(value);writes.push(value);return {data:value,error:null};
  }
  if(name==='academy_publish'){
   if(records.find(r=>r.id===args.p_id)?.student_id===failPublishStudent)return {error:{message:'모의 게시 실패'}};
   const item=records.find(r=>r.id===args.p_id);item.status='published';publishes.push(item.student_id);
   records.push({...item,id:'published-'+item.student_id+'-'+item.body.period,kind:'lesson'});return {data:item.id,error:null};
  }
  return {data:[],error:null};
 }};
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const academy=createAcademy({db,context:()=>({session:{id:'admin',role:'admin'},state,modalOpen:false}),refresh:()=>{},notices:()=>'',escape});
 await academy.load();
 const dispatch=async(type,event)=>{let stopped=false;event.stopImmediatePropagation=()=>{stopped=true;};for(const handler of listeners.get(type)||[]){await handler(event);if(stopped)break;}};
 const click=async(action,id)=>{const button={dataset:{ac:action,id}};await dispatch('click',{target:{closest:selector=>selector==='[data-ac]'?button:null},preventDefault(){}});};
 await click('pending-bulk-lesson',JSON.stringify(['1700-1830',['teacher']]));
 let html=academy.render('home');
 assert.match(html,/반 전체 알림장 작성/);
 assert.equal((html.match(/name="lessonStudent"/g)||[]).length,8);
 assert(!html.includes('name="lessonStudent" value="s8"'));
 assert(!html.includes('name="lessonStudent" value="s9"'));
 assert(!html.includes('name="lessonStudent" value="s10"'));
 const base=[['bulk_mode','1'],['title','반 전체 수업'],['content','공통 수업 내용'],['assignment','공통 과제'],['parent_message','공통 전달사항'],['attendance','present'],['homework_status','완료'],['attitude','좋음'],['material',''],['course','']];
 const submit=async(entries,intent='draft')=>{
  const status={textContent:''},form={dataset:{acForm:'lesson',id:''},entries,querySelector:()=>status,querySelectorAll:()=>[]};
  await dispatch('submit',{target:{closest:selector=>selector==='[data-ac-form]'?form:null},submitter:{value:intent},preventDefault(){}});
  return status;
 };
 // Exclude one child, override only s1, preserve an existing teacher draft at s2.
 const entries=[...base,...students.slice(0,7).map(s=>['lessonStudent',s.id]),['individual:s1','on'],['content:s1',''],['assignment:s1','개별 심화 5문제'],['parent_message:s1','']];
 failStudent='s6';await submit(entries);
 assert.equal(publishes.length,0,'draft save never publishes');
 assert.equal(records.filter(r=>r.kind==='lesson_draft'&&r.student_id==='s6').length,0);
 failStudent='';await submit(entries);
 const drafts=records.filter(r=>r.kind==='lesson_draft');
 assert.equal(drafts.length,7,'retry reuses student request IDs and existing drafts');
 assert.equal(drafts.find(r=>r.student_id==='s0').body.content,'공통 수업 내용');
 assert.equal(drafts.find(r=>r.student_id==='s1').body.assignment,'개별 심화 5문제');
 assert.equal(drafts.find(r=>r.student_id==='s1').body.content,'공통 수업 내용');
 assert.equal(drafts.find(r=>r.student_id==='s1').body.parent_message,'공통 전달사항');
 assert.equal(drafts.find(r=>r.student_id==='s2').body.assignment,'기존 개별 과제');
 assert(!drafts.some(r=>['s7','s8','s9','s10'].includes(r.student_id)));
 assert(drafts.every(r=>!Object.keys(r.body).some(k=>k.includes(':')||['bulk_mode','lessonStudent'].includes(k))));
 assert(writes.filter(r=>r.kind==='class_plan'&&r.student_id==='s1').every(r=>r.body.assignment==='개별 심화 5문제'));
 failPublishStudent='s6';await submit(entries,'publish');assert.equal(publishes.length,6);
 failPublishStudent='';const beforeRetry=writes.length;await submit(entries,'publish');assert.equal(publishes.length,7);assert.equal(writes.length-beforeRetry,3,'only the failed student attendance, draft and plan are retried');assert(writes.slice(beforeRetry).every(r=>r.student_id==='s6'));
 const before=writes.length;
 const status=await submit(base);assert.match(status.textContent,/한 명 이상/);assert.equal(writes.length,before);
 const outsider=await submit([...base,['lessonStudent','s8']]);assert.match(outsider.textContent,/작성 대상/);assert.equal(writes.length,before);
 // Compact selection spans teachers/times without assigning every child the first period.
 sessions.push({student_id:'s7',period:'1900-2000',teacher_ids:['teacher'],lesson_type:'정규'});
 records.push(...['1700-1830','1900-2000'].map((p,i)=>({id:'r7-'+i,kind:'reflection',student_id:'s7',day,status:'submitted',body:{period:p,learned:'수업 '+p,assignment:'학생 과제 '+p},updated_at:'source-'+i})));
 await academy.load();
 const compact=compactPendingStudents(sessions.map(s=>({studentId:s.student_id,period:s.period,teacherIds:s.teacher_ids})),students,state.teachers);
 assert.equal(compact.length,11);assert.equal(compact.find(r=>r.studentId==='s7').sessions.length,2);
 assert.equal(compactPendingStudents(sessions.map(s=>({studentId:s.student_id,period:s.period,teacherIds:s.teacher_ids})),students,state.teachers,{teacher:'other'}).length,1);
 await click('pending-select-all','');
 assert.match(academy.render('home'),/선택한 3명 일괄 작성/);
 const changeTeacher=async value=>dispatch('change',{target:{value,matches:selector=>selector==='[data-pending-teacher]',closest:()=>null},preventDefault(){}});
 await changeTeacher('other');assert.match(academy.render('home'),/선택한 0명 일괄 작성/);
 await click('pending-select-all','');assert.match(academy.render('home'),/선택한 1명 일괄 작성/);
 await changeTeacher('');await click('pending-select-all','');await click('pending-selected-lesson','');
 const mixed=[...base,...['s7','s8','s9'].map(id=>['lessonStudent',id])];
 const mixedStart=writes.length;await submit(mixed,'publish');
 const mixedDrafts=writes.slice(mixedStart).filter(r=>r.kind==='lesson_draft');
 assert.equal(mixedDrafts.length,4);
 assert.deepEqual(mixedDrafts.filter(r=>r.student_id==='s7').map(r=>r.body.period).sort(),['1700-1830','1900-2000']);
 assert.equal(mixedDrafts.find(r=>r.student_id==='s9').body.period,'1800-1900');
 assert.equal(mixedDrafts.find(r=>r.student_id==='s7'&&r.body.period==='1700-1830').body.reflection_id,'r7-0');
 assert.equal(mixedDrafts.find(r=>r.student_id==='s7'&&r.body.period==='1900-2000').body.reflection_id,'r7-1');
 const plans=writes.slice(mixedStart).filter(r=>r.kind==='class_plan');assert.equal(new Set(plans.map(p=>p.id)).size,4);
 const auto=mergeClassLessonBody({assignment:'공통 과제'},{assignment:'학생 과제'},{assignment:'학생 과제'});
 assert.equal(auto.assignment,'공통 과제','auto-copied reflection may take the teacher common assignment');
 assert.equal(mergeClassLessonBody({assignment:'새 공통'},{assignment:'개별 과제'}).assignment,'개별 과제');
 assert.equal(mergeClassLessonBody({assignment:'공통'},{assignment:'기존'},{},{assignment:''}).assignment,'','explicit individual edits may clear a field');
 console.log('PASS: home group bulk entry, exact recipients, common/individual records, protected drafts, draft/publish separation, exclusion, failure retry and no control-field leakage');
} finally {
 Object.assign(globalThis,originalGlobals);
}
