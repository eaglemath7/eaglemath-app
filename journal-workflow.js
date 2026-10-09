// Views consume only records already authorized by the server.
export function homeworkOverview(items,legacy,id,today,{student=false}={}) {
 const lessons=items.filter(x=>x.kind==='lesson'&&x.status==='published'&&x.student_id===id&&x.day<=today);
 const published=lessons.map(x=>({id:x.id,day:x.day,period:x.body.period||'',text:x.body.assignment||'없음',due:x.body.assignment_due||'',source:'선생님 알림장'}));
 const old=legacy.filter(x=>x.student_id===id&&x.lesson_date<=today&&!lessons.some(l=>l.day===x.lesson_date)).map(x=>({day:x.lesson_date,period:x.period||'',text:x.assignment||'없음',due:'',source:'선생님 알림장'}));
 const approved=student?items.filter(x=>x.kind==='reflection'&&x.status==='approved'&&x.student_id===id&&x.day<=today&&!lessons.some(l=>l.day===x.day&&l.body.period===x.body.period)).map(x=>({id:x.id,day:x.day,period:x.body.period||'',text:x.body.assignment||'없음',due:'',source:'선생님 확인 완료'})):[];
 const all=[...published,...old,...approved],latest=all.map(x=>x.day).sort().at(-1);
 return [...all.filter(x=>x.day===latest),...items.filter(x=>x.kind==='homework'&&x.student_id===id&&x.day<=today&&['assigned','returned','submitted'].includes(x.status)).map(x=>({id:x.id,day:x.day,period:'',text:[x.title,x.body.description].filter(Boolean).join('\n'),due:x.due_at||'',source:'별도 과제'}))];
}
export function parentConversation(items,id) {
 const threads=items.filter(x=>x.student_id===id&&((x.kind==='lesson'&&x.status==='published')||(x.kind==='question'&&x.audience==='parent')));
 const threadIds=new Set(threads.map(x=>x.id));
 return items.filter(x=>x.student_id===id&&x.audience==='parent'&&((x.kind==='parent_message'&&threadIds.has(x.body.lesson_id))||(x.kind==='reply'&&threadIds.has(x.body.thread))||(x.kind==='question'&&threadIds.has(x.id))))
 .filter(x=>x.body.text).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
}
export function previousHomework(items,records,id,day) {
 const choices=[...items.filter(x=>x.student_id===id&&x.day<day&&((x.kind==='lesson'&&x.status==='published')||x.kind==='homework')).map(x=>({day:x.day,text:x.kind==='lesson'?x.body.assignment:x.title})),...records.filter(x=>!x.hidden&&!x.isDraft&&x.studentIds?.includes(id)&&x.lessonDate<day).map(x=>({day:x.lessonDate,text:x.assignment}))];
 const latest=choices.map(x=>x.day).sort().at(-1);
 return {day:latest||'',text:[...new Set(choices.filter(x=>x.day===latest).map(x=>x.text).filter(Boolean))].join('\n')||'이전 과제 없음'};
}
