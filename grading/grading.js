// 독수리수학 자동채점 화면. 알림장과 같은 Supabase 로그인을 그대로 씁니다.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { VERDICT_LABEL, latestByStudentNo, rangeOptions, cropRect, fitScale, summarize, parseAnswerFile } from './grading-lib.js?v=1';

const SUPABASE_URL = 'https://yftnpfphrkmrrofbvphj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmdG5wZnBocmttcnJvZmJ2cGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTIwNzUsImV4cCI6MjA5NjY4ODA3NX0.sPx91LSD9z_OkfH0ebm-6T9DJ4quEhvCdvE7RO_U8s8';
// 알림장의 어느 입구(teacher/student/기본)에서 왔는지에 따라 같은 로그인 저장소를 씁니다.
const portal = ['teacher', 'student'].includes(new URLSearchParams(location.search).get('p')) ? new URLSearchParams(location.search).get('p') : '';
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, portal ? { auth: { storageKey: `eagle-${portal}-session` } } : {});
const backHref = portal ? `./${portal}/` : './';
const app = document.getElementById('app');
const STAFF = ['admin', 'deputy', 'teacher', 'assistant'];
const MAX_PHOTOS = 20;
const PHOTO_STATE = { ready: '대기', working: '채점 중', done: '완료', failed: '다시 찍기 필요' };
// Supabase Edge Function 주소(slug)
const GRADING_FUNCTION = 'grading-check';

const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = {
  me: null, tab: 'check', books: [], students: [],
  // 채점하기
  bookId: '', studentId: '', photos: [], status: '', statusError: false, busy: false, results: null, failures: [],
  // 내 기록
  myBookId: '', myRows: [],
  // 결과표
  mxBookId: '', mxRange: '', mxRows: [], mxMax: 0,
  // 확인 대기
  pending: [], keys: new Map(), urls: new Map(),
  detail: null,
};

const isStaff = () => STAFF.includes(state.me?.role);
const isAdmin = () => ['admin', 'deputy'].includes(state.me?.role);
const studentName = (id) => state.students.find((s) => s.id === id)?.name || '학생';

async function init() {
  const { data } = await db.auth.getSession();
  const user = data.session?.user;
  if (!user) return renderSignedOut();
  const { data: me } = await db.from('profiles').select('id, name, role, active').eq('id', user.id).single();
  if (!me?.active || !(STAFF.includes(me.role) || me.role === 'student')) return renderSignedOut('학생 또는 선생님 계정으로 이용할 수 있어요.');
  state.me = me;
  await loadBooks();
  if (isStaff()) {
    const { data: ch } = await db.rpc('academy_children');
    state.students = (ch || []).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
  }
  render();
}

async function loadBooks() {
  const { data } = await db.from('grading_books').select('id, title, active, rules').order('title');
  state.books = data || [];
  const active = state.books.filter((b) => b.active);
  if (!active.some((b) => b.id === state.bookId)) state.bookId = active[0]?.id || '';
  if (!state.myBookId) state.myBookId = state.bookId;
  if (!state.mxBookId) state.mxBookId = state.bookId;
}

function renderSignedOut(msg) {
  app.innerHTML = `<main class="main"><section class="panel stack" style="max-width:460px;margin:40px auto">
    <h2 style="margin:0">자동채점</h2>
    <p class="muted" style="margin:0">${h(msg || '알림장에서 먼저 로그인한 뒤, 상단의 "자동채점" 버튼을 눌러 주세요.')}</p>
    <a href="${backHref}"><button class="primary" type="button">알림장으로 가기</button></a></section></main>`;
}

// ---------------------------------------------------------------- 화면
function render() {
  const tabs = isStaff()
    ? [['check', '채점하기'], ['matrix', '결과표'], ['pending', `확인 대기${state.pending.length ? ' ' + state.pending.length : ''}`], ['keys', '정답지']]
    : [['check', '채점하기'], ['mine', '내 채점 기록']];
  app.innerHTML = `<div class="app-shell">
    <header class="topbar gr-top">
      <div class="brand"><img src="./logo.png" alt="독수리수학 로고" /><div class="brand-title"><strong>자동채점</strong><span>${h(state.me.name)} · ${isStaff() ? '선생님' : '학생'}</span></div></div>
      <a href="${backHref}"><button class="ghost" type="button">알림장으로</button></a>
    </header>
    <main class="main">
      <nav class="gr-tabs">${tabs.map(([k, l]) => `<button type="button" data-tab="${k}" class="${state.tab === k ? 'primary' : 'ghost'}">${h(l)}</button>`).join('')}</nav>
      ${({ check: viewCheck, mine: viewMine, matrix: viewMatrix, pending: viewPending, keys: viewKeys }[state.tab] || viewCheck)()}
    </main>
    ${state.detail ? viewDetail() : ''}
  </div>`;
}

function bookSelect(name, value, onlyActive = true) {
  const list = state.books.filter((b) => !onlyActive || b.active);
  if (!list.length) return `<p class="muted">등록된 교재가 없어요.${isAdmin() ? ' "정답지" 탭에서 정답지를 먼저 올려 주세요.' : ' 선생님께 말씀해 주세요.'}</p>`;
  return `<label>교재<select data-bind="${name}">${list.map((b) => `<option value="${b.id}" ${b.id === value ? 'selected' : ''}>${h(b.title)}</option>`).join('')}</select></label>`;
}

function tiles(list) {
  return `<div class="gr-tiles">${list.map((r) => `<div class="gr-tile ${r.verdict}">
    <div class="no">${r.no}번</div>
    <div class="mark ${r.verdict === 'pending' ? 'pending' : ''}">${VERDICT_LABEL[r.verdict]}</div>
    ${r.recognized && r.verdict !== 'O' ? `<div class="read">읽은 답: ${h(r.recognized)}</div>` : ''}
  </div>`).join('')}</div>`;
}

function summaryBadges(list) {
  const s = summarize(list);
  return `<div class="gr-summary"><span class="badge good">O ${s.O}</span><span class="badge bad">X ${s.X}</span>${s.pending ? `<span class="badge warn">확인 중 ${s.pending}</span>` : ''}</div>`;
}

function viewCheck() {
  return `<section class="panel gr-panel"><h2>페이지 사진으로 채점하기</h2>
    <div class="gr-form">
      ${bookSelect('bookId', state.bookId)}
      ${isStaff() ? `<label>학생<select data-bind="studentId"><option value="">학생 선택</option>${state.students.map((s) => `<option value="${s.id}" ${s.id === state.studentId ? 'selected' : ''}>${h(s.name)} ${h(s.school_year || '')}</option>`).join('')}</select></label>` : ''}
      <div class="gr-photo-row">
        <label class="gr-photo-btn">카메라로 찍기<span class="small">한 장 찍을 때마다 아래에 쌓여요</span><input type="file" accept="image/*" capture="environment" data-photo ${state.busy ? 'disabled' : ''} /></label>
        <label class="gr-photo-btn">앨범에서 여러 장 고르기<span class="small">찍어 둔 사진을 한꺼번에</span><input type="file" accept="image/*" multiple data-photo ${state.busy ? 'disabled' : ''} /></label>
      </div>
      ${state.photos.length ? `<div class="gr-thumbs">${state.photos.map((p, i) => `<figure class="gr-thumb ${p.state}">
        <img src="${p.url}" alt="${i + 1}번째 사진" /><figcaption>${i + 1}장 · ${h(PHOTO_STATE[p.state])}</figcaption>
        ${state.busy ? '' : `<button type="button" class="gr-remove" data-remove="${p.id}" aria-label="${i + 1}번째 사진 빼기">×</button>`}
      </figure>`).join('')}</div>` : ''}
      <p class="gr-tip">한 장에 한 페이지씩, 위에서 똑바로, 그림자 없이 찍어 주세요. 문제 번호가 잘리지 않게 해 주세요. (최대 ${MAX_PHOTOS}장)<br>답에 네모를 치지 않아도 되지만, 네모를 치면 더 정확하게 읽어요.</p>
      <button class="primary" type="button" data-action="grade" ${state.busy || !state.photos.length || !state.bookId || (isStaff() && !state.studentId) ? 'disabled' : ''}>${state.busy ? '채점하는 중...' : state.photos.length > 1 ? `사진 ${state.photos.length}장 채점하기` : '채점하기'}</button>
      <div class="gr-status ${state.statusError ? 'error' : ''}" role="status">${h(state.status)}</div>
    </div>
    ${state.failures.length ? `<div class="gr-failures"><p>빨간 테두리 사진은 채점하지 못했어요. 빼거나 다시 찍은 뒤 다시 채점해 주세요.</p>${[...new Set(state.failures)].map((f) => `<p>· ${h(f)}</p>`).join('')}</div>` : ''}
    ${state.results ? `<div style="margin-top:16px">${state.results.length ? summaryBadges(state.results) + tiles(state.results) + `<p class="gr-tip" style="margin-top:10px">X 문제는 다시 풀고 다시 찍으면 새로 채점돼요. "확인 중"은 선생님이 확인해 주실 거예요.</p>` : '<p class="muted">답을 쓴 문제를 찾지 못했어요. 답을 쓴 페이지인지 확인해 주세요.</p>'}</div>` : ''}
  </section>`;
}

function viewMine() {
  return `<section class="panel gr-panel"><h2>내 채점 기록</h2>
    <div class="gr-form">${bookSelect('myBookId', state.myBookId, false)}</div>
    ${state.myRows.length ? summaryBadges(state.myRows) + `<div class="gr-chips">${state.myRows.map((r) => `<span class="gr-chip ${r.verdict}" title="${r.attempt}번째 시도">${r.no} ${VERDICT_LABEL[r.verdict]}</span>`).join('')}</div>` : '<p class="muted">아직 채점한 문제가 없어요.</p>'}
  </section>`;
}

function viewMatrix() {
  const ranges = rangeOptions(state.mxMax || 0);
  const [a, b] = (state.mxRange || (ranges[0] ? ranges[0].join('-') : '1-50')).split('-').map(Number);
  const latest = latestByStudentNo(state.mxRows);
  const ids = [...new Set(state.mxRows.map((r) => r.student_id))].sort((x, y) => studentName(x).localeCompare(studentName(y), 'ko'));
  const nos = [];
  for (let n = a; n <= b; n++) nos.push(n);
  const body = ids.map((id) => {
    const cells = nos.map((n) => latest.get(id + ':' + n));
    const s = summarize(cells.filter(Boolean));
    const rate = s.O + s.X ? Math.round(s.O / (s.O + s.X) * 100) + '%' : '-';
    return `<tr><th class="name">${h(studentName(id))}</th>${cells.map((c) => `<td>${c ? `<button type="button" class="${c.verdict}" data-detail="${c.id}" title="${c.no}번 ${c.attempt}번째 시도">${c.verdict === 'pending' ? '?' : c.verdict}</button>` : ''}</td>`).join('')}<td class="rate">${rate}</td></tr>`;
  }).join('');
  return `<section class="panel gr-panel"><h2>학생별 문항 결과표</h2>
    <div class="row" style="margin-bottom:12px">
      <div style="min-width:220px">${bookSelect('mxBookId', state.mxBookId, false)}</div>
      ${ranges.length ? `<label>문항 범위<select data-bind="mxRange">${ranges.map(([x, y]) => `<option value="${x}-${y}" ${`${x}-${y}` === `${a}-${b}` ? 'selected' : ''}>${x}~${y}번</option>`).join('')}</select></label>` : ''}
    </div>
    <p class="gr-tip" style="margin-bottom:8px">각 칸은 가장 최근 시도 결과예요. 칸을 누르면 학생이 쓴 답 사진을 보고 O/X를 고칠 수 있어요.</p>
    ${ids.length ? `<div class="gr-matrix-wrap"><table class="gr-matrix"><thead><tr><th class="name">학생</th>${nos.map((n) => `<th>${n}</th>`).join('')}<th>정답률</th></tr></thead><tbody>${body}</tbody></table></div>` : '<p class="muted">이 범위에 채점 결과가 없어요.</p>'}
  </section>`;
}

function resultCard(r, withClose = false) {
  const key = state.keys.get(r.book_id + ':' + r.no);
  const url = state.urls.get(r.crop_path);
  return `<div class="gr-card">
    <div class="between"><strong>${h(studentName(r.student_id))} · ${r.no}번</strong><span class="badge ${r.verdict === 'O' ? 'good' : r.verdict === 'X' ? 'bad' : 'warn'}">${VERDICT_LABEL[r.verdict]}</span></div>
    ${url ? `<img src="${url}" alt="${r.no}번 학생 답" />` : '<p class="muted small">문항 사진 없음</p>'}
    <dl><dt>정답</dt><dd>${h(key?.answer || '-')}</dd><dt>읽은 답</dt><dd>${h(r.recognized || '-')}</dd>
      <dt>판독 1</dt><dd>${h(r.read_a || '-')}</dd><dt>판독 2</dt><dd>${h(r.read_b || '-')}</dd>
      ${r.note ? `<dt>사유</dt><dd>${h(r.note)}</dd>` : ''}<dt>시도</dt><dd>${r.attempt}번째${r.confirmed_at ? ' · 선생님 확정' : ''}</dd></dl>
    <div class="row"><button type="button" class="${r.verdict === 'O' ? 'selected' : ''}" data-confirm="${r.id}" data-v="O">O로 확정</button><button type="button" class="${r.verdict === 'X' ? 'selected' : ''}" data-confirm="${r.id}" data-v="X">X로 확정</button></div>
    ${withClose ? '<button type="button" class="ghost" data-action="close">닫기</button>' : ''}
  </div>`;
}

function viewPending() {
  return `<section class="panel gr-panel"><h2>확인 대기 (${state.pending.length})</h2>
    <p class="gr-tip" style="margin-bottom:10px">AI 두 번의 판독이 서로 다르거나 글씨가 흐린 문항이에요. 학생 화면에는 "확인 중"으로 보입니다.</p>
    ${state.pending.length ? `<div class="gr-cards">${state.pending.map((r) => resultCard(r)).join('')}</div>` : '<p class="muted">확인할 문항이 없어요.</p>'}
  </section>`;
}

function viewDetail() {
  const r = state.detail;
  return `<div class="gr-modal" data-action="close-backdrop">${resultCard(r, true)}</div>`;
}

function viewKeys() {
  return `<section class="panel gr-panel"><h2>정답지</h2>
    ${isAdmin() ? `<div class="gr-form" style="margin-bottom:16px">
      <label>교재 이름<input data-bind-input="keyTitle" value="${h(state.keyTitle || '')}" placeholder="예: 독수리유형 - 초등수학3-2" /></label>
      <label class="gr-photo-btn">${state.keyFileName ? h(state.keyFileName) : '정답 JSON 파일 고르기'}<input type="file" accept=".json,application/json" data-keyfile /></label>
      <button class="blue" type="button" data-action="import" ${state.keyAnswers && !state.busy ? '' : 'disabled'}>정답지 올리기${state.keyAnswers ? ` (${state.keyAnswers.length}문항)` : ''}</button>
      <p class="gr-tip">같은 이름의 교재가 있으면 정답 전체가 새 파일로 바뀌어요. 이미 채점한 결과는 그대로 남아요.</p>
      <div class="gr-status ${state.statusError ? 'error' : ''}">${h(state.keyStatus || '')}</div>
    </div>` : '<p class="muted">정답지는 원장·부원장만 올릴 수 있어요.</p>'}
    <div class="gr-books">${state.books.map((b) => `<div class="gr-book">
      <div class="between"><strong>${h(b.title)}</strong><span class="badge ${b.active ? 'good' : ''}">${b.active ? '사용 중' : '숨김'}</span></div>
      ${isAdmin() ? `<label class="check"><input type="checkbox" data-rule="unit_optional" data-book="${b.id}" ${b.rules?.unit_optional !== false ? 'checked' : ''} /> 단위를 빠뜨려도 정답 (예: 20권 → 20)</label>
      <label class="check"><input type="checkbox" data-rule="fraction_equivalent" data-book="${b.id}" ${b.rules?.fraction_equivalent ? 'checked' : ''} /> 크기가 같은 분수도 정답 (예: 14/7 → 2)</label>
      <div class="row"><button type="button" data-toggle-book="${b.id}">${b.active ? '학생 화면에서 숨기기' : '다시 사용하기'}</button></div>` : ''}
    </div>`).join('') || '<p class="muted">아직 교재가 없어요.</p>'}</div>
  </section>`;
}

// ---------------------------------------------------------------- 데이터
async function loadMine() {
  if (!state.myBookId) { state.myRows = []; return; }
  const { data, error } = await db.rpc('grading_my_results', { p_book: state.myBookId });
  if (error) throw error;
  state.myRows = data || [];
}

async function loadMatrix() {
  if (!state.mxBookId) { state.mxRows = []; return; }
  const { data: maxRow } = await db.from('grading_keys').select('no').eq('book_id', state.mxBookId).order('no', { ascending: false }).limit(1);
  state.mxMax = maxRow?.[0]?.no || 0;
  const ranges = rangeOptions(state.mxMax);
  if (!ranges.some(([x, y]) => `${x}-${y}` === state.mxRange)) state.mxRange = ranges[0] ? ranges[0].join('-') : '';
  if (!state.mxRange) { state.mxRows = []; return; }
  const [a, b] = state.mxRange.split('-').map(Number);
  const { data, error } = await db.from('grading_results').select('*').eq('book_id', state.mxBookId).gte('no', a).lte('no', b).limit(5000);
  if (error) throw error;
  state.mxRows = data || [];
}

async function loadPending() {
  const { data, error } = await db.from('grading_results').select('*').eq('verdict', 'pending').order('created_at').limit(100);
  if (error) throw error;
  state.pending = data || [];
  await hydrate(state.pending);
}

// 직원 화면용: 정답과 문항 사진 주소 채우기
async function hydrate(rows) {
  const need = rows.filter((r) => !state.keys.has(r.book_id + ':' + r.no));
  for (const bookId of new Set(need.map((r) => r.book_id))) {
    const nos = need.filter((r) => r.book_id === bookId).map((r) => r.no);
    const { data } = await db.from('grading_keys').select('book_id, no, answer').eq('book_id', bookId).in('no', nos);
    for (const k of data || []) state.keys.set(k.book_id + ':' + k.no, k);
  }
  const paths = [...new Set(rows.map((r) => r.crop_path).filter((p) => p && !state.urls.has(p)))];
  if (paths.length) {
    const { data } = await db.storage.from('academy-private').createSignedUrls(paths, 3600);
    for (const s of data || []) if (s.signedUrl) state.urls.set(s.path, s.signedUrl);
  }
}

// ---------------------------------------------------------------- 사진 처리
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('사진을 열 수 없어요. 다른 사진으로 시도해 주세요.'));
    img.src = URL.createObjectURL(file);
  });
}
function toCanvas(img, sx, sy, sw, sh, maxSide) {
  const k = fitScale(sw, sh, maxSide);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}
const toBlob = (c) => new Promise((res) => c.toBlob(res, 'image/jpeg', 0.86));

async function invoke(body) {
  const { data, error } = await db.functions.invoke(GRADING_FUNCTION, { body });
  if (data?.error) throw new Error(data.error);
  if (error) {
    let msg = '';
    try { msg = (await error.context?.json())?.error || ''; } catch { /* 응답 본문 없음 */ }
    throw new Error(msg || '채점 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return data;
}

// 사진 한 장 채점: 올리기 → 문제 번호 찾기 → 문제별로 잘라 판독
async function gradeOne(photo, say) {
  const img = await loadImage(photo.file);
  const W = img.naturalWidth, H = img.naturalHeight;
  const page = await toBlob(toCanvas(img, 0, 0, W, H, 2000));
  const path = `${state.me.id}/grading/${crypto.randomUUID()}.jpg`;
  say('사진 올리는 중');
  const up = await db.storage.from('academy-private').upload(path, page, { contentType: 'image/jpeg' });
  if (up.error) throw new Error('사진을 올리지 못했어요: ' + up.error.message);
  say('문제 번호 찾는 중');
  const located = await invoke({ action: 'locate', bookId: state.bookId, photoPath: path, studentId: isStaff() ? state.studentId : undefined });
  say(`${located.problems.length}문제의 답을 읽는 중 (30초~1분)`);
  const crops = located.problems.map((p) => {
    const r = cropRect(p.box, W, H);
    return { no: p.no, data: toCanvas(img, r.x, r.y, r.w, r.h, 1100).toDataURL('image/jpeg', 0.86).split(',')[1] };
  });
  const graded = await invoke({ action: 'grade', submissionId: located.submissionId, crops });
  return graded.results;
}

// 모아 둔 사진을 한 장씩 차례로 채점. 한 장이 실패해도 나머지는 계속합니다.
async function grade() {
  if (state.busy) return;
  state.busy = true; state.results = null; state.failures = []; state.statusError = false;
  const merged = new Map();
  const queue = state.photos.filter((p) => p.state !== 'done');
  try {
    for (let i = 0; i < queue.length; i++) {
      const photo = queue[i], label = `${state.photos.indexOf(photo) + 1}장`;
      photo.state = 'working';
      const say = (t) => { state.status = `${queue.length > 1 ? `${i + 1}/${queue.length} · ` : ''}${label}: ${t}...`; render(); };
      try {
        for (const r of await gradeOne(photo, say)) merged.set(r.no, r);
        photo.state = 'done';
      } catch (e) {
        photo.state = 'failed';
        state.failures.push(e.message || String(e));
      }
      state.results = [...merged.values()].sort((x, y) => x.no - y.no);
      render();
    }
    const ok = queue.filter((p) => p.state === 'done').length;
    state.status = state.failures.length ? `${ok}장 채점 완료, ${state.failures.length}장은 다시 찍어 주세요.` : '채점 완료!';
    state.statusError = state.failures.length > 0 && ok === 0;
    // 다 끝난 사진은 목록에서 빼고, 실패한 사진만 남겨 다시 시도할 수 있게 합니다.
    for (const p of state.photos.filter((x) => x.state === 'done')) URL.revokeObjectURL(p.url);
    state.photos = state.photos.filter((p) => p.state !== 'done');
  } finally {
    state.busy = false; render();
  }
}

// ---------------------------------------------------------------- 이벤트
async function switchTab(tab) {
  state.tab = tab; state.status = ''; state.statusError = false;
  render();
  try {
    if (tab === 'mine') await loadMine();
    if (tab === 'matrix') await loadMatrix();
    if (tab === 'pending') await loadPending();
    if (tab === 'keys') await loadBooks();
  } catch (e) { alertInline(e); }
  render();
}

function alertInline(e) { state.status = e.message || String(e); state.statusError = true; }

app.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button, [data-action="close-backdrop"]');
  if (!t) return;
  if (t.dataset.action === 'close-backdrop' && ev.target !== t) return;
  try {
    if (t.dataset.tab) return switchTab(t.dataset.tab);
    if (t.dataset.remove) {
      const p = state.photos.find((x) => x.id === t.dataset.remove);
      if (p) URL.revokeObjectURL(p.url);
      state.photos = state.photos.filter((x) => x.id !== t.dataset.remove);
      return render();
    }
    if (t.dataset.action === 'grade') return grade();
    if (t.dataset.action === 'close' || t.dataset.action === 'close-backdrop') { state.detail = null; return render(); }
    if (t.dataset.detail) {
      const r = state.mxRows.find((x) => x.id === t.dataset.detail);
      await hydrate([r]); state.detail = r; return render();
    }
    if (t.dataset.confirm) {
      t.disabled = true;
      const { error } = await db.rpc('grading_confirm', { p_result: t.dataset.confirm, p_verdict: t.dataset.v });
      if (error) throw error;
      const apply = (list) => list.forEach((x) => { if (x.id === t.dataset.confirm) { x.verdict = t.dataset.v; x.confirmed_at = new Date().toISOString(); } });
      apply(state.mxRows); apply(state.pending);
      state.pending = state.pending.filter((x) => x.verdict === 'pending');
      if (state.detail?.id === t.dataset.confirm) state.detail = null;
      return render();
    }
    if (t.dataset.action === 'import') {
      state.busy = true; state.keyStatus = '올리는 중...'; render();
      const { error } = await db.rpc('grading_import_key', { p_title: state.keyTitle, p_answers: state.keyAnswers });
      state.busy = false;
      if (error) throw error;
      state.keyStatus = `"${state.keyTitle}" 정답 ${state.keyAnswers.length}문항을 올렸어요.`;
      state.keyAnswers = null; state.keyFileName = '';
      await loadBooks(); return render();
    }
    if (t.dataset.toggleBook) {
      const b = state.books.find((x) => x.id === t.dataset.toggleBook);
      const { error } = await db.from('grading_books').update({ active: !b.active, updated_at: new Date().toISOString() }).eq('id', b.id);
      if (error) throw error;
      await loadBooks(); return render();
    }
  } catch (e) {
    state.busy = false;
    if (state.tab === 'keys') { state.keyStatus = e.message || String(e); state.statusError = true; } else alertInline(e);
    render();
  }
});

app.addEventListener('change', async (ev) => {
  const t = ev.target;
  try {
    if (t.dataset.photo !== undefined && t.files?.length) {
      const room = MAX_PHOTOS - state.photos.length;
      const picked = [...t.files].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
      for (const file of picked.slice(0, Math.max(0, room))) state.photos.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), state: 'ready' });
      state.results = null; state.failures = []; state.statusError = false;
      state.status = picked.length > room ? `사진은 한 번에 ${MAX_PHOTOS}장까지 채점할 수 있어요.` : '';
      return render();
    }
    if (t.dataset.keyfile !== undefined && t.files?.[0]) {
      state.statusError = false;
      try {
        const parsed = parseAnswerFile(await t.files[0].text());
        state.keyAnswers = parsed.answers; state.keyFileName = t.files[0].name;
        if (!state.keyTitle) state.keyTitle = parsed.title;
        state.keyStatus = `${parsed.answers.length}문항을 확인했어요.`;
      } catch (e) { state.keyAnswers = null; state.keyStatus = '파일을 읽을 수 없어요: ' + e.message; state.statusError = true; }
      return render();
    }
    if (t.dataset.rule) {
      const b = state.books.find((x) => x.id === t.dataset.book);
      const rules = { ...(b.rules || {}), [t.dataset.rule]: t.checked };
      const { error } = await db.from('grading_books').update({ rules, updated_at: new Date().toISOString() }).eq('id', b.id);
      if (error) throw error;
      b.rules = rules; return;
    }
    if (t.dataset.bind) {
      state[t.dataset.bind] = t.value;
      if (t.dataset.bind === 'myBookId') await loadMine();
      if (t.dataset.bind === 'mxBookId') { state.mxRange = ''; await loadMatrix(); }
      if (t.dataset.bind === 'mxRange') await loadMatrix();
      return render();
    }
  } catch (e) { alertInline(e); render(); }
});

app.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.bindInput) state[t.dataset.bindInput] = t.value;
});

init().then(async () => {
  if (isStaff()) { try { await loadPending(); render(); } catch { /* 확인 대기 수는 탭에서 다시 불러옴 */ } }
}).catch((e) => { app.innerHTML = `<main class="main"><p class="error">${h(e.message || e)}</p></main>`; });
