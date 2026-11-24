import assert from 'node:assert/strict';
import {createAcademy} from '../academy.js';
import {rosterStatusValues,nextRosterStatus} from '../roster-status.js';
assert.deepEqual(rosterStatusValues(),{attendance:'present',homework_status:'완료',attitude:'좋음'});
assert.deepEqual(rosterStatusValues({attendance:'absent',homework_status:'미완료',attitude:'집중 도움 필요'}),{attendance:'absent',homework_status:'미완료',attitude:'집중 필요'});
assert.equal(nextRosterStatus('attendance','absent'),'present');
assert.equal(nextRosterStatus('attitude','보통'),'집중 필요');
const original={document:globalThis.document,setInterval:globalThis.setInterval,localStorage:globalThis.localStorage,alert:globalThis.alert};
const listeners=new Map();globalThis.document={addEventListener:(type,fn)=>listeners.set(type,[...(listeners.get(type)||[]),fn]),querySelector:()=>null,querySelectorAll:()=>[]};
globalThis.setInterval=()=>0;globalThis.localStorage={getItem:()=>null};globalThis.alert=()=>{};
try{
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
 const state={students:[{id:'a',name:'학생가',active:true},{id:'b',name:'학생나',active:true}],teachers:[{id:'t',name:'담당강사',active:true}],schedules:[],academicEvents:[],records:[],periods:[]};
 const sessions=[{student_id:'a',period:'1500-1600',teacher_ids:['t']},{student_id:'a',period:'1700-1800',teacher_ids:['t']},{student_id:'b',period:'1500-1600',teacher_ids:['t']}];
 let records=[{id:'old',kind:'lesson_draft',student_id:'a',day,status:'draft',title:'기존 수업',body:{period:'1500-1600',content:'기존 개별 내용',assignment:'기존 과제',attendance:'absent',homework_status:'미완료',attitude:'집중 도움 필요'},updated_at:'v0'}];
 let writes=[],failure='',version=0,publishes=0;
 const db={from(table){return {select(){return this},eq(){return this},order(){return this},range(){return this},then(resolve){resolve({data:table==='academy_items'?structuredClone(records):[]})}}},async rpc(name,args){
 if(name==='academy_lesson_sessions')return {data:sessions};if(name==='academy_children')return {data:[]};
 if(name==='academy_publish'){publishes++;return {data:true};}
 if(name==='academy_save'){const i=args.p_item;if(i.student_id===failure)return {error:{message:'모의 저장 실패'}};if(i.id==='old')assert.equal(args.p_expected,records.find(r=>r.id==='old').updated_at);const data={...structuredClone(i),updated_at:'v'+(++version)};records=records.filter(r=>r.id!==i.id).concat(data);writes.push(data);return {data};}return {data:[]};}};
 const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const academy=createAcademy({db,context:()=>({session:{id:'t',role:'admin'},state,modalOpen:false}),refresh:()=>{},notices:()=>'',escape:h});await academy.load();
 const dispatch=async(type,e)=>{let stopped=false;e.stopImmediatePropagation=()=>stopped=true;for(const fn of listeners.get(type)||[]){await fn(e);if(stopped)break;}};
 const click=(ac,id='')=>dispatch('click',{target:{closest:s=>s==='[data-ac]'?{dataset:{ac,id}}:null},preventDefault(){}});
 const filter=p=>dispatch('change',{target:{value:p,matches:s=>s==='[data-pending-period]',closest:()=>null}});
 let html=academy.render('home');assert.match(html,/집중 필요/);assert.match(html,/과제 미완료/);assert.equal(writes.length,0,'rendering defaults must not save');
 await click('pending-status',JSON.stringify(['b','1500-1600','attitude']));await click('pending-status',JSON.stringify(['b','1500-1600','attitude']));
 assert.equal(writes.length,0,'cycling is pending until explicit save');
 await filter('1700-1800');await filter('1500-1600');html=academy.render('home');assert.match(html,/변경됨/);
 failure='b';await click('pending-status-save');assert.match(academy.render('home'),/실패 1건/);assert.match(academy.render('home'),/변경됨/);
 failure='';await click('pending-status-save');
 assert.equal(publishes,0);assert(writes.every(i=>i.body.period==='1500-1600'),'hidden period must not be written');
 assert.equal(records.filter(i=>i.kind==='lesson_draft').length,1,'status-only save must not manufacture blank journal drafts');
 const draft=records.find(i=>i.id==='old');assert.equal(draft.body.content,'기존 개별 내용');assert.equal(draft.body.assignment,'기존 과제');assert.equal(draft.body.attendance,'absent');assert.equal(draft.body.homework_status,'미완료');
 const attendance=records.find(i=>i.kind==='attendance'&&i.student_id==='b');assert.equal(attendance.status,'present');assert.equal(attendance.body.attitude,'집중 필요');assert.equal(attendance.body.homework_status,'완료');assert.equal(records.filter(i=>i.kind==='attendance'&&i.student_id==='b').length,1);
 await academy.load();assert.match(academy.render('home'),/집중 필요/);assert(!academy.render('home').includes('ac-roster-unsaved">변경됨'));
 console.log('PASS: defaults without writes, cycle controls, existing exceptions/content, filtered period scope, partial failure retry, optimistic concurrency, reload persistence and no publication');
}finally{for(const [key,value] of Object.entries(original))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
