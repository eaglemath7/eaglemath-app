import { prepareJournalImage, journalImageError } from './photo-journal.js?v=3';
const fields={material:'교재',unit:'단원·쪽수',content:'수업 내용',assignment:'과제',parent_message:'전달사항'};
const normalize=s=>String(s||'').replace(/\s/g,'');
export function matchPhotoStudent(entry,students){
  const matches=students.filter(s=>normalize(s.name)===normalize(entry.student_name));
  return entry.name_uncertain===false&&normalize(entry.student_name)&&matches.length===1?matches[0].id:'';
}
export function photoRowError(row,rows,sessions){
  if(!row.student_id)return '학생을 선택해주세요.';
  if(!row.period||!sessions.some(s=>s.student_id===row.student_id&&s.period===row.period))return '해당 날짜의 수업을 선택해주세요.';
  if(!Object.keys(fields).some(k=>row[k]?.trim()))return '읽힌 수업 내용이 없습니다.';
  if(rows.some(r=>r!==row&&r.selected&&!r.done&&r.student_id===row.student_id&&r.period===row.period))return '같은 학생·수업이 중복되었습니다. 하나만 선택해주세요.';
  return '';
}
export async function savePhotoRow(db,row,day,guard=()=>true){
  const prior=await db.from('academy_items').select('id,kind,status,body').eq('student_id',row.student_id).eq('day',day).in('kind',['lesson','lesson_draft']);
  if(prior.error)throw new Error('기존 알림장을 확인하지 못했습니다. 다시 시도해주세요.');
  const existing=(prior.data||[]).find(i=>i.body?.period===row.period);
  if(existing)return {done:true,message:existing.id===row.request_id?'초안 저장 완료':'기존 알림장 있음 · 덮어쓰지 않음'};
  if(!guard())throw new Error('로그인이 변경되었습니다. 다시 시작해주세요.');
  const result=await db.rpc('academy_save',{p_item:{id:row.request_id,kind:'lesson_draft',student_id:row.student_id,day,title:'오늘 수업',status:'draft',audience:'staff',body:{period:row.period,...Object.fromEntries(Object.keys(fields).map(k=>[k,row[k]||''])),photo_source:'paper-journal'}},p_expected:null});
  if(result.error)throw new Error(result.error.message||'초안 저장 실패');
  return {done:true,message:'초안 저장 완료'};
}
export function createPhotoClassJournal({db,context,refresh,close,onSaved,escape:h}){
  let opened=false,working=false,rows=[],sessions=[],day='',message='',warning='',readDay='',confirmed=false,generation=0;
  const allowed=()=>['admin','deputy','teacher'].includes(context().session?.role);
  const roster=()=>context().state.students.filter(s=>s.active&&s.status!=='삭제'&&sessions.some(t=>t.student_id===s.id));
  function redraw(){const el=document.querySelector('[data-photo-class-dialog]'),top=el?.scrollTop||0;refresh();const next=document.querySelector('[data-photo-class-dialog]');if(next)next.scrollTop=top;}
  async function loadSessions(){
    const requestedDay=day,userId=context().session?.id,mine=generation;
    const result=await db.rpc('academy_lesson_sessions',{p_day:requestedDay});if(result.error)throw new Error('수업 목록을 불러오지 못했습니다.');
    if(mine!==generation||requestedDay!==day||userId!==context().session?.id)throw new Error('로그인이 변경되었습니다. 다시 시작해주세요.');
    const user=context().session;
    sessions=(result.data||[]).filter(s=>['admin','deputy'].includes(user?.role)||(s.teacher_ids||[]).includes(user?.id)||s.lesson_type==='보충');
  }
  function reset(){generation++;opened=false;working=false;rows=[];sessions=[];confirmed=false;}
  async function open(date){if(!allowed())return;reset();opened=true;working=true;const mine=generation;day=date;message='수업 목록을 불러오는 중…';warning='';readDay='';redraw();try{await loadSessions();message='';}catch(e){message=e.message;}if(mine!==generation)return;working=false;redraw();}
  function render(){
    if(!opened||!allowed())return '';
    const students=roster(),selected=rows.filter(r=>r.selected&&!r.done),locked=working?'disabled':'';
    const options=(list,v)=>list.map(([id,text])=>`<option value="${h(id)}" ${id===v?'selected':''}>${h(text)}</option>`).join('');
    return `<div class="ac-overlay"><section class="ac-dialog ac-photo-class" data-photo-class-dialog role="dialog" aria-modal="true" aria-label="종이 일지 사진으로 초안 작성"><div class="between"><h2>📷 종이 일지 사진</h2><button type="button" data-pc-action="close" ${locked}>닫기</button></div><p class="muted small">갤럭시·아이폰에 저장된 사진을 선택하거나 바로 촬영하세요. 여러 학생이 적힌 일지를 최대 3장 올릴 수 있습니다. 학생별로 나눈 내용을 확인한 후 초안으로 저장합니다.</p><label>수업 날짜<input type="date" data-pc-day value="${h(day)}" ${locked}/></label><div class="toolbar ac-photo-sources"><label class="ac-photo-pick ${working?'is-disabled':''}"><span aria-hidden="true">📷 카메라</span><input aria-label="카메라로 사진 찍기" type="file" accept="image/*" capture="environment" data-pc-file ${locked}/></label><label class="ac-photo-pick ${working?'is-disabled':''}"><span aria-hidden="true">🖼 사진 업로드</span><input aria-label="사진 업로드" type="file" accept="image/*" multiple data-pc-file ${locked}/></label><label class="ac-photo-pick ${working?'is-disabled':''}"><span aria-hidden="true">📁 파일 업로드</span><input aria-label="파일 업로드" type="file" multiple data-pc-file ${locked}/></label></div><p class="muted small">카메라·카카오톡·다운로드 폴더의 사진이 안 보이면 ‘파일 업로드’를 이용하세요. 사진 파일만 분석할 수 있습니다.</p>${!sessions.length?'<p class="ac-photo-warning">해당 날짜에 담당 수업이 없습니다. 날짜와 시간표 배정을 확인해주세요.</p>':''}<small class="muted">사진은 AI 분석 서비스로 전송됩니다. 원본을 앱 저장소에 보관하지 않습니다. 한 번에 최대 30명.</small><p role="status" aria-live="polite">${h(message)}</p>${warning?`<p class="ac-photo-warning">${h(warning)}</p>`:''}${readDay&&readDay!==day?`<p class="ac-photo-warning">사진에서 읽은 날짜는 ${h(readDay)}입니다. 수업 날짜를 확인해주세요.</p>`:''}${rows.length?`<p class="small">${rows.length}명 판독 · 이름·수업을 선택하고 내용이 맞는지 확인해주세요. 기존 알림장은 덮어쓰지 않습니다.</p><div class="ac-photo-rows">${rows.map((r,index)=>{
      const periods=[...new Set(sessions.filter(s=>s.student_id===r.student_id).map(s=>s.period))];
      const attr=`data-pc-row="${index}"`,disabled=working||r.done?'disabled':'';
      return `<article class="ac-photo-row"><div class="between"><label class="ac-check"><input type="checkbox" data-pc-field="selected" ${attr} ${r.selected?'checked':''} ${disabled}/><strong>${h(r.student_name||'이름 판독 불가')}</strong></label><small>${h(r.message||'확인 필요')}</small></div>${r.warning?`<p class="ac-photo-warning">${h(r.warning)}</p>`:''}<div class="ac-photo-match"><label>학생<select data-pc-field="student_id" ${attr} ${disabled}>${options([['','학생 직접 선택'],...students.map(s=>[s.id,[s.name,s.schoolName||s.school,s.schoolYear,s.loginId].filter(Boolean).join(' · ')])],r.student_id)}</select></label><label>수업<select data-pc-field="period" ${attr} ${disabled}>${options([['','수업 선택'],...periods.map(p=>[p,p])],r.period)}</select></label></div>${Object.entries(fields).map(([key,label])=>`<label>${label}<textarea rows="${key==='content'||key==='assignment'?2:1}" data-pc-field="${key}" ${attr} ${disabled}>${h(r[key]||'')}</textarea></label>`).join('')}${r.selected&&!r.done&&photoRowError(r,rows,sessions)?`<small class="ac-photo-warning">${h(photoRowError(r,rows,sessions))}</small>`:''}</article>`;
    }).join('')}</div><footer class="ac-photo-footer"><label class="ac-check"><input type="checkbox" data-pc-confirm ${confirmed?'checked':''} ${locked}/>학생 이름·수업 내용·과제를 확인했습니다.</label><button type="button" class="primary" data-pc-action="save" ${working||!confirmed||!selected.length||selected.some(r=>photoRowError(r,rows,sessions))?'disabled':''}>확인한 ${selected.length}명 초안 저장</button><small>학생·학부모에게는 게시 전까지 보이지 않습니다.</small></footer>`:''}</section></div>`;
  }
  document.addEventListener('input',e=>{
    const t=e.target.closest('[data-pc-field]');if(!t||t.tagName!=='TEXTAREA'||working)return;
    const row=rows[Number(t.dataset.pcRow)];if(!row||row.done)return;row[t.dataset.pcField]=t.value;confirmed=false;
    const check=document.querySelector('[data-pc-confirm]');if(check)check.checked=false;
    const save=document.querySelector('[data-pc-action="save"]');if(save)save.disabled=true;
  });
  document.addEventListener('change',async e=>{
    const t=e.target;if(!opened||working||!allowed())return;
    if(t.matches('[data-pc-confirm]')){confirmed=t.checked;redraw();return;}
    if(t.matches('[data-pc-field]')){const r=rows[Number(t.dataset.pcRow)];if(!r||r.done)return;const key=t.dataset.pcField;r[key]=key==='selected'?t.checked:t.value;if(key==='student_id'){const ps=[...new Set(sessions.filter(s=>s.student_id===r.student_id).map(s=>s.period))];r.period=ps.length===1?ps[0]:'';}confirmed=false;redraw();return;}
    if(t.matches('[data-pc-day]')){if(rows.some(r=>r.done)){message='저장된 초안이 있습니다. 닫은 뒤 새 날짜로 시작해주세요.';redraw();return;}day=t.value;confirmed=false;working=true;redraw();try{await loadSessions();for(const r of rows){r.student_id='';r.period='';r.selected=false;}message='날짜가 바뀌었습니다. 학생과 수업을 다시 선택해주세요.';}catch(err){sessions=[];message=err.message;}working=false;redraw();return;}
    if(!t.matches('[data-pc-file]')||!t.files.length)return;
    const files=[...t.files];t.value='';if(files.length>3){message='사진은 최대 3장 선택해주세요.';redraw();return;}
    const invalid=files.map(journalImageError).find(Boolean);if(invalid){message=invalid;redraw();return;}
    // Do not discard reviewed edits when another file picker is used accidentally.
    if(rows.length&&!confirm('현재 사진 초안을 새 사진으로 바꿀까요? 저장한 초안은 유지됩니다.'))return;
    const mine=++generation,user=context().session?.id;working=true;confirmed=false;message='사진을 읽고 학생별 초안을 나누고 있어요…';redraw();
    try{
      await loadSessions();const images=await Promise.all(files.map(prepareJournalImage));
      const result=await db.functions.invoke('ai-polish',{body:{kind:'photoClassJournal',images}});
      if(result.error||result.data?.error){let detail=result.data?.error;try{detail||=(await result.error?.context?.json())?.error;}catch{}throw new Error(detail||'사진 분석을 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');}
      if(mine!==generation||!opened||user!==context().session?.id)return;
      const draft=result.data?.draft;if(!Array.isArray(draft?.entries))throw new Error('학생별 초안 형식을 확인하지 못했습니다.');
      warning=typeof draft.warning==='string'?draft.warning:'';readDay=draft.day||'';
      rows=draft.entries.slice(0,30).map(entry=>{const student_id=matchPhotoStudent(entry,roster()),ps=[...new Set(sessions.filter(s=>s.student_id===student_id).map(s=>s.period))];return {...Object.fromEntries([...Object.keys(fields),'student_name','warning'].map(k=>[k,typeof entry[k]==='string'?entry[k]:''])),student_id,period:ps.length===1?ps[0]:'',selected:!!student_id,request_id:crypto.randomUUID(),done:false,message:student_id?'이름 연결됨 · 내용 확인 필요':'이름 확인 · 학생 직접 선택'};});
      message=rows.length?'초안이 준비됐습니다. 종이 원본과 비교해 확인해주세요.':'학생 기록을 읽지 못했습니다. 글자가 선명하게 보이도록 다시 찍어주세요.';
    }catch(err){message=err.message;}finally{if(mine===generation){working=false;redraw();}}
  });
  document.addEventListener('click',async e=>{
    const t=e.target.closest('[data-pc-action]');if(!t||!opened)return;e.preventDefault();if(working)return;
    if(t.dataset.pcAction==='close'){reset();close();return;}
    if(t.dataset.pcAction!=='save'||!confirmed||!allowed())return;
    const chosen=rows.filter(r=>r.selected&&!r.done);if(!chosen.length||chosen.some(r=>photoRowError(r,rows,sessions)))return;
    const mine=generation,user=context().session?.id;
    working=true;confirmed=false;message='확인한 초안을 저장하고 있어요…';redraw();
    try{await loadSessions();if(chosen.some(r=>photoRowError(r,rows,sessions)))throw new Error('수업 배정이 바뀌었습니다. 학생·수업을 다시 확인해주세요.');}catch(err){if(mine===generation){working=false;message=err.message;redraw();}return;}
    for(const r of chosen){if(mine!==generation||user!==context().session?.id)break;try{if(!allowed())throw new Error('로그인을 확인해주세요.');const legacy=(context().state.records||[]).some(i=>((i.studentIds||[]).includes(r.student_id)||(i.studentId||i.student_id)===r.student_id)&&(i.date||i.lessonDate||i.lesson_date)===day&&i.period===r.period);if(legacy){r.done=true;r.selected=false;r.message='기존 수업기록 있음 · 덮어쓰지 않음';continue;}const result=await savePhotoRow(db,r,day,()=>mine===generation&&user===context().session?.id&&allowed());Object.assign(r,result);r.selected=false;}catch(err){r.message=err.message;}}
    if(mine!==generation||user!==context().session?.id)return;
    message=`${chosen.filter(r=>r.done).length}건 처리 · ${chosen.filter(r=>!r.done).length}건 실패. 초안은 알림장 목록의 ‘이어서’에서 수정·게시할 수 있습니다.`;
    try{await onSaved();}catch{message+=' 목록 새로고침이 필요합니다.';}working=false;redraw();
  });
  return {open,render,reset};
}
