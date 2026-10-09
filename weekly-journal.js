const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function weekDates(value) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('주차를 선택해주세요.');
  const d=new Date(value+'T12:00:00Z');if(Number.isNaN(+d)||d.toISOString().slice(0,10)!==value)throw Error('날짜를 확인해주세요.');
  d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
  return Array.from({length:7},(_,i)=>{const t=new Date(d);t.setUTCDate(d.getUTCDate()+i);return t.toISOString().slice(0,10);});
}
function timeInfo(raw,periods) {
  const p=periods.find(p=>p.name===raw);
  if(p?.startTime)return {label:p.startTime+'~'+p.endTime,sort:p.startTime};
  const times=String(raw).match(/\d{1,2}:\d{2}|\d{4}/g)||[];
  const norm=s=>s.includes(':')?s.padStart(5,'0'):s.slice(0,2)+':'+s.slice(2);
  return times.length>=2?{label:times.slice(0,2).map(norm).join('~'),sort:norm(times[0])}:{label:raw,sort:'99:'+raw};
}
export function journalPages({days,sessionsByDay,teacherId,students,periods=[]}) {
  const map=new Map(students.filter(s=>s.active!==false&&s.status!=='삭제').map(s=>[s.id,s]));
  const pages=[];
  for(const day of days){
    const seen=new Set();const rows=[];
    for(const s of sessionsByDay[day]||[]){
      if(!(s.teacher_ids||[]).includes(teacherId))continue;
      const st=map.get(s.student_id);if(!st)throw Error(day+' 학생 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
      const key=[s.student_id,s.period,s.lesson_type].join('|');if(seen.has(key))continue;seen.add(key);
      rows.push({id:st.id,name:st.name,grade:st.schoolYear||'',period:s.period,type:s.lesson_type||'정규',...timeInfo(s.period,periods)});
    }
    rows.sort((a,b)=>a.sort.localeCompare(b.sort)||a.period.localeCompare(b.period,'ko')||a.name.localeCompare(b.name,'ko'));
    if(rows.length>30)throw Error(day+' 수업 명단이 '+rows.length+'건입니다. 하루 최대 30건(2장)을 초과해 출력하지 않았습니다. 시간표를 확인해주세요.');
    for(let i=0;i<rows.length;i+=15)pages.push({day,rows:rows.slice(i,i+15)});
  }
  return pages;
}
export function journalHTML(pages,teacherName,logoURL) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>하루 수업일지</title><style>
  @font-face{font-family:Journal;src:url('${new URL('./print/fonts/NanumGothic-Regular.ttf',import.meta.url).href}')}*{box-sizing:border-box}body{margin:0;background:#e8edf2;color:#172c3c;font-family:Journal,sans-serif}.sheet{width:210mm;height:297mm;padding:8mm 10mm;background:white;margin:12px auto;break-after:page;overflow:hidden}.sheet:last-child{break-after:auto}.head{height:22mm;border-top:1.5mm solid #193c60;display:flex;align-items:center;justify-content:space-between;gap:3mm}.head img{width:36mm;height:auto}.head b{font-size:12pt;white-space:nowrap}.head span{font-size:9pt}.teacher{max-width:40mm;overflow-wrap:anywhere}table{border-collapse:collapse;table-layout:fixed;width:190mm}th,td{border:.2mm solid #8796a2}th{height:8mm;font-weight:normal;background:#edf2f6;font-size:8pt}td{height:16mm;padding:1mm;font-size:9pt}td.info{text-align:center;overflow-wrap:anywhere}.info small{display:block;font-size:7pt;margin-bottom:1mm}.time{font-size:7pt;text-align:center;overflow-wrap:anywhere}.time small{display:block;margin-top:1mm}.writing{background:linear-gradient(to bottom,transparent calc(50% - .1mm),#d8dee4 50%,transparent calc(50% + .1mm))}footer{height:7mm;padding-top:2mm;border-bottom:.4mm solid #193c60;font-size:7pt;white-space:nowrap}@page{size:A4 portrait;margin:0}@media print{body{background:white}.sheet{margin:0;box-shadow:none}th{print-color-adjust:exact}}
  </style></head><body>${pages.map(p=>`<section class="sheet"><header class="head"><img src="${h(logoURL)}" alt="독수리수학"><b>하루 수업일지</b><span>${h(p.day)} (${'일월화수목금토'[new Date(p.day+'T12:00:00Z').getUTCDay()]})</span><span class="teacher">담당 ${h(teacherName)}</span></header><table><colgroup><col style="width:25mm"><col style="width:26mm"><col style="width:59mm"><col style="width:40mm"><col style="width:40mm"></colgroup><thead><tr><th>수업시간</th><th>학년 / 이름</th><th>교재·진도 / 배운 내용</th><th>오늘의 과제</th><th>관찰 메모 / 테스트</th></tr></thead><tbody>${Array.from({length:15},(_,i)=>{const r=p.rows[i];return `<tr><td class="time">${r?h(r.label):''}${r&&r.type!=='정규'?`<small>${h(r.type)}</small>`:''}</td><td class="info">${r?`<small>${h(r.grade)}</small>${h(r.name)}`:''}</td><td class="writing"></td><td class="writing"></td><td class="writing"></td></tr>`;}).join('')}</tbody></table><footer>학생별 두 줄 작성 · 단원평가: 학기·단원·점수 작성 · 촬영 시 네 모서리 포함</footer></section>`).join('')}</body></html>`;
}
export function openWeeklyJournal({db,state,session,defaultDay}) {
  if(!['admin','deputy','teacher','assistant'].includes(session?.role))return;
  const admin=['admin','deputy'].includes(session.role);
  const teachers=state.teachers.filter(t=>t.active!==false&&(admin||t.id===session.id));
  if(!teachers.length){alert('출력할 담당 강사 정보가 없습니다.');return;}
  const el=document.createElement('div');el.className='ac-overlay';el.innerHTML=`<section class="ac-dialog" role="dialog" aria-modal="true" aria-label="주간 종이일지 출력" style="width:min(980px,96vw);max-width:980px"><div class="between"><h2>주간 종이일지 출력</h2><button type="button" data-j-close>닫기</button></div><form data-weekly-journal><div class="toolbar"><label>담당 강사 <select name="teacher">${teachers.map(t=>`<option value="${h(t.id)}" ${t.id===session.id?'selected':''}>${h(t.name)}</option>`).join('')}</select></label><label>해당 주 날짜 <input name="week" type="date" value="${h(defaultDay)}" required></label></div><p data-week-range></p><div class="toolbar">${['월','화','수','목','금','토','일'].map((d,i)=>`<label><input type="checkbox" name="weekday" value="${i}" checked> ${d}</label>`).join('')}</div><p class="muted small">등록된 정규·보충 시간표 기준 · 수업 없는 날 제외 · 하루 15명씩 최대 2장<br>보충 담당자는 현재 시간표의 담당 강사 기준입니다. 출력 전에 명단을 확인해주세요.</p><div class="toolbar"><button type="submit" class="primary">명단 미리보기</button><button type="button" data-j-print disabled>인쇄 / PDF 저장</button></div><p data-j-status role="status"></p></form><iframe title="수업일지 인쇄 미리보기" hidden style="width:100%;height:55vh;border:1px solid #ccd4dc"></iframe></section>`;
  document.body.append(el);const form=el.querySelector('form'),frame=el.querySelector('iframe'),status=el.querySelector('[data-j-status]'),print=el.querySelector('[data-j-print]');
  let version=0;
  const range=()=>{try{const ds=weekDates(form.elements.week.value);el.querySelector('[data-week-range]').textContent=ds[0]+' ~ '+ds[6];}catch{el.querySelector('[data-week-range]').textContent='날짜를 선택해주세요.';}};range();
  el.querySelector('[data-j-close]').onclick=()=>{version++;el.remove();};
  form.onchange=()=>{version++;print.disabled=true;frame.hidden=true;status.textContent='조건이 변경되었습니다. 명단 미리보기를 눌러주세요.';range();};
  print.onclick=()=>{frame.contentWindow.focus();frame.contentWindow.print();};
  form.onsubmit=async e=>{
    e.preventDefault();e.stopPropagation();const request=++version;const submit=form.querySelector('[type="submit"]');submit.disabled=true;print.disabled=true;frame.hidden=true;status.textContent='시간표를 불러오는 중…';
    try{
      const teacherId=form.elements.teacher.value;if(!teachers.some(t=>t.id===teacherId))throw Error('담당 강사를 확인해주세요.');
      const chosen=new Set([...form.querySelectorAll('[name="weekday"]:checked')].map(x=>Number(x.value)));
      const days=weekDates(form.elements.week.value).filter((_,i)=>chosen.has(i));if(!days.length)throw Error('출력할 요일을 선택해주세요.');
      const results=await Promise.all(days.map(async day=>{const r=await db.rpc('academy_lesson_sessions',{p_day:day});if(r.error)throw Error(day+' 시간표를 불러오지 못했습니다. 다시 시도해주세요.');return [day,r.data||[]];}));
      if(request!==version||!el.isConnected)return;
      const pages=journalPages({days,sessionsByDay:Object.fromEntries(results),teacherId,students:state.students,periods:state.periods});if(!pages.length)throw Error('선택한 강사·요일에 등록된 수업이 없습니다.');
      frame.onload=async()=>{await frame.contentDocument.fonts.ready;await Promise.all([...frame.contentDocument.images].map(img=>img.decode().catch(()=>{})));if(request===version&&el.isConnected)print.disabled=false;};
      frame.srcdoc=journalHTML(pages,teachers.find(t=>t.id===teacherId).name,new URL('./logo.png',import.meta.url).href);frame.hidden=false;
      status.textContent=`${new Set(pages.map(p=>p.day)).size}일 · 수업 명단 ${pages.reduce((n,p)=>n+p.rows.length,0)}건 · ${pages.length}장. 인쇄창에서 용지 A4, 배율 100%, 머리글·바닥글 끄기를 선택해주세요.`;
    }catch(err){if(request===version)status.textContent=err.message||'미리보기 생성에 실패했습니다.';}finally{submit.disabled=false;}
  };
}
