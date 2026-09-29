import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('academy.js','utf8');
const functions=source.slice(source.indexOf('export function journalTime'),source.indexOf('// Daily workflow UI.')).replaceAll('export function','function');
const ctx={};vm.createContext(ctx);vm.runInContext(functions,ctx);
assert.match(ctx.journalTime('2026-09-29T16:30:00Z'),/2026.*09.*30.*01:30/);
assert.equal(ctx.journalTime('invalid'),'');
assert.equal(ctx.lessonSessionStatus(true,null,true),'알림장 게시 완료');
assert.equal(ctx.lessonSessionStatus(true,null,false),'알림장 준비 중');
assert.equal(ctx.lessonSessionStatus(false,{status:'submitted'},true),'submitted');
assert.equal(ctx.lessonSessionStatus(false,null,false),'작성 전');
console.log('PASS: parent status does not infer missing student submission from restricted records; Korean dates cross midnight correctly');

const leap=ctx.journalCalendarDays('2024-02');
assert.equal(leap[0],'2024-01-28');assert.equal(leap.at(-1),'2024-03-02');
assert.ok(leap.includes('2024-02-29'));assert.equal(leap.length%7,0);
assert.equal(ctx.journalCalendarDays('2026-09')[0],'2026-08-30');
assert.equal(ctx.journalCalendarDays('2026-09').at(-1),'2026-10-03');
assert.equal(ctx.journalCalendarDays('2026-02').length,28);
const display=source.slice(source.indexOf('  function parentLearningSummary'),source.indexOf('  function learningSummary'));
const fixtures=[
 {kind:'lesson',id:'mine',student_id:'child',status:'published',day:'2026-09-30',title:'수업',body:{unit:'분수',assignment:'12쪽',internal_note:'SECRET'}},
 {kind:'lesson',id:'other',student_id:'other-child',status:'published',day:'2026-09-30',title:'OTHER_CHILD',body:{}},
 {kind:'lesson',id:'draft',student_id:'child',status:'draft',day:'2026-09-30',title:'DRAFT',body:{}},
 {kind:'lesson',id:'yesterday',student_id:'child',status:'published',day:'2026-09-29',title:'YESTERDAY',body:{}},
 {kind:'parent_message',body:{lesson_id:'mine',text:'<script>parent text</script>'}},
 {kind:'student_message',body:{lesson_id:'mine',text:'STUDENT_ONLY'}},
 {kind:'reply',body:{thread:'mine',text:'PRIVATE_STUDENT_REPLY'},audience:'student'},
];
Object.assign(ctx,{current:()=> 'child',rows:k=>fixtures.filter(i=>i.kind===k),legacyRecords:[],journalDay:'2026-09-30',journalMonth:'2026-09',parentCommentDrafts:new Map([['mine','작성 중']]),h:v=>String(v).replaceAll('<','&lt;').replaceAll('>','&gt;'),filesHtml:()=>'',replyAuthor:()=> '학부모님(나)',area:(label,key,value)=>value,btn:()=>'',holiday:()=>'',name:()=> '김시은',empty:t=>t});
vm.runInContext(display,ctx);
const html=ctx.parentLearningSummary();
assert.match(html,/&lt;script&gt;parent text/);assert.match(html,/<strong>분수<\/strong>/);assert.match(html,/작성 중/);
for(const hidden of ['SECRET','OTHER_CHILD','DRAFT','YESTERDAY','STUDENT_ONLY','PRIVATE_STUDENT_REPLY'])assert.ok(!html.includes(hidden),hidden);
console.log('PASS: calendar leap years and adjacent months; selected child/day published records only, audience isolation, HTML escaping, comment draft restoration');
