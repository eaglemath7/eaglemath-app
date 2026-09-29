import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const s=fs.readFileSync('academy.js','utf8');const items=[{kind:'parent_message',body:{lesson_id:'lesson',text:'PARENT_ONLY'}},{kind:'student_message',body:{lesson_id:'lesson',text:'STUDENT_ONLY'}},{kind:'reply',audience:'parent',created_at:'2026-09-30',body:{thread:'lesson',text:'PARENT_REPLY'}},{kind:'reply',audience:'student',created_at:'2026-09-30',body:{thread:'lesson',text:'STUDENT_REPLY'}}];
const ctx={parent:()=>false,staff:()=>true,rows:k=>items.filter(i=>i.kind===k),h:String,form:(t,k,content)=>content,filesHtml:()=>'',replyAuthor:()=>'',journalTime:()=>'',btn:()=>'',area:()=>''};vm.createContext(ctx);vm.runInContext(s.slice(s.indexOf('  function threadPanel('),s.indexOf('  async function polish(')),ctx);
const lesson={id:'lesson',kind:'lesson',body:{}};
let html=ctx.threadPanel(lesson,'parent');assert.match(html,/PARENT_ONLY/);assert.match(html,/PARENT_REPLY/);assert.match(html,/name="audience" value="parent"/);assert.ok(!html.includes('STUDENT_ONLY'));assert.ok(!html.includes('STUDENT_REPLY'));
html=ctx.threadPanel(lesson,'student');assert.match(html,/STUDENT_REPLY/);assert.ok(!html.includes('PARENT_REPLY'));
console.log('PASS: staff parent thread replies remain parent-only and student thread excludes parent content');
