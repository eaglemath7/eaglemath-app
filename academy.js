export function makeupDetails(event) {
  if(event?.type!=='보충')return null;
  try { const b=JSON.parse(event.note||'null');return b?.version===1&&Array.isArray(b.studentIds)&&/^\d{2}:\d{2}$/.test(b.start)&&/^\d{2}:\d{2}$/.test(b.end)?b:null; } catch { return null; }
}
export function mergeMakeupSlots(events,day) {
  const slots=new Map();
  for(const event of events){
    const body=makeupDetails(event);if(!body||event.startDate!==day)continue;
    const key=body.start+'|'+body.end;
    if(!slots.has(key))slots.set(key,{start:body.start,end:body.end,studentIds:new Set(),titles:new Set(),sources:[]});
    const slot=slots.get(key);body.studentIds.forEach(id=>slot.studentIds.add(id));slot.titles.add(event.title||'보충');slot.sources.push(event);
  }
  return [...slots.values()].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)).map(slot=>({type:'보충',startDate:day,title:[...slot.titles].join(' · '),sources:slot.sources,note:JSON.stringify({version:1,start:slot.start,end:slot.end,studentIds:[...slot.studentIds]})}));
}
export function makeupGroups(ids,students) {
  const order=['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3'];
  const groups=new Map();
  for(const id of new Set(ids)){const st=students.find(s=>s.id===id);const grade=st?.schoolYear||'학년 미입력';if(!groups.has(grade))groups.set(grade,[]);groups.get(grade).push(st?.name||'삭제된 학생');}
  return [...groups].sort(([a],[b])=>(order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b))).map(([grade,names])=>({grade,names:names.sort((a,b)=>a.localeCompare(b,'ko'))}));
}
export function findLessonReflection(items, studentId, day, period, sourceId='') {
  const list=items.filter(r=>r.kind==='reflection'&&r.student_id===studentId&&r.day===day&&r.status!=='draft');
  const normalize=p=>String(p||'').replace(/[^0-9가-힣a-z]/gi,'');
  return list.find(r=>r.id===sourceId)||list.find(r=>normalize(r.body.period)===normalize(period))||(list.length===1&&(!period||!list[0].body.period)?list[0]:null);
}
export function reflectionLessonBody(body={}) {
  return {material:body.material||'',unit:body.unit||'',pages:body.pages||'',worksheets:body.worksheets||'',
    content:[body.content,body.pages&&'페이지: '+body.pages,body.worksheets&&'학습지·문항 수: '+body.worksheets].filter(Boolean).join('\n'),
    learned:body.learned||'',assignment:body.assignment||'',feeling:body.feeling||''};
}
export function lessonAISource(body) {
  return [['교재',body.material],['단원',body.unit],['공부한 내용',body.content],['오늘 알게 된 것',body.learned],['과제',body.assignment],['학생 소감',body.feeling],['관찰 키워드',body.keywords],['수업태도',body.attitude],['테스트',body.assessments],['학부모 메시지 초안',body.parent_message]].filter(([,v])=>v).map(([k,v])=>k+': '+v).join('\n');
}
// Daily workflow UI. All mutations use permission-checked transactional database RPCs.
export function createAcademy({ db, context, refresh, legacyHome, legacyStudent, notices, holiday=()=>'', escape: h }) {
  let items = [], children = [], points = [], ready = false, problem = '', loadedFor = '', panel = '', busy = false;
  let selected = new Set(), day = date(), period = '', student = '', month = date().slice(0,7), rankMonths=1, rankStart='',rankEnd='', rankings=[];
  let taskArchives=[];
  let lessonSessions=[],sessionDay='';
  let draggingTask=null;
  let reflectionSelection=new Set(), reflectionBatch=[];
  let commentReviews=[],commentNotifications=[],commentSearch='',commentFilter='all',commentsReady=false;
  let draftTimer, loadPromise, batchIds=new Map(), legacyRecords=[], parentAccounts=[], familyLinks=[];
  const requestId=key=>{if(!batchIds.has(key))batchIds.set(key,crypto.randomUUID());return batchIds.get(key);};
  const labels = {todo:'할 일',doing:'진행 중',done:'완료',assigned:'미제출',submitted:'확인 대기',returned:'보완 요청',checked:'검사 완료',draft:'작성 중',approved:'하원 승인',open:'답변 대기',answering:'답변 중',answered:'답변 완료',resolved:'해결',published:'게시 완료'};
  function date(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());}
  const c=()=>context(), staff=()=>['admin','deputy','teacher','assistant'].includes(c().session?.role), admin=()=>['admin','deputy'].includes(c().session?.role), parent=()=>c().session?.role==='parent';
  const uid=()=>c().session?.id;
  const allStudents=()=> staff()?c().state.students.filter(s=>s.active&&s.status!=='삭제'):children;
  const name=id=>allStudents().find(x=>x.id===id)?.name||'학생';
  const teacher=id=>c().state.teachers.find(x=>x.id===id)?.name||'미배정';
  const rows=kind=>items.filter(i=>i.kind===kind);
  const current=()=>student||allStudents()[0]?.id||uid();
  const badge=s=>`<span class="ac-badge ac-${h(s)}">${h(labels[s]||s)}</span>`;
  const btn=(text,action,id='',cl='')=>`<button type="button" class="${cl}" data-ac="${action}" data-id="${h(id)}">${text}</button>`;
  const input=(label,key,value='',type='text')=>`<label>${label}<input name="${key}" type="${type}" value="${h(value??'')}" /></label>`;
  const area=(label,key,value='',placeholder='')=>`<label>${label}<textarea name="${key}" rows="3" placeholder="${h(placeholder)}">${h(value??'')}</textarea></label>`;
  const opts=(list,value)=>list.map(([id,n])=>`<option value="${h(id)}" ${String(value)===String(id)?'selected':''}>${h(n)}</option>`).join('');
  const select=(label,key,list,value)=>`<label>${label}<select name="${key}">${opts(list,value)}</select></label>`;
  const studentSelect=(id=current())=>select('학생','student_id',allStudents().map(s=>[s.id,s.name]),id);
  const empty=t=>`<p class="ac-empty">${t}</p>`;
  const toolbar=(title,desc,actions='')=>`<div class="ac-title"><div><h2>${title}</h2><p>${desc}</p></div><div class="toolbar">${actions}</div></div>`;
  const statusNotice=()=>problem?`<div class="ac-setup" role="status">${h(problem)} ${btn('다시 연결','reload')}</div>`:'';
  const routeBtn=(title,desc,route)=>`<button class="ac-shortcut" data-route="${route}"><strong>${title}</strong><span>${desc}</span><b>→</b></button>`;
  const chips=()=> allStudents().length>1?`<div class="ac-children">${allStudents().map(s=>`<button data-ac="child" data-id="${s.id}" class="${current()===s.id?'primary':''}">${h(s.name)}</button>`).join('')}</div>`:'';
  const filesHtml=list=>(list||[]).map((p,i)=>btn(`사진·첨부 ${i+1}`,'file',p)).join(' ');
  function form(title,kind,fields,id='',buttons=''){
    return `<div class="ac-overlay"><section class="ac-dialog ${['assessment-batch','reflection-batch'].includes(kind)?'ac-assessment-dialog':''}" role="dialog" aria-modal="true" aria-label="${h(title)}"><form data-ac-form="${kind}" data-id="${h(id)}"><div class="between"><h2>${title}</h2>${btn('닫기','close')}</div><div class="stack">${fields}</div><p class="ac-form-status" role="status"></p><div class="form-actions">${buttons||'<button class="primary" type="submit">저장</button>'}</div></form></section></div>`;
  }
  async function readAll(table,order){let data=[];for(let offset=0;;offset+=1000){const page=await db.from(table).select('*').order(order,{ascending:false}).range(offset,offset+999);if(page.error)return page;data.push(...page.data);if(page.data.length<1000)return {data,error:null};}}
  async function load(){
    if(!uid())return;
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      const result=await readAll('academy_items','day');
      if(result.error){ready=false;problem='새 기능의 서버 연결이 필요합니다. 기존 학습기록은 계속 사용할 수 있습니다.';return;}
      items=result.data;
      const requestedDay=staff()?day:date();
      const sessions=await db.rpc('academy_lesson_sessions',{p_day:requestedDay});
      if(sessions.error)throw new Error('수업·보충 연결 정보를 불러오지 못했습니다. 다시 연결해주세요.');
      lessonSessions=(sessions.data||[]).map(r=>({studentId:r.student_id,period:r.period,lessonType:r.lesson_type,teacherIds:r.teacher_ids||[]}));sessionDay=requestedDay;
      const [ch,pt]=await Promise.all([db.rpc('academy_children'),readAll('academy_points','earned_at')]);
      if(ch.error||pt.error)throw new Error('가족·점수 정보를 불러오지 못했습니다.');
      children=ch.data||[];points=pt.data||[];
      if(staff()){
        const ev=await readAll('academic_events','start_date');if(ev.error)throw new Error('캘린더 일정을 불러오지 못했습니다.');
        c().state.academicEvents=ev.data.map(r=>({id:r.id,title:r.title,startDate:r.start_date,endDate:r.end_date,type:r.type,visibility:r.visibility,note:r.note||''}));
        const archives=await readAll('academy_task_archives','archived_at');if(archives.error)throw new Error('완료 업무 보관 기능의 서버 연결을 확인해주세요.');taskArchives=archives.data||[];
        const [reviews,notifications]=await Promise.all([readAll('academy_comment_reviews','updated_at'),admin()?readAll('academy_comment_notifications','created_at'):Promise.resolve({data:[]})]);
        commentsReady=!reviews.error&&!notifications.error;commentReviews=reviews.data||[];commentNotifications=notifications.data||[];
      }
      if(admin()){const [ps,links]=await Promise.all([db.from('profiles').select('id,name,login_id').eq('role','parent'),db.from('parent_students').select('*')]);parentAccounts=ps.data||[];familyLinks=links.data||[];}
      if(!staff()){const legacy=await db.rpc('academy_legacy_records');legacyRecords=legacy.data||[];}
      ready=true;problem='';loadedFor=uid();
    })().catch(e=>{problem=e.message;ready=false;}).finally(()=>{loadPromise=null;loadedFor=uid();});
    return loadPromise;
  }
  async function save(obj){
    if(!ready)throw new Error('서버 연결 후 저장할 수 있습니다.');
    const old=items.find(i=>i.id===obj.id);
    const {data,error}=await db.rpc('academy_save',{p_item:{...old,...obj,id:obj.id||crypto.randomUUID()},p_expected:old?.updated_at||null});
    if(error)throw new Error(error.message);
    items=items.filter(i=>i.id!==data.id).concat(data);return data;
  }
  async function upload(formEl){
    const files=[...formEl.querySelector('[type=file]')?.files||[]];const uploaded=[];
    if(files.length>10)throw new Error('한 번에 10개까지 첨부할 수 있습니다.');
    for(const f of files){
      if(f.size>10*1024*1024)throw new Error('파일은 각각 10MB 이하여야 합니다.');
      const ext=f.name.split('.').pop().toLowerCase();if(!['jpg','jpeg','png','webp','heic','heif','pdf'].includes(ext))throw new Error('사진 또는 PDF만 첨부해주세요.');
      const path=`${uid()}/${crypto.randomUUID()}.${ext}`;const {error}=await db.storage.from('academy-private').upload(path,f);
      if(error)throw new Error(error.message);uploaded.push(path);
    }return uploaded;
  }
  const fileInput=()=>'<label>사진·안내문 첨부<input name="files" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" multiple /><small>최대 10개 · 파일당 10MB</small></label>';
  const taskDrafts = {};
  function quickTask(shared){
    const d=taskDrafts[String(shared)]||{};
    return `<form class="ac-quick-task" data-ac-form="task" data-shared="${shared}"><div class="ac-quick-row"><textarea name="titles" rows="1" aria-label="할 일" placeholder="할 일 입력 · Enter로 추가, Shift+Enter로 다음 할 일">${h(d.titles||'')}</textarea>${select('우선순위','priority',[['normal','보통'],['high','높음'],['low','낮음']],d.priority||'normal')}${input('마감일','due',d.due||'','date')}${shared&&admin()?select('담당 직원','assignee',c().state.teachers.filter(t=>t.active).map(t=>[t.id,t.name]),d.assignee||uid()):`<input name="assignee" type="hidden" value="${uid()}"/>`}<button type="submit" class="primary">추가</button></div><input name="shared" type="hidden" value="${shared}"/><details class="ac-task-options"><summary>추가 설정</summary><div class="ac-quick-row">${input('프로젝트','project',d.project||'')}${select('반복','repeat',[['none','반복 없음'],['daily','매일 (휴원일 제외)'],['weekly','매주 같은 요일'],['monthly','매월 같은 날짜']],d.repeat||'none')}${input('반복 종료일','repeat_end',d.repeat_end||'','date')}</div></details><p class="ac-form-status" role="status"></p></form>`;
  }
  const archivedTask=id=>taskArchives.some(a=>a.task_id===id&&a.is_archived);
  const canArchive=i=>admin()||(i.owner_id===uid()&&i.audience==='private');
  function taskHistory(shared){
    const list=taskArchives.filter(a=>a.is_archived).filter(a=>{const i=items.find(i=>i.id===a.task_id);return i&&(shared?i.audience==='staff':i.assignee_id===uid()||i.owner_id===uid());});
    return form('완료 기록','readonly',list.map(a=>{const i=a.snapshot;return `<article class="home-notice"><strong>${h(i.title)}</strong><small>${h(teacher(i.assignee_id))} · 마감 ${h(i.due_at?.slice(0,10)||'없음')}</small><p>완료 ${new Date(i.updated_at).toLocaleString('ko-KR')}<br/>확인·보관 ${new Date(a.archived_at).toLocaleString('ko-KR')} · ${h(teacher(a.archived_by))}</p>${canArchive(i)?btn('완료 칸으로 복원','task-restore',i.id):''}</article>`;}).join('')||empty('보관된 완료 업무가 없습니다.'),'',btn('닫기','close'));
  }
  function taskArrow(task,action,target,arrow){
    return `<button type="button" class="ac-task-arrow" data-ac="${action}" data-id="${h(task.id)}" title="${labels[target]}으로 이동" aria-label="${h(task.title)}: ${labels[target]}으로 이동">${arrow}</button>`;
  }
  async function moveTask(id,target){
    const task=items.find(i=>i.id===id&&i.kind==='task');
    if(!staff()||!task||archivedTask(id)||!['todo','doing','done'].includes(target))throw new Error('이동할 수 없는 업무입니다.');
    if(task.status===target)return;
    await save({...task,status:target});
  }
  function taskBoard(shared=false){
    const list=rows('task').filter(i=>!archivedTask(i.id)).filter(i=>(shared?i.audience==='staff':i.assignee_id===uid()||i.owner_id===uid()) && (i.day<=date()||i.status==='doing')).sort((a,b)=>({high:0,normal:1,low:2}[a.body.priority]??1)-({high:0,normal:1,low:2}[b.body.priority]??1)||(a.due_at||'z').localeCompare(b.due_at||'z'));
    return `<div class="between"><h3>${shared?'함께 할 일':admin()?'원장 할 일':'내가 할 일'}</h3>${btn('완료 기록','task-history',String(shared))}</div>${quickTask(shared)}<div class="ac-board" data-task-board="${shared?'shared':'personal'}">${['todo','doing','done'].map(st=>`<section data-task-status="${st}" aria-label="${labels[st]} 업무 칸"><h4>${labels[st]} <span>${list.filter(i=>i.status===st).length}</span></h4>${list.filter(i=>i.status===st).map(i=>`<article class="ac-task" draggable="true" data-task-id="${h(i.id)}" title="카드를 끌어서 다른 칸으로 옮기세요"><strong>${h(i.title)}</strong><small>${h(teacher(i.assignee_id))}${i.body.project?' · '+h(i.body.project):''} · ${{high:'높음',normal:'보통',low:'낮음'}[i.body.priority]||'보통'}</small>${i.due_at?`<small class="${i.status!=='done'&&i.due_at<new Date().toISOString()?'ac-overdue':''}">${h(i.due_at.slice(0,10))} 마감</small>`:''}<div>${st!=='todo'?taskArrow(i,'task-back',st==='done'?'doing':'todo','←'):''}${st!=='done'?taskArrow(i,'task-next',st==='todo'?'doing':'done','→'):canArchive(i)?btn('확인·보관','task-archive',i.id):'<small>원장 확인 대기</small>'}</div></article>`).join('')||empty('등록된 업무가 없습니다.')}</section>`).join('')}</div>`;
  }
  function makeupOn(d){return mergeMakeupSlots(c().state.academicEvents,d);}
  function makeupCopy(event){const b=makeupDetails(event);return `<span class="ac-makeup-time">${h(b.start)}–${h(b.end)} ${h(event.title)}</span>`+makeupGroups(b.studentIds,c().state.students).map(g=>`<span class="ac-makeup-names"><b>${h(g.grade)}</b> ${g.names.map(h).join(' · ')}</span>`).join('');}
  function makeupForm(event){
    const b=makeupDetails(event)||{start:'10:00',end:'13:00',studentIds:[]};
    const students=allStudents();const grades=[...new Set(students.map(s=>s.schoolYear).filter(Boolean))];
    return form(event?'보충 일정 수정':'보충 일정 등록','makeup',input('날짜','day',event?.startDate||day,'date')+input('표시 이름','title',event?.title||'보충')+`<div class="toolbar">${['10:00|13:00','14:00|17:00','18:00|21:00'].map(t=>btn(t.replace('|','–'),'makeup-preset',t)).join('')}</div><div class="grid two">`+input('시작','start',b.start,'time')+input('종료','end',b.end,'time')+`</div><div class="toolbar"><input data-makeup-search placeholder="학생 이름 검색" aria-label="보충 학생 이름 검색"/><select data-makeup-grade aria-label="보충 학생 학년 필터">${opts([['','학년 전체'],...grades.map(g=>[g,g])],'')}</select>${btn('현재 목록 전체 선택','makeup-select')}${btn('선택 해제','makeup-clear')}</div><p data-makeup-count>${b.studentIds.length}명 선택</p><div class="ac-makeup-picker">${students.map(st=>`<label data-makeup-option data-name="${h(st.name)}" data-grade="${h(st.schoolYear||'')}"><input type="checkbox" name="makeupStudent" value="${h(st.id)}" ${b.studentIds.includes(st.id)?'checked':''}/><span>${h(st.name)} <small>${h(st.schoolYear||'')}</small></span></label>`).join('')}</div>`,event?.id||'');
  }
  function updateMakeupPicker(f){
    const q=f.querySelector('[data-makeup-search]').value.trim(),grade=f.querySelector('[data-makeup-grade]').value;
    f.querySelectorAll('[data-makeup-option]').forEach(el=>{el.hidden=!!((q&&!el.dataset.name.includes(q))||(grade&&el.dataset.grade!==grade));});
    f.querySelector('[data-makeup-count]').textContent=f.querySelectorAll('[name="makeupStudent"]:checked').length+'명 선택';
  }
  function calendar(){
    const [y,m]=month.split('-').map(Number);const start=new Date(y,m-1,1).getDay();const count=new Date(y,m,0).getDate();
    const due=rows('task').filter(i=>i.status!=='done'&&(admin()||i.assignee_id===uid()||i.owner_id===uid()));
    const events=rows('school_event').filter(i=>i.status==='approved');
    const entries=d=>[...(holiday(d)?[{t:holiday(d),kind:'공휴일'}]:[]),...due.filter(i=>i.due_at?.slice(0,10)===d).map(i=>({t:i.title,kind:'업무'})),...events.filter(i=>i.day===d).map(i=>({t:i.title,kind:'학교'})),...c().state.academicEvents.filter(i=>i.type!=='보충'&&i.type!=='보충취소'&&i.startDate<=d&&i.endDate>=d).map(i=>({t:i.title,kind:'학원'})),...c().state.students.filter(i=>i.birthday4===d.slice(5).replace('-','')).map(i=>({t:i.name+' 생일',kind:'생일'}))];
    return `<section class="panel ac-calendar"><div class="between"><h3>일정과 마감일</h3><div class="toolbar">${admin()?btn('보충 등록','makeup-new'):''}${btn('‹','prev-month')}<strong>${month}</strong>${btn('›','next-month')}</div></div><div class="ac-week">${['일','월','화','수','목','금','토'].map((t,i)=>`<span class="${i===0?'ac-sunday':i===6?'ac-saturday':''}">${t}</span>`).join('')}</div><div class="ac-days">${Array.from({length:Math.ceil((start+count)/7)*7},(_,k)=>{const cell=new Date(y,m-1,1-start+k);const d=`${cell.getFullYear()}-${String(cell.getMonth()+1).padStart(2,'0')}-${String(cell.getDate()).padStart(2,'0')}`,es=entries(d);const closed=c().state.academicEvents.filter(e=>['휴원','학원 방학','재량휴업일'].includes(e.type)&&e.startDate<=d&&e.endDate>=d);const red=cell.getDay()===0||holiday(d)||c().state.academicEvents.some(e=>e.type==='공휴일'&&e.startDate<=d&&e.endDate>=d);return `<button data-ac="day" data-id="${d}" aria-label="${d}" class="${d===day?'selected':''} ${d.slice(0,7)!==month?'ac-outside-month':''} ${red?'ac-sunday':closed.length?'ac-academy-closed':cell.getDay()===6?'ac-saturday':''}"><b>${cell.getDate()}</b>${closed.map(e=>`<small class="ac-closure-label">${h(e.title)}</small>`).join('')}${es.filter(e=>!closed.some(x=>x.title===e.t)).slice(0,2).map(e=>`<small>${e.kind==='생일'?'':h(e.kind)+' · '}${h(e.t)}</small>`).join('')}${es.length>2?`<small>+${es.length-2}개</small>`:''}${makeupOn(d).map(event=>`<span class="ac-makeup-cell">${makeupCopy(event)}</span>`).join('')}</button>`}).join('')}</div><div class="ac-day-list"><div class="between"><strong>${day}</strong>${admin()?btn('이 날짜에 보충 등록','makeup-new'):''}</div>${makeupOn(day).map(event=>`<div class="ac-makeup-detail">${makeupCopy(event)}${admin()?event.sources.map(source=>`<div class="ac-makeup-source">${event.sources.length>1?`<small>${makeupDetails(source).studentIds.map(id=>h(name(id))).join(' · ')}</small>`:''}${btn('수정','makeup-edit',source.id)}${btn('보충 취소','makeup-cancel',source.id)}</div>`).join(''):''}</div>`).join('')}${entries(day).map(e=>`<p>${e.kind==='생일'?'':badge(e.kind)+' '}${h(e.t)}</p>`).join('')||(makeupOn(day).length?'':empty('등록된 일정이 없습니다.'))}</div></section>`;
  }
  function visibleReflections(){
    return rows('reflection').filter(r=>admin()||String(r.body.period||'').startsWith('보충 ')||c().state.schedules.some(s=>s.studentId===r.student_id&&s.teacherIds?.includes(uid())))
      .sort((a,b)=>b.day.localeCompare(a.day)||String(b.updated_at).localeCompare(String(a.updated_at)));
  }
  function reflectionText(r){
    const b=r.body||{};
    return [['교재·단원',[b.material,b.unit].filter(Boolean).join(' · ')],['페이지·문항',[b.pages,b.worksheets].filter(Boolean).join(' · ')],['공부한 내용',b.content],['알게 된 것',b.learned],['과제',b.assignment],['느낀 점',b.feeling],['피드백',b.feedback]].filter(([,v])=>v).map(([k,v])=>`<p><b>${k}</b> ${h(v)}</p>`).join('')||'<p class="muted">작성된 내용이 없습니다.</p>';
  }
  function reflectionQueue(){
    if(!staff())return '';
    const list=visibleReflections();
    return `<section class="panel ac-reflection-board"><div class="between"><h3>학생 수업기록 · 일지 연결</h3>${btn('새로고침','reload')}</div><div class="toolbar ac-reflection-tools"><span>${list.filter(r=>reflectionSelection.has(r.id)).length}건 선택</span>${btn('제출내용 전체 선택','reflections-all')}${btn('선택 해제','reflections-clear')}${btn('선택 내용으로 일괄 일지 작성','reflections-batch','','primary')}</div><div class="ac-reflection-grid">${list.map(r=>`<article class="ac-reflection-card"><div class="between"><label><input type="checkbox" data-reflection-select="${h(r.id)}" aria-label="${h(name(r.student_id)+' '+r.day+' '+(r.body.period||'')+' 수업기록 선택')}" ${reflectionSelection.has(r.id)?'checked':''} ${r.status==='draft'?'disabled':''}/><strong>${h(name(r.student_id))}</strong></label>${badge(r.status)}</div><small>${h(r.day)} · ${h(r.body.period||'시간 미입력')}</small><div class="ac-reflection-copy">${reflectionText(r)}</div><div class="toolbar">${btn('피드백·하원 확인','reflection-review',r.id)}${r.status!=='draft'?btn('일지 작성','reflection-lesson',r.id):''}</div></article>`).join('')||empty('아직 저장된 학생 수업기록이 없습니다.')}</div></section>`;
  }
  function reflectionBatchForm(){
    return form('선택한 학생 수업기록으로 일괄 일지 작성','reflection-batch',`<p class="muted small">날짜·수업 시간과 학생별 원문을 각각 연결합니다. 저장 후 일지를 검토하고 게시할 수 있습니다.</p><div class="ac-reflection-batch-grid">${reflectionBatch.map(id=>{
      const r=items.find(x=>x.id===id), old=rows('lesson_draft').find(x=>x.body.reflection_id===id&&x.student_id===r.student_id&&x.status==='draft');
      const b={...reflectionLessonBody(r.body),...old?.body};
      return `<section class="ac-reflection-card"><strong>${h(name(r.student_id))} · ${h(r.day)} · ${h(r.body.period||'')}</strong><div class="ac-reflection-copy">${reflectionText(r)}</div>`+area('선생님 관찰 키워드','keywords:'+id,b.keywords)+area('학부모님께 (직접 수정 가능)','parent_message:'+id,b.parent_message)+`</section>`;
    }).join('')}</div>`,'','<button type="submit" name="intent" value="draft" class="primary">학생별 일지 초안 일괄 저장</button><button type="submit" name="intent" value="ai-draft">AI 문장 작성 후 초안 일괄 저장</button>');
  }
  function home(){
    return `${notices()}${c().session.mustChangePassword?`<div class="ac-setup">처음 로그인하셨습니다. 비밀번호를 변경해주세요. ${btn('비밀번호 변경','password')}</div>`:''}${statusNotice()}<div class="ac-shortcuts">${staff()?routeBtn('오늘 수업','직전 과제부터 알림장까지','academy_class')+routeBtn('과제·질문','제출 확인과 답변','academy_inbox')+routeBtn('학생 성장기록','평가 · 진도 · 학습점수','academy_growth')+routeBtn('학부모 코멘트'+(admin()?` · ${commentNotifications.filter(n=>!n.checked_at).length}`:` · ${commentReviews.filter(r=>!r.teacher_at).length}`),'확인과 답글','academy_comments'):routeBtn(parent()?'자녀 알림장':'오늘의 학습',parent()?'학습 현황과 선생님 소통':'과제 제출 · 학습 리마인드','academy_learning')+routeBtn('선생님께 질문','사진과 글로 질문하기','academy_inbox')+routeBtn('성장기록','평가와 학습점수','academy_growth')}</div>${staff()?`${reflectionQueue()}<section class="panel">${taskBoard()}</section>${admin()?`<details class="panel"><summary>함께 할 일 · 직원별 업무 배정</summary>${taskBoard(true)}</details>`:''}${calendar()}<div class="ac-footer">${btn('학교 일정 확인','school-events')}${admin()?btn('가족 연결 · 앱 초대','families'):''}<button data-route="admin" ${!admin()?'hidden':''}>기존 학생·시간표 관리</button><button data-route="teacher">기존 수업기록</button></div>`:`${chips()}${learningSummary()}${!parent()?btn('학교 일정 올리기','school-event'):''}`}`;
  }
  function lessonStudents(){
    return sessionDay===day?lessonSessions.filter(s=>admin()||s.teacherIds.includes(uid())||s.lessonType==='보충'):[];
  }
  function studentSessionList(){return sessionDay===date()?lessonSessions.filter(s=>s.studentId===current()):[];}
  function studentSessionsPanel(){
    const list=studentSessionList();
    return `<section class="panel"><h3>오늘의 수업 · 보충</h3>${list.map(s=>{const own=rows('reflection').find(r=>r.student_id===current()&&r.day===date()&&r.body.period===s.period);return `<div class="ac-line"><span><strong>${h(s.lessonType==='보충'?s.period:'정규 '+s.period)}</strong>${own?badge(own.status):badge('작성 전')}</span>${!parent()?btn(own?'수업기록 확인·수정':'오늘 학습 3단계 작성','reflection-session',s.period):''}</div>`;}).join('')||empty('오늘 배정된 수업이 없습니다.')}</section>`;
  }
  function classView(){
    const schedules=lessonStudents();const periods=[...new Set(schedules.map(s=>s.period))];if(!periods.includes(period))period=periods[0]||'';
    const ids=[...new Set(schedules.filter(s=>s.period===period).map(s=>s.studentId))];
    return `${toolbar('오늘 수업','직전 과제를 확인하고, 같은 진도 학생은 함께 기록하세요.',`<input type="date" data-ac-date value="${day}" />`)}${statusNotice()}${reflectionQueue()}<div class="tabs">${periods.map(p=>btn(h(p),'period',p,p===period?'primary':'')).join('')}</div><div class="ac-selection"><span>${selected.size}명 선택</span>${btn('현재 시간 전체 선택','select-class')}${btn('선택 해제','clear')}${btn('공통 수업·알림장 작성','bulk-lesson')}${btn('과제 출제','assign')}${btn('단원평가 기록','assessment-batch')}</div><div class="ac-student-list">${ids.map(id=>{
      const s=c().state.students.find(x=>x.id===id);if(!s)return '';
      const prior=c().state.records.filter(r=>!r.hidden&&r.studentIds.includes(id)&&r.lessonDate<day).sort((a,b)=>b.lessonDate.localeCompare(a.lessonDate))[0];
      const hw=rows('homework').filter(i=>i.student_id===id&&i.day<day).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];
      const ref=findLessonReflection(items,id,day,period);
      const att=rows('attendance').find(i=>i.student_id===id&&i.day===day&&i.body.period===period);
      return `<article class="panel ac-student-row"><div class="ac-student-summary"><label class="ac-check"><input type="checkbox" data-ac-select="${id}" ${selected.has(id)?'checked':''} /><strong>${h(s.name)}</strong><small>${h(s.schoolYear||'')}</small></label><div class="ac-prior"><small>직전 과제 ${prior?h(prior.lessonDate):''}</small><span>${h(hw?.title||prior?.assignment||'이전 과제 없음')}</span>${hw?`${badge(hw.status)} ${btn('사진·검사','homework',hw.id)}`:''}</div><div class="ac-student-actions">${att?badge(({present:'출석',late:'지각',absent:'결석'})[att.status]||att.status):''}${btn('학습기록','history',id)}</div></div><details class="ac-student-details"><summary>☰ 출결 · 학습 기록${ref?' · '+h(({submitted:'확인 대기',approved:'승인',returned:'수정 요청'})[ref.status]||ref.status):''}</summary><div class="ac-row-grid"><div><small>출결</small><div class="toolbar">${[['present','출석'],['late','지각'],['absent','결석']].map(([v,t])=>btn(t,'attendance',id+':'+v,att?.status===v?'primary':'')).join('')}</div></div><div><small>수업태도</small>${btn(att?.body.attitude||'기록하기','attitude',id)}</div><div><small>오늘 학습 리마인드</small>${ref?badge(ref.status):'미제출'} ${ref?btn('내용 확인','reflection-review',ref.id):''}</div></div></details></article>`;
    }).join('')||empty('이 날짜에 배정된 수업이 없습니다. 기존 시간표 관리에서 배정을 확인해주세요.')}</div><section class="panel"><h3>알림장 초안·게시 현황</h3>${rows('lesson_draft').filter(i=>i.day===day).map(i=>`<div class="ac-line"><span>${h(name(i.student_id))} ${badge(i.status)}</span>${btn('수정·게시','edit-lesson',i.id)}</div>`).join('')||empty('아직 작성된 알림장이 없습니다.')}</section>`;
  }
  function learningHistory(id){
    const legacy=c().state.records.filter(r=>!r.hidden&&r.studentIds.includes(id));
    const kinds=['lesson','homework','reflection','attendance'];
    const history=items.filter(i=>i.student_id===id&&kinds.includes(i.kind));
    const days=[...new Set([...legacy.map(r=>r.lessonDate),...history.map(i=>i.day)])].sort((a,b)=>b.localeCompare(a));
    const line=(label,value)=>value?`<p class="notice-copy"><strong>${label}</strong> ${h(value)}</p>`:'';
    const content=days.map((d,index)=>`<details class="ac-history-day" ${index===0?'open':''}><summary>${h(d)}</summary>${legacy.filter(r=>r.lessonDate===d).map(r=>`<article class="ac-history-entry"><h4>수업 기록 · ${h(r.period||'')}${r.isDraft?' · 초안':''}</h4>${line('교재·단원',[r.material,r.unit].filter(Boolean).join(' · '))}${line('공부한 내용',r.content)}${line('과제',r.assignment)}${line('출결',r.attendance)}${line('과제 확인',r.homework)}${line('수업 메모',r.focus)}${line('테스트',r.testName)}${line('학부모 알림장',r.parentMessage)}${line('학생 알림장',r.studentMessage)}</article>`).join('')}${history.filter(i=>i.day===d).map(i=>`<article class="ac-history-entry"><h4>${{lesson:'수업 알림장',homework:'과제',reflection:'학생 학습 리마인드',attendance:'출결·수업태도'}[i.kind]} ${badge(({present:'출석',late:'지각',absent:'결석'})[i.status]||i.status)}</h4>${i.kind==='lesson'?line('교재·단원',[i.body.material,i.body.unit].filter(Boolean).join(' · '))+line('공부한 내용',i.body.content)+line('과제',i.body.assignment)+line('학부모 알림장',rows('parent_message').find(m=>m.body.lesson_id===i.id)?.body.text)+line('학생 알림장',rows('student_message').find(m=>m.body.lesson_id===i.id)?.body.text):i.kind==='homework'?line('과제',i.title)+line('안내',i.body.description)+line('검사 메모',i.body.feedback)+filesHtml(i.body.files):i.kind==='reflection'?line('공부한 내용',[i.body.material,i.body.unit,i.body.pages].filter(Boolean).join(' · '))+line('배운 점',i.body.learned)+line('과제',i.body.assignment)+line('느낀 점',i.body.feeling):line('수업 시간',i.body.period)+line('수업태도',i.body.attitude)}</article>`).join('')}</details>`).join('');
    return `<div class="ac-overlay"><section class="ac-dialog" role="dialog" aria-modal="true" aria-label="${h(name(id))} 학습기록"><div class="between"><h2>${h(name(id))} 학습기록</h2>${btn('닫기','close')}</div><p class="muted small">날짜를 누르면 수업 내용·과제·출결·알림장을 확인할 수 있습니다.</p>${content||empty('등록된 학습기록이 없습니다.')}</section></div>`;
  }
  function learningSummary(){
    const id=current();const hw=rows('homework').filter(i=>i.student_id===id);
    const lessons=rows('lesson').filter(i=>i.student_id===id);const plans=rows('class_plan').filter(i=>i.student_id===id&&i.day===date());
    return `${studentSessionsPanel()}${!parent()&&plans.length?`<section class="panel"><h3>오늘 공통 수업 안내</h3>${plans.map(p=>`<strong>${h(p.body.material)} · ${h(p.body.unit)}</strong><p class="notice-copy">${h(p.body.content)}</p><p>과제: ${h(p.body.assignment)}</p>`).join('')}</section>`:''}<section class="panel"><div class="between"><h3>${parent()?'자녀의 과제':'내 과제'}</h3>${!parent()?btn('오늘 학습 리마인드','reflection'):''}</div>${hw.map(i=>`<div class="ac-line"><div><strong>${h(i.title)}</strong><small>${i.due_at?h(i.due_at.slice(0,16).replace('T',' '))+' 마감':''}</small>${badge(i.status==='submitted'?'제출 완료 · 검사 대기':i.status)}</div>${btn(parent()?'보기':'사진 제출·확인','homework',i.id)}</div>`).join('')||empty('배정된 과제가 없습니다.')}</section><section class="panel"><h3>최근 알림장</h3>${lessons.map(i=>`<article class="home-notice"><div class="between"><strong>${i.day} · ${h(i.title)}</strong>${btn(parent()?'내용·코멘트':'내용·대화','lesson',i.id)}</div><p class="notice-copy">${h(i.body.content||'')}</p></article>`).join('')||empty('아직 게시된 새 알림장이 없습니다.')}<details><summary>이전 알림장 보기</summary>${legacyRecords.filter(r=>r.student_id===id).map(r=>`<article class="home-notice"><strong>${h(r.lesson_date)}</strong><p class="notice-copy">${h(r.content||'')}</p><p>과제: ${h(r.assignment||'')}</p><p>${h(parent()?r.parent_message||'':r.student_message||'')}</p></article>`).join('')||empty('이전 알림장이 없습니다.')}</details></section>`;
  }
  function parentComments(){
    const pending=commentNotifications.filter(n=>!n.checked_at);
    const list=commentReviews.map(r=>({...r,item:items.find(i=>i.id===r.comment_id)})).filter(r=>r.item).sort((a,b)=>b.updated_at.localeCompare(a.updated_at));
    const filtered=list.filter(r=>(commentFilter!=='teacher'||!r.teacher_at)&&(commentFilter!=='director'||pending.some(n=>n.comment_id===r.comment_id))&&(!commentSearch||[name(r.item.student_id),r.item.body.text,r.item.title].join(' ').toLowerCase().includes(commentSearch.toLowerCase())));
    return `${toolbar('학부모 코멘트','강사 확인과 원장 확인은 각각 처리됩니다.',btn('새로고침','reload'))}${statusNotice()}${!commentsReady?'<p class="ac-setup">학부모 코멘트 서버 설정이 필요합니다.</p>':''}<div class="toolbar"><input data-comment-search placeholder="학생 이름·내용 검색" value="${h(commentSearch)}"/><select data-comment-filter>${opts([['all',`전체 ${list.length}`],['teacher',`강사 미확인 ${list.filter(r=>!r.teacher_at).length}`],...(admin()?[['director',`원장 미확인 알림 ${pending.length}`]]:[])],commentFilter)}</select></div>${admin()?`<details class="panel" ${pending.length?'open':''}><summary>원장 알림 · 미확인 ${pending.length}건</summary>${pending.map(n=>`<div class="ac-line"><span>${h(name(items.find(i=>i.id===n.comment_id)?.student_id))} · ${{comment:'새 학부모 코멘트',edited:'학부모 코멘트 수정',teacher_checked:'강사 확인 완료',reply:'강사 답글 작성'}[n.event]}<small>${h(c().state.teachers.find(t=>t.id===n.actor_id)?.name||items.find(i=>i.id===n.comment_id)?.body.author_name||'학부모')} · ${new Date(n.created_at).toLocaleString('ko-KR')}</small></span>${btn('코멘트 보기','comment-view',n.comment_id)}</div>`).join('')||empty('미확인 알림이 없습니다.')}</details>`:''}${filtered.map(r=>{const i=r.item;return `<article class="panel" id="comment-${i.id}"><div class="between"><strong>${h(name(i.student_id))} · ${h(i.body.author_name||'학부모')}</strong><small>${new Date(i.created_at).toLocaleString('ko-KR')}</small></div><p class="notice-copy">${h(i.body.text||'')}</p><div class="toolbar">${r.teacher_at?badge('강사 확인 · '+teacher(r.teacher_id)):btn('확인 ✓','comment-check',i.id)}${btn('답글 달기','comment-reply',i.id)}${btn('대화 보기','thread',i.kind==='question'?i.id:i.body.thread)}${admin()?(pending.some(n=>n.comment_id===i.id)?btn('원장 확인 ✓','comment-director',i.id):badge('원장 확인 완료')):''}</div></article>`;}).join('')||empty('학부모 코멘트가 없습니다.')}`;
  }
  function inbox(){
    const qs=rows('question').filter(i=>staff()||i.student_id===current());
    const hs=rows('homework').filter(i=>staff()||i.student_id===current()).sort((a,b)=>(a.status==='submitted'?-1:1)-(b.status==='submitted'?-1:1));
    return `${toolbar('과제·질문','사진을 확인하고, 필요한 답변을 남겨주세요.',btn('질문·문의 작성','question'))}${statusNotice()}${staff()?'':chips()}<section class="panel"><h3>질문과 문의</h3>${qs.map(i=>`<div class="ac-line"><div>${badge(i.status)} <strong>${h(i.title)}</strong><small>${h(name(i.student_id))} · ${i.audience==='parent'?'학부모':'학생'} · ${h(teacher(i.assignee_id))}</small></div>${btn('답변·대화','thread',i.id)}</div>`).join('')||empty('새 질문이 없습니다.')}</section><section class="panel"><h3>과제 제출함</h3>${hs.map(i=>`<div class="ac-line"><div><strong>${h(name(i.student_id))} · ${h(i.title)}</strong> ${badge(i.status)}</div>${btn('확인','homework',i.id)}</div>`).join('')||empty('제출할 과제가 없습니다.')}</section>`;
  }
  const schoolGrades=['초1','초2','초3','초4','초5','초6'];
  function schoolGrade(id=current()) {const s=allStudents().find(s=>s.id===id);return s?.schoolYear||s?.school_year||'';}
  function gradeFields(body={},sid=current()) {
    return `<div class="ac-grade-fields">`+select('기록 학년','school_grade',[['','미분류'],...schoolGrades.map(x=>[x,x])],body.school_grade??schoolGrade(sid))+select('학기','term',[['','미분류'],['1','1학기'],['2','2학기']],body.term||'')+select('초등 단원','unit_no',[['','해당 없음'],...[1,2,3,4,5,6].map(x=>[String(x),x+'단원'])],body.unit_no||'')+`</div>`;
  }
  const addedGrades=new Map();
  const gradePreferenceKey=id=>'academy-grade-tabs:'+uid()+':'+id;
  function extraGrades(id){
    if(!addedGrades.has(id)){let values=[];try{values=JSON.parse(localStorage.getItem(gradePreferenceKey(id))||'[]');}catch{}addedGrades.set(id,Array.isArray(values)?values.filter(g=>schoolGrades.includes(g)):[]);}
    return addedGrades.get(id);
  }
  function schoolReport(id){
    const records=rows('assessment').filter(i=>i.student_id===id&&i.body.category==='단원평가');
    const currentGrade=schoolGrade(id);
    const shown=schoolGrades.filter(g=>g===currentGrade||extraGrades(id).includes(g)||records.some(r=>r.body.school_grade===g));
    const remaining=schoolGrades.filter(g=>!shown.includes(g));
    return `<section class="panel ac-school-report"><div class="between"><h3>학년별 단원평가 기록</h3><div class="toolbar">${staff()&&remaining.length?`<select data-add-grade aria-label="추가할 학년">${opts(remaining.map(g=>[g,g]),remaining.find(g=>schoolGrades.indexOf(g)>schoolGrades.indexOf(currentGrade))||remaining[0])}</select>${btn('학년 추가','grade-add')}`:''}</div></div><form data-ac-form="school-scores" data-student="${h(id)}">${staff()?`<div class="ac-score-controls">${input('새 기록 시험일','exam_day',date(),'date')}<small>빈칸 클릭 후 점수 입력 · 기본 100점 만점</small></div>`:''}${shown.map(g=>{
      const slots=[1,2,3,4,5,6].map(n=>[String(n),n+'단원']);
      const gradeRecords=records.filter(r=>r.body.school_grade===g);
      return `<details class="ac-grade-section" data-grade="${g}" open><summary>${g.replace('초','초등 ').replace('중','중등 ').replace('고','고등 ')}학년 ${g===currentGrade?'<em>현재 학년</em>':''}</summary><div class="ac-semesters">${['1','2'].map(term=>`<div class="ac-term"><h4>${term}학기</h4><div class="ac-exam-slots" style="--slot-count:${slots.length}">${slots.map(([key,label])=>{
        const matches=gradeRecords.filter(r=>String(r.body.term)===term&&String(r.body.unit_no)===key).sort((a,b)=>b.day.localeCompare(a.day)||b.created_at.localeCompare(a.created_at));
        const r=matches[0];
        return `<label class="ac-exam-slot"><strong>${label}</strong>${staff()?`<input type="number" min="0" max="${r?.body.total??100}" step="any" data-school-score data-grade="${g}" data-term="${term}" data-slot="${key}" data-record="${r?.id||''}" data-original="${r?.body.score??''}" value="${r?.body.score??''}" placeholder="—" aria-label="${g} ${term}학기 ${label} 점수" title="${r?h(r.day+' · '+r.title):'점수 입력'}"/>`:`<span>${r?h(r.body.score):'—'}</span>`}${r&&Number(r.body.total)!==100?`<small>/${h(r.body.total)}</small>`:''}${matches.length>1?`<small>${matches.length}회 · 최근 점수</small>`:''}</label>`;
      }).join('')}</div></div>`).join('')}</div></details>`;
    }).join('')}${staff()?'<p class="ac-form-status" role="status"></p><button type="submit" class="primary">변경한 점수 저장</button>':''}</form><p class="muted small">기존 점수를 고치면 해당 기록이 수정됩니다. 이전 시험 내역과 추가 시험은 전체 평가 목록에서 관리하세요.</p></section>`;
  }

  function growth(){
    const id=current();return `${toolbar('성장기록','성적과 성실한 학습 활동을 따로 기록합니다.',staff()?'<button data-action="openBulkMaterialForm">교재 여러 학생 배정</button>'+btn('단원평가 추가','assessment')+btn('교재·진도 추가','progress'):'')}${statusNotice()}${staff()?`<select data-ac-student>${opts(allStudents().map(s=>[s.id,s.name]),id)}</select>`:chips()}${schoolReport(id)}<details class="panel"><summary>평가 기록 목록 · 기존 기록 포함</summary><div class="ac-table-wrap"><table><thead><tr><th>날짜</th><th>평가</th><th>점수 / 만점</th><th>비율</th><th>클리닉</th></tr></thead><tbody>${rows('assessment').filter(i=>i.student_id===id).map(i=>`<tr><td>${i.day}</td><td>${h(i.title)}<small>${h(i.body.category)}${i.body.unit?' · '+h(i.body.unit):''}</small></td><td>${i.body.score} / ${i.body.total}</td><td>${i.body.percent}%<progress max="100" value="${i.body.percent}"></progress></td><td>${i.body.clinic?'완료':staff()?btn('완료 확인','clinic',i.id):'—'}${staff()?btn('수정','assessment-edit',i.id):''}</td></tr>`).join('')}</tbody></table></div></details><section class="panel"><h3>과정별 진도</h3>${rows('progress').filter(i=>i.student_id===id).map(i=>`<div class="ac-line"><div><strong>${h(i.body.course)} · ${h(i.title)}</strong><p>${h(i.body.unit)} · ${h(i.body.stage)}</p><small>이해도: ${h(i.body.understanding||'미확인')}</small></div>${staff()?btn('진도 수정','progress',i.id):''}</div>`).join('')||empty('교재를 배정하면 현행·선행 과정을 나란히 볼 수 있습니다.')}</section>${parent()?'':`<section class="panel"><div class="between"><h3>학습점수 랭킹</h3><select data-ac-rank>${opts([[1,'최근 1개월'],[3,'최근 3개월'],[6,'최근 6개월']],rankMonths)}</select></div>${admin()?`<div class="toolbar"><label>시상 시작<input type="date" data-ac-rank-start value="${rankStart}" /></label><label>시상 종료<input type="date" data-ac-rank-end value="${rankEnd}" /></label>${btn('기간 순위 확인','ranking')}${btn('시상 결과 CSV','rank-export')}</div>`:''}<p class="muted small">초등·중등·고등 그룹별 순위 · 동점은 공동 순위 · 학생에게는 다른 학생 이름을 가려 표시합니다.</p>${rankings.map(r=>`<div class="ac-line"><span>${h(r.school_group)}등부 · ${r.place}위 ${h(r.display_name)}</span><strong>${r.total}점</strong></div>`).join('')||btn('순위 불러오기','ranking')}<h4>내역 · 누적 ${points.filter(p=>p.student_id===id).reduce((s,p)=>s+p.points,0)}점</h4>${points.filter(p=>p.student_id===id&&p.points).slice(0,20).map(p=>`<div class="ac-line"><span>${p.earned_at.slice(0,10)} · ${h(p.reason)}</span><b>+${p.points}</b></div>`).join('')}</section>`}`;
  }
  function notificationRail(){
    if(!staff())return '';
    const assigned=id=>admin()||c().state.schedules.some(s=>s.studentId===id&&s.teacherIds?.includes(uid()));
    const events=[];
    for(const r of visibleReflections().filter(r=>r.status==='submitted'||r.status==='returned'))events.push({at:r.updated_at,title:name(r.student_id)+' · 학습 리마인드',copy:`<label class="ac-notification-select"><input type="checkbox" data-reflection-select="${h(r.id)}" aria-label="${h(name(r.student_id))} 알림에서 일지 선택" ${reflectionSelection.has(r.id)?'checked':''}/>일괄 일지에 포함</label>${reflectionText(r)}`,actions:btn('일지 작성','reflection-lesson',r.id)});
    for(const r of rows('homework').filter(r=>r.status==='submitted'&&assigned(r.student_id)))events.push({at:r.updated_at,title:name(r.student_id)+' · 과제 제출',copy:`<p>${h(r.title)}</p><p>${h(r.body.description||'')}</p><p>${h(r.body.text||'')}</p>`,actions:btn('제출 검사','homework',r.id)});
    for(const r of rows('question').filter(r=>r.audience!=='parent'&&['open','answering'].includes(r.status)&&assigned(r.student_id)))events.push({at:r.updated_at,title:name(r.student_id)+' · 질문',copy:`<p>${h(r.title)}</p><p>${h(r.body.text||'')}</p>`,actions:btn('답변','thread',r.id)});
    const pending=admin()?commentNotifications.filter(n=>!n.checked_at):commentReviews.filter(n=>!n.teacher_at).map(n=>({...n,event:'comment'}));
    for(const n of pending){const r=items.find(i=>i.id===n.comment_id);if(!r)continue;events.push({at:n.created_at||r.updated_at,title:name(r.student_id)+' · '+({comment:'학부모 코멘트',edited:'코멘트 수정',teacher_checked:'강사 확인',reply:'강사 답글'}[n.event]||'학부모 코멘트'),copy:`<p>${h(r.body.text||'')}</p>`,actions:btn(admin()?'원장 확인':'확인',admin()?'comment-director':'comment-check',r.id)+btn('답글','comment-reply',r.id)});}
    events.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
    return `<aside class="ac-notification-rail" aria-label="알림 목록"><div class="between"><strong>🔔 알림 · 확인할 일 ${events.length}</strong>${btn('새로고침','reload')}</div><div class="toolbar">${btn(`선택 ${reflectionSelection.size}건 일괄 일지 작성`,'reflections-batch')}</div><div class="ac-notification-list">${events.map(n=>`<article><strong>${h(n.title)}</strong><div class="ac-reflection-copy">${n.copy}</div><small>${n.at?h(new Date(n.at).toLocaleString('ko-KR')):''}</small><div class="toolbar">${n.actions}</div></article>`).join('')||empty('확인할 알림이 없습니다.')}</div></aside>`;
  }
  function render(route){
    if(!uid())return '';
    if(loadedFor!==uid()&&!loadPromise)load().then(refresh);
    let content=route==='academy_comments'&&staff()?parentComments():route==='home'?home():route==='academy_class'?classView():route==='academy_inbox'?inbox():route==='academy_growth'?growth():`${statusNotice()}${chips()}${learningSummary()}`;
    return `<div class="academy ${parent()?'ac-parent-view':''}">${staff()?`<div class="ac-workspace"><main class="ac-workspace-main">${content}</main>${notificationRail()}</div>`:content}${panel}</div>${parent()?'<a class="ac-kakao-contact" href="https://pf.kakao.com/_rYZFb/chat" target="_blank" rel="noopener noreferrer" aria-label="카카오톡으로 독수리수학에 문의하기 (새 창)">💬 카카오톡 문의</a>':''}`;
  }
  function taskForm(shared){return form(shared?'分配 업무'.replace('分配','함께 할'):'내 할 일 추가','task',area('할 일 — 한 줄마다 별도 업무','titles','','학부모 상담 준비\n학습지 정리')+input('프로젝트 (선택)','project')+select('우선순위','priority',[['normal','보통'],['high','높음'],['low','낮음']],'normal')+input('마감일','due','', 'date')+(shared&&admin()?select('담당 직원','assignee',c().state.teachers.filter(t=>t.active).map(t=>[t.id,t.name]),uid()):`<input name="assignee" type="hidden" value="${uid()}"/>`)+`<input name="shared" type="hidden" value="${shared}"/>`+select('반복','repeat',[['none','반복 없음'],['daily','매일 (휴원일 제외)'],['weekly','매주 같은 요일'],['monthly','매월 같은 날짜']],'none')+input('반복 종료일','repeat_end','','date'));}
  function reflectionForm(){
    const sessions=studentSessionList();
    if(!sessions.some(s=>s.period===period))period=sessions[0]?.period||'오늘 수업';
    const own=rows('reflection').find(i=>i.student_id===uid()&&i.day===date()&&i.body.period===period);
    if(own?.status==='approved')return form('오늘 학습 정리','readonly',`<p>하원 승인되었습니다.</p><div class="ac-reflection-copy">${reflectionText(own)}</div>`,own.id,btn('닫기','close'));
    const saved=own?.body||{};
    return form('오늘 학습 리마인드','reflection',`<p>${h(own?.body.feedback||'오늘 공부한 내용을 스스로 정리해 보세요.')}</p>`+`<p><strong>${h(date())} · ${h(period)}</strong></p><input type="hidden" name="period" value="${h(period)}"/>`+input('교재','material',saved.material)+input('단원','unit',saved.unit)+input('페이지','pages',saved.pages)+input('학습지·문항 수','worksheets',saved.worksheets)+area('오늘 알게 된 것','learned',saved.learned)+area('오늘의 과제 (없으면 없음)','assignment',saved.assignment)+area('느낀 점·어려웠던 점','feeling',saved.feeling),own?.id||'', '<button type="submit" name="intent" value="draft">임시저장</button><button type="submit" name="intent" value="submitted" class="primary">선생님께 확인받기</button>');
  }
  const draftKey=kind=>`eagle-draft:${uid()}:${kind}:${date()}:${encodeURIComponent(period)}`;
  function lessonForm(i, source){
    const ids=i?[i.student_id]:[...selected];
    const refs=ids.map(id=>findLessonReflection(items,id,i?.day||day,i?.body.period||period,source?.id||i?.body.reflection_id)).filter(Boolean);
    const own=source||(ids.length===1?refs[0]:null);
    const d={...reflectionLessonBody(own?.body),...i?.body};
    return form(i?'알림장 수정':'학생 수업기록으로 수업 일지 작성','lesson',`<p>${ids.map(name).map(h).join(', ')} · 학생 원문은 그대로 보존됩니다.</p><input type="hidden" name="reflection_id" value="${h(own?.id||i?.body.reflection_id||'')}"/><details open><summary>연결된 학생 수업기록 ${refs.length}건</summary>${refs.map(r=>`<p>${h(name(r.student_id))} · ${h(r.body.material)} ${h(r.body.unit)} ${h(r.body.pages)}</p><p class="notice-copy">${h(r.body.learned||'')}</p><p>과제: ${h(r.body.assignment||'')}</p><p>${h(r.body.feeling||'')}</p>`).join('')}</details>`+
      input('수업 제목','title',i?.title||'오늘 수업')+input('교재','material',d.material)+input('단원','unit',d.unit)+input('학습 과정 (입력하면 진도표에 자동 반영)','course',d.course)+select('진도 구분','track',['현행','선행','복습'].map(x=>[x,x]),d.track||'현행')+
      area('공부한 내용 · 페이지 · 문항 수','content',d.content)+area('오늘 알게 된 것','learned',d.learned)+area('오늘의 과제','assignment',d.assignment)+area('학생 소감','feeling',d.feeling)+area('선생님 관찰 키워드','keywords',d.keywords)+area('학부모님께','parent_message',d.parent_message)+area('학생에게','student_message',d.student_message)+area('직원 내부 메모','internal_note',d.internal_note)+btn('AI 문장 다듬기','polish-form')+`<div class="ac-ai-result"></div>`,i?.id||'', '<button type="submit" name="intent" value="draft">초안 저장</button><button type="submit" name="intent" value="publish" class="primary">게시하기</button><button type="submit" name="intent" value="ai-publish">AI 다듬기 후 바로 게시</button>');
  }
  function assessmentBatchForm(){
    const visible=new Set(lessonStudents().filter(s=>s.period===period).map(s=>s.studentId));
    const ids=[...selected].filter(id=>visible.has(id));
    if(!ids.length)throw new Error('현재 수업에서 평가를 기록할 학생을 먼저 선택해주세요.');
    return form(`선택 학생 단원평가 · ${ids.length}명`, 'assessment-batch',`<div class="ac-assessment-fields">`+input('평가명','title')+`<input type="hidden" name="category" value="단원평가"/>`+input('단원 (선택)','unit')+input('시험일','day',day,'date')+input('만점·전체 문항 수','total',100,'number')+`</div>`+gradeFields({school_grade:([...new Set(ids.map(schoolGrade))].length===1?schoolGrade(ids[0]):'')})+`<p class="muted small">선택한 학생별 점수를 입력하세요. 빈칸은 저장하지 않습니다.</p><div class="ac-score-list">${ids.map(id=>`<label class="ac-score-row"><span>${h(name(id))}</span><input type="number" min="0" step="any" name="score:${h(id)}" data-score-student="${h(id)}" aria-label="${h(name(id))} 점수" placeholder="점수"/></label>`).join('')}</div><label><input name="first_attempt" type="checkbox" checked/>첫 응시 성적 (재시험은 보너스 제외)</label>`,'','<button class="primary" type="submit">입력한 점수 저장</button>');
  }
  function assessmentForm(i){return form(i&&i.body.category!=='단원평가'?'기존 평가 수정':'단원평가 기록','assessment',studentSelect(i?.student_id)+gradeFields(i?.body||{},i?.student_id||current())+input('평가명','title',i?.title||'')+input('시험일','day',i?.day||day,'date')+`<input type="hidden" name="category" value="${h(i?.body.category||'단원평가')}"/>`+`<div class="grid two">${input('취득 점수·정답 수','score',i?.body.score??'','number')}${input('만점·전체 문항 수','total',i?.body.total??100,'number')}</div>`+input('단원 (선택)','unit',i?.body.unit||'')+`<label><input name="first_attempt" type="checkbox" ${i?.body.first_attempt===false?'':'checked'}/>첫 응시 성적 (재시험은 보너스 제외)</label>`+area('메모','note',i?.body.note||''),i?.id||'');}
  function homeworkPanel(i){return form(h(i.title),'homework',`<p>${h(i.body.description||'')}</p><p>${badge(i.status)} ${h(i.body.feedback||'')}</p><div class="toolbar">${filesHtml(i.body.files)}</div>${staff()?area('보완할 내용','feedback',i.body.feedback||''):!parent()?fileInput():''}`,i.id,staff()?'<button name="intent" value="returned">보완 요청</button><button name="intent" value="checked" class="primary">검사 완료</button>':!parent()&&i.status!=='checked'?'<button class="primary" name="intent" value="submitted">사진 제출</button>':btn('닫기','close'));}
  function threadPanel(i){
    const replies=rows('reply').filter(r=>r.body.thread===i.id).sort((a,b)=>a.created_at.localeCompare(b.created_at));
    const message=rows(parent()?'parent_message':'student_message').find(r=>r.body.lesson_id===i.id);
    return form(i.kind==='lesson'?'알림장 · 소통':h(i.title),'reply',`<p class="notice-copy">${h(i.body.text||i.body.content||'')}</p>${i.kind==='lesson'?`<p>과제: ${h(i.body.assignment||'')}</p>${i.body.reflection?`<p>학생이 배운 점: ${h(i.body.reflection.learned||'')}</p>`:''}<p>${h(i.body.assessments||'')}</p><p class="notice-copy">${h(message?.body.text||'')}</p>`:''}<div>${filesHtml(i.body.files)}</div>${replies.map(r=>`<article class="ac-reply"><small>${h(r.owner_id===uid()?'나':r.body.author_name||'선생님')} · ${r.created_at.slice(0,16).replace('T',' ')}</small><p>${h(r.body.text)}</p></article>`).join('')}${staff()&&i.kind==='question'?`<div class="toolbar">${btn('내가 답변하기','claim',i.id)}${btn('AI 도움받기','ai-answer',i.id)}${btn('담당 강사에게 넘기기','handoff',i.id)}</div>`:''}`+area('답변·추가 질문','text')+`<div class="ac-ai-result"></div><input type="hidden" name="audience" value="${i.kind==='lesson'?(parent()?'parent':'student'):i.audience}"/>`,i.id,`<button class="primary">${staff()?'답변 보내기':'글 남기기'}</button>${i.kind==='question'?btn('이해했어요 · 해결','resolve',i.id):''}`);
  }
  async function polish(source,kind='parentMessage'){
    const {data,error}=await db.functions.invoke('ai-polish',{body:{source,kind}});if(error||!data?.text)throw new Error(data?.error||'AI 연결을 확인해주세요. 원문은 그대로 보존됩니다.');return data.text;
  }
  async function rank(){if(parent()){rankings=[];return;}const {data,error}=await db.rpc('academy_ranking',{p_months:Number(rankMonths),p_start:rankStart||null,p_end:rankEnd||null});if(error)throw error;rankings=data||[];}
  function familiesPanel(parentId='',unlink=false){const linked=familyLinks.filter(l=>l.parent_id===parentId).map(l=>l.student_id);return form('가족 연결 · 앱 초대','family',`<p>학부모 계정은 학생 계정과 별도로 관리합니다. 연결된 자녀 중 누구의 아이디로든 학부모 주소에서 로그인할 수 있습니다.</p>`+`<input type="hidden" name="parentId" value="${parentId}"/>`+(parentId?`<p>${h(parentAccounts.find(p=>p.id===parentId)?.name||'학부모')} · 자녀 연결 수정</p>`:input('학부모 이름','name')+input('학부모 계정 아이디','loginId')+input('초기 비밀번호 (6자 이상)','password','','password'))+`<label>연결할 자녀<select multiple name="children" size="8">${allStudents().map(s=>`<option value="${s.id}" ${!unlink&&linked.includes(s.id)?'selected':''}>${h(s.name)}</option>`).join('')}</select></label><p class="muted small">여러 자녀는 Command/Ctrl을 누르고 선택하세요.</p><div class="toolbar">${btn('강사 초대문 복사','invite','teacher')}${btn('학생 초대문 복사','invite','student')}${btn('학부모 초대문 복사','invite','parent')}</div>${parentAccounts.map(p=>`<div class="ac-line"><span>${h(p.name)} · ${familyLinks.filter(l=>l.parent_id===p.id).map(l=>h(name(l.student_id))).join(', ')}</span>${btn('연결 수정','family-edit',p.id)}</div>`).join('')}`);}
  function eventsPanel(){return form('학교 일정 확인','readonly',rows('school_event').map(i=>`<article class="home-notice"><strong>${h(i.title)}</strong><p>${i.day} · ${h(name(i.student_id))} · ${h(i.body.school)} ${h(i.body.grade)} ${h(i.body.classroom)}반</p><p>${h(i.body.text)}</p>${filesHtml(i.body.files)} ${badge(i.status)}${admin()&&i.status!=='approved'?btn('확정 · 달력 반영','approve-event',i.id):''}</article>`).join('')||empty('제출된 학교 일정이 없습니다.'),'',btn('닫기','close'));}
  async function click(e){
    const b=e.target.closest('[data-ac]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(busy)return;
    const a=b.dataset.ac,id=b.dataset.id,i=items.find(x=>x.id===id);
    if(['task','shared-task','reflection','question','assessment','assessment-batch','assessment-edit','school-event','progress','bulk-lesson','edit-lesson','assign','families'].includes(a))batchIds.clear();
    try{
      if(a==='close'){panel='';batchIds.clear();clearTimeout(draftTimer);refresh();return;}
      if(a==='reload'){await load();refresh();return;}
      if(a==='task-history'){panel=taskHistory(id==='true');refresh();return;}
      if(a==='task-archive'||a==='task-restore'){busy=true;b.disabled=true;const r=await db.rpc('academy_archive_task',{p_id:id,p_expected:i.updated_at,p_restore:a==='task-restore'});if(r.error)throw r.error;await load();if(a==='task-restore')panel='';refresh();return;}
      if(a==='child'){student=id;refresh();return;}
      if(a==='period'){period=id;selected.clear();refresh();return;}
      if(a==='clear'){selected.clear();refresh();return;}
      if(a==='select-class'){lessonStudents().filter(x=>x.period===period).forEach(x=>selected.add(x.studentId));refresh();return;}
      if(a==='day'){day=id;selected.clear();await load();refresh();return;}
      if(a==='prev-month'||a==='next-month'){const [y,m]=month.split('-').map(Number);const d=new Date(y,m-1+(a==='next-month'?1:-1),1);month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;refresh();return;}
      if(a==='comment-view'){commentFilter='all';commentSearch='';refresh();document.getElementById('comment-'+id)?.scrollIntoView({block:'center',behavior:'smooth'});return;}
      if(a==='comment-check'||a==='comment-director'){
        const result=await db.rpc('academy_check_comment',{p_comment:id,p_director:a==='comment-director'});if(result.error)throw result.error;await load();refresh();return;
      }
      if(a==='comment-reply'){batchIds.clear();panel=form('학부모 코멘트에 답글','comment-reply',`<p class="notice-copy">${h(i.body.text||'')}</p>`+area('답글','text'),id);}
      if(a==='password')panel=form('비밀번호 변경','password',input('새 비밀번호 (6자 이상)','password','','password')+input('새 비밀번호 확인','confirm','','password'));
      if(a==='task'||a==='shared-task')panel=taskForm(a==='shared-task');
      if(a==='reflection'||a==='reflection-session'){if(parent()||staff())return;if(a==='reflection-session')period=id;panel=reflectionForm();}
      if(a==='homework')panel=homeworkPanel(i);
      if(a==='question')panel=form(parent()?'선생님께 문의':'사진으로 질문하기','question',studentSelect()+input('제목','title')+area('어디가 궁금한가요?','text')+fileInput());
      if(a==='thread'||a==='lesson')panel=threadPanel(i);
      if(a==='grade-add'){
        const grade=document.querySelector('[data-add-grade]')?.value;
        if(!staff()||!schoolGrades.includes(grade))return;
        const id=current();const added=extraGrades(id);if(!added.includes(grade))added.push(grade);
        try{localStorage.setItem(gradePreferenceKey(id),JSON.stringify(added));}catch{}
        const pending=[...document.querySelectorAll('[data-school-score]')].map(el=>({grade:el.dataset.grade,term:el.dataset.term,slot:el.dataset.slot,value:el.value}));
        const examDay=document.querySelector('[name="exam_day"]')?.value;
        refresh();
        for(const el of document.querySelectorAll('[data-school-score]')){const prior=pending.find(x=>x.grade===el.dataset.grade&&x.term===el.dataset.term&&x.slot===el.dataset.slot);if(prior)el.value=prior.value;}
        const dateInput=document.querySelector('[name="exam_day"]');if(dateInput&&examDay)dateInput.value=examDay;
        return;
      }
      if(a==='grades-open'||a==='grades-current'){
        document.querySelectorAll('.ac-grade-section').forEach(el=>{el.open=a==='grades-open'||el.dataset.grade===schoolGrade();});return;
      }
      if(a==='assessment-slot'){
        batchIds.clear();const [g,term,key]=id.split('|');
        panel=assessmentForm({student_id:current(),day,title:g+' '+term+'학기 '+(key+'단원'),body:{school_grade:g,term,unit_no:key,category:'단원평가',total:100}});
      }
      if(a==='assessment-batch')panel=assessmentBatchForm();
      if(a==='assessment'||a==='assessment-edit')panel=assessmentForm(i);
      if(a==='families')panel=familiesPanel();
      if(a==='family-edit')panel=familiesPanel(id);
      if(a==='family-unlink')panel=familiesPanel(id,true);
      if(a==='makeup-new'||a==='makeup-edit'){
        if(!admin())return;batchIds.clear();panel=makeupForm(a==='makeup-edit'?c().state.academicEvents.find(e=>e.id===id&&e.type==='보충'):null);
      }
      if(a==='makeup-preset'){const f=b.closest('form');[f.elements.start.value,f.elements.end.value]=id.split('|');return;}
      if(a==='makeup-select'||a==='makeup-clear'){const f=b.closest('form');f.querySelectorAll('[data-makeup-option]').forEach(el=>{if(a==='makeup-clear'||!el.hidden)el.querySelector('input').checked=a==='makeup-select';});updateMakeupPicker(f);return;}
      if(a==='makeup-cancel'){
        if(!admin())return;const event=c().state.academicEvents.find(e=>e.id===id&&e.type==='보충');if(!event)return;
        panel=form('보충 취소 확인','makeup-cancel',`<p>${h(event.startDate)} · ${h(event.title)}</p>${makeupCopy(event)}<p>이 보충 일정을 캘린더에서 제외합니다.</p>`,id,'<button type="submit" class="danger">보충 일정 취소</button>');
      }
      if(a==='school-events')panel=eventsPanel();
      if(a==='school-event')panel=form('학교 일정 올리기','school_event',studentSelect()+input('일정 제목','title')+input('날짜','day',day,'date')+input('학교','school')+input('학년','grade')+input('반','classroom')+select('범위','scope',[['student','개인'],['class','학교 반'],['grade','학교 학년'],['school','학교 전체']],'class')+area('평가 범위·안내','text')+fileInput());
      if(a==='progress')panel=form('과정별 교재·진도','progress',studentSelect(i?.student_id)+input('교재 (판본 포함)','title',i?.title||'')+select('학습 구분','track',[['현행','현행'],['선행','선행'],['복습','복습']],i?.body.track||'현행')+input('과정 (예: 중2, 공통수학1)','course',i?.body.course||'')+input('단원·페이지','unit',i?.body.unit||'')+select('학습 단계','stage',['학습 중','개념 학습','기본 문제','심화 문제','복습','완료'].map(x=>[x,x]),i?.body.stage||'개념 학습')+input('이해도·복습 필요 사항','understanding',i?.body.understanding||''),i?.id||'');
      if(a==='reflections-all'){visibleReflections().filter(r=>r.status!=='draft').forEach(r=>reflectionSelection.add(r.id));refresh();return;}
      if(a==='reflections-clear'){reflectionSelection.clear();refresh();return;}
      if(a==='reflections-batch'){
        if(!staff())return;
        reflectionBatch=visibleReflections().filter(r=>reflectionSelection.has(r.id)&&r.status!=='draft').map(r=>r.id);
        if(!reflectionBatch.length)throw new Error('학생 수업기록을 먼저 체크해주세요.');
        batchIds.clear();panel=reflectionBatchForm();
      }
      if(a==='bulk-lesson'){if(!selected.size)throw new Error('학생을 먼저 선택해주세요.');panel=lessonForm();}
      if(a==='edit-lesson')panel=lessonForm(i);
      if(a==='reflection-lesson'){
        if(!staff()||!i||i.kind!=='reflection'||i.status==='draft')return;
        batchIds.clear();day=i.day;period=i.body.period||'';selected=new Set([i.student_id]);
        const existing=rows('lesson_draft').find(r=>r.student_id===i.student_id&&r.day===i.day&&r.body.reflection_id===i.id);
        panel=lessonForm(existing,i);
      }
      if(a==='assign'){if(!selected.size)throw new Error('학생을 먼저 선택해주세요.');panel=form('선택 학생에게 과제 출제','assign',`<p>${[...selected].map(name).map(h).join(', ')}</p>`+input('과제 제목·범위','title')+area('안내','description')+input('마감 시간','due','','datetime-local')+'<label><input name="extra" type="checkbox"/>추가 학습지 (검사 완료 시 1점)</label>');}
      if(a==='reflection-review')panel=form('학습 정리 확인','reflection-review',`<p>${h(name(i.student_id))} · ${h(i.body.material)} ${h(i.body.unit)} ${h(i.body.pages)}</p><p class="notice-copy">${h(i.body.learned)}</p><p>과제: ${h(i.body.assignment)}</p><p>${h(i.body.feeling)}</p>`+area('수정 요청·피드백','feedback',i.body.feedback),i.id,'<button name="intent" value="returned">수정 요청</button><button name="intent" value="approved" class="primary">하원 승인</button>');
      if(a==='attitude')panel=form('출결·수업태도','attitude',select('수업태도','attitude',['적극 참여','보통','집중 도움 필요'].map(x=>[x,x]),'보통')+area('직원 내부 메모','note'),id);
      if(a==='handoff')panel=form('담당 강사에게 넘기기','handoff',select('담당 강사','assignee',c().state.teachers.filter(t=>t.active).map(t=>[t.id,t.name]),i.assignee_id),id);
      if(a==='history'){if(!staff())return;panel=learningHistory(id);}
      if(a==='invite'){
        const base=new URL('.',location.href);if(/\/(teacher|student|parent)\/$/.test(base.pathname))base.pathname=base.pathname.replace(/(teacher|student|parent)\/$/,'');
        if(['localhost','127.0.0.1'].includes(base.hostname))throw new Error('외부에서 접속할 운영 주소에 배포한 후 초대문을 복사해주세요.');
        const url=new URL(id+'/',base).href;await navigator.clipboard.writeText(`안녕하세요, 독수리수학입니다.\n${id==='parent'?'자녀의 알림장과 학습기록을 확인하고 선생님과 소통해주세요.':'독수리수학 학습 알림장에 초대합니다.'}\n접속: ${url}\n아이디와 비밀번호는 안내받으신 계정 정보를 입력해주세요.`);alert('초대문을 복사했습니다.');return;
      }
      if(a==='file'){const {data,error}=await db.storage.from('academy-private').createSignedUrl(id,300);if(error)throw error;window.open(data.signedUrl,'_blank','noopener');return;}
      if(a==='polish-form'){
        const f=b.closest('form'),el=f.elements.parent_message;const src=lessonAISource(Object.fromEntries(new FormData(f)));if(!src)throw new Error('수업 내용이나 메시지를 먼저 작성해주세요.');
        b.disabled=true;const result=await polish(src);f.querySelector('.ac-ai-result').innerHTML=`<label>AI 수정안<textarea name="ai_result">${h(result)}</textarea></label>${btn('학부모 메시지에 적용','apply-polish')}`;b.disabled=false;return;
      }
      if(a==='apply-polish'){const f=b.closest('form');f.elements.parent_message.value=f.elements.ai_result.value;return;}
      if(a==='ai-answer'){
        b.disabled=true;const {data,error}=await db.functions.invoke('academy-ai',{body:{questionId:id}});if(error||!data?.text)throw new Error(data?.error||'AI 응답을 받지 못했습니다.');
        const f=b.closest('form');f.elements.text.value=data.text;f.querySelector('.ac-ai-result').textContent='AI 초안입니다. 풀이를 확인하고 답변 보내기를 눌러주세요.';b.disabled=false;return;
      }
      const mutations=['task-next','task-back','attendance','clinic','claim','resolve','approve-event','ranking','rank-export'];
      if(mutations.includes(a)){
        busy=true;b.disabled=true;
        if(a.startsWith('task-')){const ss=['todo','doing','done'];await moveTask(i.id,ss[ss.indexOf(i.status)+(a==='task-next'?1:-1)]);}
        if(a==='attendance'){const [sid,st]=id.split(':');const old=rows('attendance').find(r=>r.student_id===sid&&r.day===day&&r.body.period===period);await save({...old,kind:'attendance',student_id:sid,day,status:st,body:{...old?.body,period}});}
        if(a==='clinic')await save({...i,body:{...i.body,clinic:true}});
        if(a==='claim')await save({...i,assignee_id:uid(),status:'answering'});
        if(a==='resolve')await save({...i,status:'resolved'});
        if(a==='approve-event')await save({...i,status:'approved'});
        if(a==='ranking'||a==='rank-export')await rank();
        if(a==='rank-export'){const csv='그룹,순위,학생,점수\n'+rankings.filter(r=>r.place<=5).map(r=>[r.school_group,r.place,r.display_name,r.total].map(v=>'"'+String(v).replace(/^[=+@-]/,"'").replaceAll('"','""')+'"').join(',')).join('\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`시상순위-${date()}.csv`;link.click();URL.revokeObjectURL(url);}
        if(a==='approve-event')panel=eventsPanel();else if(a==='claim'||a==='resolve')panel=threadPanel(items.find(x=>x.id===id));
        await load();
      }
      refresh();
      const f=document.querySelector('[data-ac-form="reflection"]');if(f){try{const local=JSON.parse(localStorage.getItem(draftKey('reflection'))||'null');if(local)for(const [k,v]of Object.entries(local))if(f.elements[k])f.elements[k].value=v;}catch{}}
    }catch(err){alert(err.message||String(err));b.disabled=false;}finally{busy=false;}
  }
  async function submit(e){
    const f=e.target.closest('[data-ac-form]');if(!f)return;e.preventDefault();e.stopImmediatePropagation();if(busy)return;
    const kind=f.dataset.acForm,id=f.dataset.id,old=items.find(x=>x.id===id),d=Object.fromEntries(new FormData(f)),intent=e.submitter?.value||'save',status=f.querySelector('.ac-form-status');
    busy=true;f.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='저장 중…';
    try{
      if(!ready)throw new Error('새 기능의 서버 연결 후 저장할 수 있습니다.');
      if(kind==='password'){if(d.password.length<6||d.password!==d.confirm)throw new Error('6자 이상 비밀번호와 확인값을 맞춰주세요.');const {error}=await db.auth.updateUser({password:d.password});if(error)throw error;const done=await db.rpc('complete_password_change');if(done.error)throw done.error;c().session.mustChangePassword=false;}
      if(kind==='task'){
        const titles=d.titles.split('\n').map(t=>t.trim()).filter(Boolean);if(!titles.length)throw new Error('할 일을 입력해주세요.');
        if(d.repeat!=='none'&&(!d.due||!d.repeat_end))throw new Error('반복 업무는 첫 마감일과 종료일을 지정해주세요.');
        const dates=[d.due||day];
        if(d.repeat!=='none'){
          const start=new Date(d.due+'T12:00:00'),end=new Date(d.repeat_end+'T12:00:00');if(end<start||end-start>366*86400000)throw new Error('반복 기간은 시작일부터 최대 1년입니다.');
          dates.length=0;for(let t=new Date(start);t<=end;t.setDate(t.getDate()+1)){
            const dt=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
            const closed=c().state.academicEvents.some(x=>['휴원','공휴일'].includes(x.type)&&x.startDate<=dt&&x.endDate>=dt);
            if(!closed&&(d.repeat==='daily'||d.repeat==='weekly'&&t.getDay()===start.getDay()||d.repeat==='monthly'&&t.getDate()===start.getDate()))dates.push(dt);
          }
        }
        const batch=requestId('task-batch');let done=0;
        for(const [idx,title]of titles.entries())for(const dt of dates){await save({id:requestId('task:'+idx+':'+dt),kind:'task',title,day:dt,assignee_id:d.assignee,audience:d.shared==='true'?'staff':'private',due_at:d.due?new Date(dt+'T23:59:00+09:00').toISOString():null,status:'todo',body:{priority:d.priority,project:d.project,repeat:d.repeat,template:batch+':'+idx}});done++;status.textContent=`${done}개 저장됨`;} 
      }
      if(kind==='assign')for(const sid of selected){await save({id:requestId('homework:'+sid),kind:'homework',student_id:sid,title:d.title,day,status:'assigned',due_at:d.due?new Date(d.due).toISOString():null,body:{description:d.description,extra:d.extra==='on'}});}
      if(kind==='homework'){
        const files=staff()?old.body.files:[...old.body.files||[],...await upload(f)];
        await save({...old,status:intent,body:{...old.body,files,feedback:staff()?d.feedback:old.body.feedback}});
      }
      if(kind==='reflection'){await save({...old,kind:'reflection',student_id:uid(),day:date(),title:'오늘 학습 리마인드',status:intent,body:d});localStorage.removeItem(draftKey('reflection'));}
      if(kind==='reflection-review')await save({...old,status:intent,body:{...old.body,feedback:d.feedback}});
      if(kind==='attitude'){const att=rows('attendance').find(i=>i.student_id===id&&i.day===day&&i.body.period===period);await save({...att,kind:'attendance',student_id:id,day,status:att?.status||'unmarked',body:{...att?.body,period,attitude:d.attitude,note:d.note}});}
      if(kind==='school-scores'){
        const edits=[...f.querySelectorAll('[data-school-score]')].filter(el=>el.value!==el.dataset.original);
        if(!edits.length)throw new Error('변경한 점수가 없습니다.');
        if(!d.exam_day)throw new Error('새 기록 시험일을 입력해주세요.');
        for(const el of edits){if(el.value===''||!Number.isFinite(Number(el.value))||Number(el.value)<0||Number(el.value)>Number(el.max))throw new Error('점수는 0점부터 만점 사이로 입력해주세요. 기존 점수를 빈칸으로 지울 수는 없습니다.');}
        for(const el of edits){
          const {grade:g,term,slot,record}=el.dataset;
          const old=items.find(r=>r.id===record);
          await save({...old,id:old?.id||requestId('school-score:'+f.dataset.student+':'+g+':'+term+':'+slot),kind:'assessment',student_id:f.dataset.student,day:old?.day||d.exam_day,title:old?.title||`${g} ${term}학기 ${slot}단원`,status:'recorded',body:{...old?.body,school_grade:g,term,unit_no:slot,category:'단원평가',score:Number(el.value),total:old?.body.total??100,first_attempt:old?.body.first_attempt??true}});
          el.dataset.original=el.value;
        }
      }
      if(kind==='assessment-batch'){
        if(!d.title.trim()||!d.day)throw new Error('평가명과 시험일을 입력해주세요.');
        const total=Number(d.total);
        if(!Number.isFinite(total)||total<=0)throw new Error('만점은 0보다 크게 입력해주세요.');
        const scores=[...f.querySelectorAll('[data-score-student]')].filter(el=>el.value.trim()!=='').map(el=>({id:el.dataset.scoreStudent,score:Number(el.value)}));
        if(!scores.length)throw new Error('학생 점수를 한 명 이상 입력해주세요.');
        if(scores.some(x=>!Number.isFinite(x.score)||x.score<0||x.score>total))throw new Error('점수는 0점부터 만점 사이로 입력해주세요.');
        let saved=0;
        for(const x of scores){
          const recordId=requestId('assessment:'+x.id);
          const existing=items.find(i=>i.id===recordId);
          await save({...existing,id:recordId,kind:'assessment',student_id:x.id,day:d.day,title:d.title.trim(),status:'recorded',body:{...existing?.body,category:'단원평가',unit:d.unit.trim(),school_grade:d.school_grade,term:d.term,unit_no:d.unit_no,score:x.score,total,first_attempt:d.first_attempt==='on'}});
          saved++;status.textContent=`${saved}/${scores.length}명 저장됨`;
        }
      }
      if(kind==='assessment'){if(!d.title.trim())throw new Error('평가명을 입력해주세요.');await save({...old,kind:'assessment',student_id:d.student_id,day:d.day,title:d.title,status:'recorded',body:{...old?.body,...d,category:old?.body.category||'단원평가',score:Number(d.score),total:Number(d.total),first_attempt:d.first_attempt==='on'}});}
      if(kind==='progress')await save({...old,kind:'progress',student_id:d.student_id,title:d.title,day,status:'active',body:d});
      if(kind==='makeup'){
        if(!admin())throw new Error('보충 등록은 관리자만 가능합니다.');
        const ids=[...new Set(new FormData(f).getAll('makeupStudent'))];
        if(!/^\d{4}-\d{2}-\d{2}$/.test(d.day)||!d.title.trim()||!d.start||!d.end||d.end<=d.start)throw new Error('날짜·수업명과 시작/종료 시간을 확인해주세요.');
        if(!ids.length||ids.some(id=>!allStudents().some(st=>st.id===id)))throw new Error('학생을 한 명 이상 선택해주세요.');
        const payload={title:d.title.trim(),start_date:d.day,end_date:d.day,type:'보충',visibility:'내부',note:JSON.stringify({version:1,start:d.start,end:d.end,studentIds:ids})};
        const query=db.from('academic_events');
        const result=id?await query.update(payload).eq('id',id).eq('type','보충').select('id'):await query.upsert({...payload,id:requestId('makeup')}).select('id');
        if(result.error)throw result.error;if(!result.data?.length)throw new Error('일정이 변경되었거나 저장 권한이 없습니다.');
        day=d.day;month=d.day.slice(0,7);
      }
      if(kind==='makeup-cancel'){
        if(!admin())throw new Error('관리자만 취소할 수 있습니다.');
        const result=await db.from('academic_events').update({type:'보충취소'}).eq('id',id).eq('type','보충').select('id');if(result.error)throw result.error;if(!result.data?.length)throw new Error('취소할 일정이 없습니다.');
      }
      if(kind==='school_event')await save({id:requestId('school_event'),kind:'school_event',student_id:d.student_id,title:d.title,day:d.day,status:'submitted',body:{...d,files:await upload(f)}});
      if(kind==='question')await save({id:requestId('question'),kind:'question',student_id:d.student_id,title:d.title,day,status:'open',audience:parent()?'parent':'student',body:{text:d.text,files:await upload(f)}});
      if(kind==='comment-reply'){
        if(!d.text.trim())throw new Error('답글을 입력해주세요.');
        await save({id:requestId('comment-reply:'+old.id),kind:'reply',student_id:old.student_id,title:'학부모 코멘트 답글',day:date(),status:'sent',audience:'parent',body:{thread:old.kind==='question'?old.id:old.body.thread,in_reply_to:old.id,text:d.text.trim()}});
      }
      if(kind==='reply'){
        if(!d.text.trim())throw new Error('내용을 입력해주세요.');await save({id:requestId('reply:'+old.id),kind:'reply',student_id:old.student_id,title:'답글',day,status:'sent',audience:d.audience,body:{thread:old.id,text:d.text,author_name:c().session.name}});
        if(staff()&&old.kind==='question')await save({...old,status:'answered',assignee_id:uid()});
      }
      if(kind==='handoff')await save({...old,assignee_id:d.assignee,status:'open'});
      if(kind==='reflection-batch'){
        if(!staff())throw new Error('직원만 작성할 수 있습니다.');
        const errors=[], completed=[];
        for(const rid of reflectionBatch){
          try {
            const r=visibleReflections().find(x=>x.id===rid&&x.status!=='draft');
            if(!r)throw new Error('수업기록을 찾을 수 없습니다.');
            const linked=rows('lesson_draft').find(x=>x.student_id===r.student_id&&x.body.reflection_id===rid);
            if(linked&&linked.status!=='draft')throw new Error('이미 게시한 일지는 개별 수정해주세요.');
            const attendance=rows('attendance').find(x=>x.student_id===r.student_id&&x.day===r.day&&x.body.period===r.body.period);
            const assessments=rows('assessment').filter(x=>x.student_id===r.student_id&&x.day===r.day).map(x=>`${x.title}: ${x.body.score}/${x.body.total} (${x.body.percent}%)`).join('\n');
            const body={...reflectionLessonBody(r.body),...linked?.body,reflection_id:r.id,reflection:r.body,period:r.body.period||'',attendance:attendance?.status||'',attitude:attendance?.body.attitude||'',assessments,keywords:d['keywords:'+rid]||'',parent_message:d['parent_message:'+rid]||''};
            if(intent==='ai-draft')body.parent_message=await polish(lessonAISource(body));
            await save({...linked,id:linked?.id||requestId('reflection-lesson:'+rid),kind:'lesson_draft',student_id:r.student_id,title:linked?.title||'오늘 수업',day:r.day,status:'draft',audience:'staff',body});
            completed.push(rid);reflectionSelection.delete(rid);
            status.textContent=`${completed.length}/${reflectionBatch.length}건 초안 저장 완료`;
          }catch(err){errors.push(`${name(items.find(x=>x.id===rid)?.student_id)}: ${err.message}`);}
        }
        reflectionBatch=reflectionBatch.filter(id=>!completed.includes(id));
        if(errors.length)throw new Error(`저장 ${completed.length}건 · 실패 ${errors.length}건. 다시 저장하면 실패한 항목만 처리합니다.\n${errors.join('\n')}`);
        alert(`${completed.length}건의 학생별 일지 초안을 저장했습니다. 학부모님께는 아직 게시되지 않았습니다.`);
      }
      if(kind==='lesson'){
        const ids=old?[old.student_id]:[...selected];if(!ids.length)throw new Error('학생을 선택해주세요.');
        const results=[];for(const sid of ids){
          try{
            const lessonDay=old?.day||day, lessonPeriod=old?.body.period||period;
            const reflection=findLessonReflection(items,sid,lessonDay,lessonPeriod,d.reflection_id||old?.body.reflection_id);
            const assessments=rows('assessment').filter(r=>r.student_id===sid&&r.day===lessonDay).map(r=>`${r.title}: ${r.body.score}/${r.body.total} (${r.body.percent}%)`).join('\n');
            const attendance=rows('attendance').find(a=>a.student_id===sid&&a.day===lessonDay&&a.body.period===lessonPeriod);
            const linked=old||rows('lesson_draft').find(x=>x.student_id===sid&&x.day===lessonDay&&x.status==='draft'&&(reflection?x.body.reflection_id===reflection.id:x.body.period===lessonPeriod));
            const body={...reflectionLessonBody(reflection?.body),...linked?.body,...(ids.length===1?d:Object.fromEntries(Object.entries(d).filter(([,v])=>String(v).trim()))),period:lessonPeriod,reflection_id:reflection?.id||null,reflection:reflection?.body||null,assessments,attendance:attendance?.status||'',attitude:attendance?.body.attitude||''};
            if(intent==='ai-publish')body.parent_message=await polish(lessonAISource(body));
            const saved=await save({...linked,id:linked?.id||requestId('lesson:'+sid+':'+lessonDay+':'+lessonPeriod),kind:'lesson_draft',student_id:sid,title:d.title,day:old?.day||day,status:'draft',audience:'staff',body});
            const plan=rows('class_plan').find(p=>p.student_id===sid&&p.day===saved.day&&p.body.period===lessonPeriod);
            await save({...plan,id:plan?.id||requestId('plan:'+sid),kind:'class_plan',student_id:sid,title:d.title,day:saved.day,status:'shared',body:{period:lessonPeriod,material:body.material,unit:body.unit,content:body.content,assignment:body.assignment}});
            if(d.material.trim()&&d.course.trim()){
              const progress=rows('progress').find(p=>p.student_id===sid&&p.title===d.material&&p.body.course===d.course);
              await save({...progress,id:progress?.id||requestId('progress:'+sid),kind:'progress',student_id:sid,title:d.material,day:saved.day,status:'active',body:{...progress?.body,course:d.course,track:d.track,unit:d.unit,stage:progress?.body.stage||'학습 중'}});
            }
            if(intent!=='draft'){const {error}=await db.rpc('academy_publish',{p_id:saved.id,p_expected:saved.updated_at});if(error)throw error;}
            results.push(`${name(sid)}: ${intent==='draft'?'저장':'게시'} 완료`);
          }catch(err){results.push(`${name(sid)}: 실패 — ${err.message}`);}
        }alert(results.join('\n'));if(results.some(t=>t.includes('실패')))throw new Error('실패한 학생을 확인해주세요. 저장된 초안은 유지됩니다.');
      }
      if(kind==='family'){
        const ids=[...f.elements.children.selectedOptions].map(o=>o.value);if(!ids.length&&!d.parentId)throw new Error('자녀를 선택해주세요.');
        const {data,error}=await db.functions.invoke('academy-family',{body:{parentId:d.parentId||undefined,name:d.name,loginId:d.loginId,password:d.password,studentIds:ids}});if(error||data?.error)throw new Error(data?.error||error.message);
      }
      if(kind==='task')delete taskDrafts[f.dataset.shared];
      panel='';batchIds.clear();await load();refresh();
    }catch(err){status.textContent=err.message||String(err);f.querySelectorAll('button').forEach(b=>b.disabled=false);}finally{busy=false;}
  }
  function clearTaskDrag(){
    draggingTask=null;
    document.querySelectorAll('.ac-task-dragging,.ac-task-drop-target').forEach(el=>el.classList.remove('ac-task-dragging','ac-task-drop-target'));
  }
  document.addEventListener('dragstart',e=>{
    const card=e.target.closest('[data-task-id]');if(!card)return;
    if(busy||!staff()||e.target.closest('button,input,select,textarea,a')){e.preventDefault();return;}
    draggingTask={id:card.dataset.taskId,board:card.closest('[data-task-board]')};
    e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',card.dataset.taskId);
    card.classList.add('ac-task-dragging');
  });
  document.addEventListener('dragover',e=>{
    const column=e.target.closest('[data-task-status]');
    if(!draggingTask||busy||!column||column.closest('[data-task-board]')!==draggingTask.board)return;
    e.preventDefault();e.dataTransfer.dropEffect='move';
    document.querySelectorAll('.ac-task-drop-target').forEach(el=>{if(el!==column)el.classList.remove('ac-task-drop-target');});
    column.classList.add('ac-task-drop-target');
  });
  document.addEventListener('dragleave',e=>{
    const column=e.target.closest('[data-task-status]');
    if(column&&!column.contains(e.relatedTarget))column.classList.remove('ac-task-drop-target');
  });
  document.addEventListener('drop',async e=>{
    const column=e.target.closest('[data-task-status]');
    if(!draggingTask||busy||!column||column.closest('[data-task-board]')!==draggingTask.board)return;
    e.preventDefault();const id=draggingTask.id,target=column.dataset.taskStatus;
    clearTaskDrag();busy=true;
    try{await moveTask(id,target);refresh();}catch(err){alert('업무 이동 실패: '+(err.message||String(err)));refresh();}finally{busy=false;}
  });
  document.addEventListener('dragend',clearTaskDrag);
  document.addEventListener('click',click,true);
  document.addEventListener('submit',submit,true);
  for(const event of ['input','change'])document.addEventListener(event,e=>{
    const makeup=e.target.closest('[data-ac-form="makeup"]');if(makeup)updateMakeupPicker(makeup);
    const f=e.target.closest('.ac-quick-task');if(f)taskDrafts[f.dataset.shared]=Object.fromEntries(new FormData(f));
  });
  document.addEventListener('keydown',e=>{
    if(e.target.matches('.ac-quick-task textarea')&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.target.form.requestSubmit();}
  });
  document.addEventListener('change',e=>{
    if(e.target.matches('[data-reflection-select]')){e.target.checked?reflectionSelection.add(e.target.dataset.reflectionSelect):reflectionSelection.delete(e.target.dataset.reflectionSelect);refresh();}
    if(e.target.matches('[data-comment-filter]')){commentFilter=e.target.value;refresh();}
    if(e.target.matches('[data-comment-search]')){commentSearch=e.target.value;refresh();}
    if(e.target.matches('[data-ac-select]')){e.target.checked?selected.add(e.target.dataset.acSelect):selected.delete(e.target.dataset.acSelect);refresh();}
    if(e.target.matches('[data-ac-date]')){day=e.target.value;selected.clear();load().then(refresh);}
    if(e.target.matches('[data-ac-student]')){student=e.target.value;refresh();}
    if(e.target.matches('[data-ac-rank]')){rankMonths=Number(e.target.value);rankStart='';rankEnd='';rank().then(refresh).catch(err=>alert(err.message));}
    if(e.target.matches('[data-ac-rank-start]'))rankStart=e.target.value;
    if(e.target.matches('[data-ac-rank-end]'))rankEnd=e.target.value;
  },true);
  document.addEventListener('input',e=>{
    const f=e.target.closest('[data-ac-form="reflection"]');if(!f)return;clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{localStorage.setItem(draftKey('reflection'),JSON.stringify(Object.fromEntries(new FormData(f))));f.querySelector('.ac-form-status').textContent='이 기기에 임시저장됨 · 제출 버튼을 눌러 선생님께 보내주세요.';}catch{f.querySelector('.ac-form-status').textContent='임시저장하지 못했습니다. 임시저장 버튼을 눌러주세요.';}},500);
  });
  // Refresh without interrupting forms or selecting students.
  const canAutoRefresh=()=>uid()&&document.visibilityState==='visible'&&!c().modalOpen&&!panel&&!busy&&!draggingTask&&!selected.size&&!reflectionSelection.size&&!document.activeElement?.closest('form')&&!document.querySelector('[data-ac-form="school-scores"]');
  setInterval(()=>{if(canAutoRefresh())load().then(()=>{if(canAutoRefresh())refresh();});},30000);
  return {render,load,reset(){clearTaskDrag();commentReviews=[];commentNotifications=[];commentsReady=false;addedGrades.clear();items=[];children=[];points=[];loadedFor='';panel='';selected.clear();reflectionSelection.clear();reflectionBatch=[];lessonSessions=[];sessionDay='';student='';period='';}};
}
