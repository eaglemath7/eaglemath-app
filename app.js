const STORAGE_KEY = "eagleMathApp.v1";
const SUPABASE_URL = "https://yftnpfphrkmrrofbvphj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmdG5wZnBocmttcnJvZmJ2cGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTIwNzUsImV4cCI6MjA5NjY4ODA3NX0.sPx91LSD9z_OkfH0ebm-6T9DJ4quEhvCdvE7RO_U8s8";
const SUPABASE_STATE_ID = "main";
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const DEFAULT_PERIODS = ["1교시", "2교시", "3교시", "4교시", "5교시", "6교시"];
const ATTENDANCE = ["정시출석", "지각", "결석"];
const HOMEWORK = ["완벽", "잘함", "보통", "부족", "미완료"];
const FOCUS_LEVELS = ["매우 좋음", "좋음", "보통", "도움 필요"];
const LESSON_TYPES = ["정규", "보충", "특강", "개별지도"];
const DEFAULT_MATERIALS = ["디딤돌기본", "디딤돌응용", "쎈", "쎈B", "숨마쿰라우테", "개념원리", "백발백중", "일품수학", "블랙라벨", "학습지"];
const DEFAULT_UNITS = [
  "초1-1 9까지의 수", "초1-1 여러 가지 모양", "초1-1 덧셈과 뺄셈", "초1-1 비교하기", "초1-1 50까지의 수",
  "초1-2 100까지의 수", "초1-2 덧셈과 뺄셈", "초1-2 여러 가지 모양", "초1-2 시계 보기와 규칙 찾기", "초1-2 덧셈과 뺄셈 활용",
  "초2-1 세 자리 수", "초2-1 여러 가지 도형", "초2-1 덧셈과 뺄셈", "초2-1 길이 재기", "초2-1 분류하기", "초2-1 곱셈",
  "초2-2 네 자리 수", "초2-2 곱셈구구", "초2-2 길이 재기", "초2-2 시각과 시간", "초2-2 표와 그래프", "초2-2 규칙 찾기",
  "초3-1 덧셈과 뺄셈", "초3-1 평면도형", "초3-1 나눗셈", "초3-1 곱셈", "초3-1 길이와 시간", "초3-1 분수와 소수",
  "초3-2 곱셈", "초3-2 나눗셈", "초3-2 원", "초3-2 분수", "초3-2 들이와 무게", "초3-2 자료의 정리",
  "초4-1 큰 수", "초4-1 각도", "초4-1 곱셈과 나눗셈", "초4-1 평면도형의 이동", "초4-1 막대그래프", "초4-1 규칙 찾기",
  "초4-2 분수의 덧셈과 뺄셈", "초4-2 삼각형", "초4-2 소수의 덧셈과 뺄셈", "초4-2 사각형", "초4-2 꺾은선그래프", "초4-2 다각형",
  "초5-1 자연수의 혼합 계산", "초5-1 약수와 배수", "초5-1 규칙과 대응", "초5-1 약분과 통분", "초5-1 분수의 덧셈과 뺄셈", "초5-1 다각형의 둘레와 넓이",
  "초5-2 수의 범위와 어림하기", "초5-2 분수의 곱셈", "초5-2 합동과 대칭", "초5-2 소수의 곱셈", "초5-2 직육면체", "초5-2 평균과 가능성",
  "초6-1 분수의 나눗셈", "초6-1 각기둥과 각뿔", "초6-1 소수의 나눗셈", "초6-1 비와 비율", "초6-1 여러 가지 그래프", "초6-1 직육면체의 부피와 겉넓이",
  "초6-2 분수와 소수의 혼합 계산", "초6-2 원의 넓이", "초6-2 비례식과 비례배분", "초6-2 원기둥 원뿔 구", "초6-2 경우의 수",
  "중1 수와 연산", "중1 문자와 식", "중1 좌표평면과 그래프", "중1 기본 도형", "중1 평면도형", "중1 입체도형", "중1 자료의 정리와 해석",
  "중2 유리수와 순환소수", "중2 식의 계산", "중2 일차부등식과 연립일차방정식", "중2 일차함수", "중2 도형의 성질", "중2 도형의 닮음", "중2 확률",
  "중3 실수와 그 계산", "중3 다항식의 곱셈과 인수분해", "중3 이차방정식", "중3 이차함수", "중3 삼각비", "중3 원의 성질", "중3 통계",
  "고1 공통수학1 다항식", "고1 공통수학1 방정식과 부등식", "고1 공통수학1 경우의 수", "고1 공통수학1 행렬",
  "고1 공통수학2 도형의 방정식", "고1 공통수학2 집합과 명제", "고1 공통수학2 함수와 그래프",
  "고2 대수 지수함수와 로그함수", "고2 대수 삼각함수", "고2 대수 수열",
  "고2 미적분Ⅰ 함수의 극한과 연속", "고2 미적분Ⅰ 미분", "고2 미적분Ⅰ 적분",
  "고2 확률과 통계 경우의 수", "고2 확률과 통계 확률", "고2 확률과 통계 통계",
  "고2 기하 이차곡선", "고2 기하 공간도형과 공간좌표", "고2 기하 벡터",
  "고3 미적분Ⅱ 수열의 극한", "고3 미적분Ⅱ 미분법", "고3 미적분Ⅱ 적분법"
];
const GRADES = ["초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"];
const TERMS = ["1학기", "2학기"];
const KOREAN_HOLIDAYS = {
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴", "2026-02-17": "설날", "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절", "2026-03-02": "대체공휴일",
  "2026-05-05": "어린이날", "2026-05-24": "부처님오신날", "2026-05-25": "대체공휴일",
  "2026-06-03": "전국동시지방선거", "2026-06-06": "현충일",
  "2026-08-15": "광복절", "2026-08-17": "대체공휴일",
  "2026-09-24": "추석 연휴", "2026-09-25": "추석", "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절", "2026-10-05": "대체공휴일", "2026-10-09": "한글날",
  "2026-12-25": "성탄절"
};

const toList = (value) => Array.isArray(value) ? value : [];
const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const todayDay = () => DAYS[(new Date().getDay() + 6) % 7];
const id = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const app = document.getElementById("app");

let state = loadState();
let session = null;
let route = "home";
let selectedPeriod = "1교시";
let selectedStudents = new Set();
let modal = null;
let searchRenderTimer = null;
let listenersReady = false;
let studentViewDate = todayIso();
let calendarMonth = todayIso().slice(0, 7);
let syncStatus = "로컬 저장";
let remoteLoaded = false;
let saveTimer = null;

window.addEventListener("error", (event) => {
  const message = event.message || "알 수 없는 오류";
  const location = event.lineno ? ` (${event.lineno}:${event.colno || 0})` : "";
  document.body.insertAdjacentHTML("afterbegin", `<div class="runtime-error">앱 오류: ${escapeHtml(message + location)}</div>`);
});

function seedState() {
  const teachers = [
    { id: "t_admin", name: "관리자", loginId: "admin", password: "1234", role: "admin", mustChangePassword: false, active: true },
    { id: "t_deputy", name: "부원장", loginId: "deputy", password: "1234", role: "deputy", mustChangePassword: false, active: true },
    { id: "t_kim", name: "김관희쌤", loginId: "kim", password: "1234", role: "teacher", mustChangePassword: true, active: true },
    { id: "t_park", name: "박쌤", loginId: "park", password: "1234", role: "teacher", mustChangePassword: true, active: true }
  ];
  const students = [
    { id: "s_1", name: "김민준", birthday4: "0315", phone: "010-2222-1234", loginId: "김민준0315", password: "1234", active: true },
    { id: "s_2", name: "이서연", birthday4: "0821", phone: "010-3333-5678", loginId: "이서연0821", password: "5678", active: true },
    { id: "s_3", name: "최지훈", birthday4: "1204", phone: "010-4444-9012", loginId: "최지훈1204", password: "9012", active: true },
    { id: "s_4", name: "박하은", birthday4: "0410", phone: "010-5555-2468", loginId: "박하은0410", password: "2468", active: true },
    { id: "s_5", name: "정도윤", birthday4: "1018", phone: "010-6666-1357", loginId: "정도윤1018", password: "1357", active: true }
  ];
  return {
    teachers,
    students,
    periods: DEFAULT_PERIODS.map((name, index) => ({ id: `p_${index + 1}`, name, startTime: "", endTime: "", active: true })),
    schedules: [
      { id: "sch_1", studentId: "s_1", day: "월", period: "1교시", teacherIds: ["t_kim", "t_park"], lessonType: "정규" },
      { id: "sch_2", studentId: "s_2", day: "월", period: "1교시", teacherIds: ["t_kim"], lessonType: "정규" },
      { id: "sch_3", studentId: "s_3", day: "월", period: "2교시", teacherIds: ["t_kim"], lessonType: "개별" },
      { id: "sch_4", studentId: "s_4", day: "화", period: "1교시", teacherIds: ["t_park"], lessonType: "정규" },
      { id: "sch_5", studentId: "s_5", day: "수", period: "3교시", teacherIds: ["t_kim", "t_park"], lessonType: "보충" }
    ],
    materials: DEFAULT_MATERIALS,
    units: DEFAULT_UNITS,
    records: [],
    confirmations: [],
    academicEvents: []
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return normalizeState(seedState());
  try {
    const parsed = JSON.parse(saved);
    const normalized = normalizeState(parsed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch { return normalizeState(seedState()); }
}

function normalizeState(value) {
  const fallback = seedState();
  const next = value && typeof value === "object" ? value : {};
  next.teachers = Array.isArray(next.teachers) ? next.teachers : fallback.teachers;
  next.students = Array.isArray(next.students) ? next.students : fallback.students;
  next.schedules = Array.isArray(next.schedules) ? next.schedules : [];
  next.materials = Array.isArray(next.materials) ? next.materials : fallback.materials;
  next.units = Array.isArray(next.units) ? next.units : fallback.units;
  next.materials = [...new Set([...DEFAULT_MATERIALS, ...next.materials])];
  next.units = [...new Set([...DEFAULT_UNITS, ...next.units])];
  next.records = Array.isArray(next.records) ? next.records : [];
  next.confirmations = Array.isArray(next.confirmations) ? next.confirmations : [];
  next.academicEvents = Array.isArray(next.academicEvents) ? next.academicEvents : [];
  next.periods = Array.isArray(next.periods) ? next.periods : fallback.periods;

  next.teachers = next.teachers.map(teacher => ({
    active: true,
    role: "teacher",
    mustChangePassword: false,
    phone: "",
    ...teacher
  }));
  fallback.teachers.forEach(defaultTeacher => {
    const existing = next.teachers.find(teacher => teacher.id === defaultTeacher.id || teacher.loginId === defaultTeacher.loginId);
    if (existing) {
      existing.id = defaultTeacher.id;
      existing.name = existing.name || defaultTeacher.name;
      existing.loginId = defaultTeacher.loginId;
      existing.role = defaultTeacher.role;
      if (defaultTeacher.role === "admin" || defaultTeacher.role === "deputy") {
        existing.password = "1234";
        existing.active = true;
        existing.mustChangePassword = false;
      }
      return;
    }
    next.teachers.push(defaultTeacher);
  });
  next.students = next.students.map(student => ({
    active: true,
    schoolYear: "",
    currentMaterial: "",
    studyTerm: "1학기",
    materials: student.currentMaterial ? [student.currentMaterial] : [],
    ...student
  })).map(student => ({
    ...student,
    materials: [...new Set(toList(student.materials).filter(Boolean))]
  }));
  next.units = next.units
    .map(unit => String(unit).replace(/연립일차부등식/g, "연립일차방정식"))
    .filter((unit, index, units) => units.indexOf(unit) === index);
  next.records = next.records.map(record => ({
    ...record,
    unit: String(record.unit || "").replace(/연립일차부등식/g, "연립일차방정식")
  }));
  next.schedules = next.schedules.map(schedule => ({
    ...schedule,
    teacherIds: Array.isArray(schedule.teacherIds) ? schedule.teacherIds : [],
    lessonType: schedule.lessonType || "정규"
  }));
  next.periods = next.periods.map((period, index) => {
    if (typeof period === "string") {
      return { id: `p_${index + 1}`, name: period, startTime: "", endTime: "", active: true };
    }
    return { id: period.id || id("p"), name: period.name || `${index + 1}교시`, startTime: period.startTime || "", endTime: period.endTime || "", active: period.active !== false };
  });
  next.records = next.records.map(record => ({
    ...record,
    studentIds: Array.isArray(record.studentIds) ? record.studentIds : (record.studentId ? [record.studentId] : []),
    lessonType: normalizeLessonType(record.lessonType),
    attendance: normalizeAttendance(record.attendance),
    homework: normalizeHomework(record.homework),
    focus: FOCUS_LEVELS.includes(record.focus) ? record.focus : "",
    assignment: record.assignment || "",
    parentMessage: record.parentMessage || "",
    studentMessage: record.studentMessage || "",
    version: record.version || 1,
    hidden: record.hidden || false
  }));
  return next;
}

function normalizeLessonType(value = "정규") {
  if (value === "대타") return "특강";
  if (value === "개별") return "개별지도";
  return LESSON_TYPES.includes(value) ? value : "정규";
}

function normalizeAttendance(value = "정시출석") {
  if (value === "출석" || value === "보강") return "정시출석";
  return ATTENDANCE.includes(value) ? value : "정시출석";
}

function normalizeHomework(value = "완벽") {
  const map = {
    "100%": "완벽", "75%": "잘함", "50%": "보통", "25%": "부족", "0%": "미완료",
    "클리어": "완벽", "오답수정중": "잘함", "과제진행중": "보통", "과제안함": "미완료"
  };
  const next = map[value] || value;
  return HOMEWORK.includes(next) ? next : "완벽";
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleRemoteSave();
}

function showMessage(message) {
  window.alert(message);
}

function supabaseReady() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function loadRemoteState() {
  if (!supabaseReady()) return;
  syncStatus = "Supabase 확인 중";
  render();
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/app_state?id=eq.${encodeURIComponent(SUPABASE_STATE_ID)}&select=data,updated_at`, {
      headers: supabaseHeaders()
    });
    if (!response.ok) throw new Error(`load ${response.status}`);
    const rows = await response.json();
    if (rows[0]?.data) {
      state = normalizeState(rows[0].data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      syncStatus = `Supabase 연결됨 · ${formatKoreanDate(todayIso())}`;
    } else {
      syncStatus = "Supabase 연결됨 · 첫 저장 대기";
      scheduleRemoteSave(0);
    }
    remoteLoaded = true;
  } catch (error) {
    syncStatus = `로컬 저장 · Supabase 확인 실패 ${error.message || ""}`.trim();
  }
  render();
}

function scheduleRemoteSave(delay = 500) {
  if (!supabaseReady()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveRemoteState, delay);
}

async function saveRemoteState() {
  if (!supabaseReady()) return;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/app_state?on_conflict=id`, {
      method: "POST",
      headers: supabaseHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({
        id: SUPABASE_STATE_ID,
        data: normalizeState(JSON.parse(JSON.stringify(state))),
        updated_at: new Date().toISOString()
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}${text ? ` ${text.slice(0, 80)}` : ""}`);
    }
    syncStatus = "Supabase 저장됨";
  } catch (error) {
    syncStatus = `로컬 저장 · Supabase 저장 실패 ${error.message || ""}`.trim();
  }
  if (remoteLoaded) render();
}

function teacherName(teacherId) {
  return toList(state.teachers).find(t => t.id === teacherId)?.name || "알 수 없음";
}

function studentName(studentId) {
  return toList(state.students).find(s => s.id === studentId)?.name || "알 수 없음";
}

function currentUserName() {
  return session?.name || "";
}

function canAdmin() {
  return session?.role === "admin" || session?.role === "deputy";
}

function canTeacher() {
  return ["admin", "deputy", "teacher"].includes(session?.role);
}

function periodOptions() {
  const periods = toList(state.periods)
    .filter(period => period.active)
    .map(period => period.name);
  return periods.length ? periods : DEFAULT_PERIODS;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseScore(raw) {
  const text = String(raw || "").trim();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return { raw: text, accuracy: null, display: text ? `${text}점` : "" };
  const correct = Number(match[1]);
  const total = Number(match[2]);
  if (!total) return { raw: text, accuracy: null, display: text };
  const accuracy = Math.round((correct / total) * 100);
  return { raw: text, accuracy, display: `${correct}/${total} · 정답률 ${accuracy}%` };
}

function formatPhone(value = "") {
  const digits = String(value).replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function isValidPhone(value = "") {
  return /^010-\d{4}-\d{4}$/.test(value);
}

function phoneTail(value = "") {
  return (value.match(/\d/g) || []).join("").slice(-4);
}

function addDays(dateText, amount) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + amount);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatKoreanDate(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  const day = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${dateText} ${day}요일`;
}

function uniqueRecordDates(records) {
  return [...new Set(toList(records).map(record => record.lessonDate).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function moveToRecordDate(records, direction) {
  const dates = uniqueRecordDates(records);
  if (!dates.length) return studentViewDate;
  if (!dates.includes(studentViewDate)) {
    if (direction < 0) return dates.filter(date => date < studentViewDate).pop() || dates[dates.length - 1];
    return dates.find(date => date > studentViewDate) || dates[0];
  }
  const index = dates.indexOf(studentViewDate);
  const nextIndex = direction < 0
    ? Math.max(0, index - 1)
    : Math.min(dates.length - 1, index + 1);
  return dates[nextIndex];
}

function keywordList(record) {
  return String(record.keywords || "")
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function formatTest(value = "", legacyScore = "") {
  const text = String(value || "").trim();
  const combined = [text, legacyScore].filter(Boolean).join(" ").trim();
  if (!combined) return "";
  const fraction = combined.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (fraction) {
    const correct = Number(fraction[1]);
    const total = Number(fraction[2]);
    const accuracy = total ? Math.round((correct / total) * 100) : null;
    return accuracy === null ? combined : `${combined} · 정답률 ${accuracy}%`;
  }
  const score = combined.match(/(^|\s)(\d{1,3})(점)?($|\s)/);
  if (score) return score[3] ? combined : combined.replace(score[0], `${score[1]}${score[2]}점${score[4]}`);
  return combined;
}

function login(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const loginId = form.get("loginId").trim();
  const password = form.get("password").trim();
  const teacher = toList(state.teachers).find(t => t.active && t.loginId === loginId && t.password === password);
  if (teacher) {
    session = { type: "teacher", id: teacher.id, name: teacher.name, role: teacher.role, mustChangePassword: teacher.mustChangePassword };
    route = canAdmin() ? "admin" : "teacher";
    selectedPeriod = "1교시";
    render();
    return;
  }
  const student = toList(state.students).find(s => s.active && s.loginId === loginId && s.password === password);
  if (student) {
    session = { type: "student", id: student.id, name: student.name, role: "student" };
    route = "student";
    render();
    return;
  }
  document.getElementById("loginError").textContent = "아이디 또는 비밀번호를 확인해주세요.";
}

function logout() {
  session = null;
  route = "home";
  selectedStudents.clear();
  modal = null;
  render();
}

function render() {
  ensureGlobalListeners();
  if (!session) {
    app.innerHTML = renderLogin();
    document.getElementById("loginForm").addEventListener("submit", login);
    return;
  }
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="main">
        ${renderRoute()}
      </main>
      ${modal ? renderModal() : ""}
    </div>
  `;
}

function ensureGlobalListeners() {
  if (listenersReady) return;
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("submit", handleGlobalSubmit);
  document.addEventListener("input", handleGlobalInput);
  listenersReady = true;
}

function renderLogin() {
  return `
    <main class="login-page">
      <section class="login-box">
        <img class="login-logo" src="./logo.png" alt="독수리수학 로고" />
        <h1 class="login-title">수학이 너희를 자유케하리라</h1>
        <p class="login-subtitle">강사용 학습기록 · 학생/학부모 알림장</p>
        <form id="loginForm" class="panel stack">
          <label>아이디 <input name="loginId" autocomplete="username" placeholder="아이디" required /></label>
          <label>비밀번호 <input name="password" type="password" autocomplete="current-password" placeholder="비밀번호" required /></label>
          <p id="loginError" class="error small"></p>
          <button class="primary" type="submit">로그인</button>
        </form>
      </section>
    </main>
  `;
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <img src="./logo.png" alt="독수리수학 로고" />
        <div class="brand-title">
          <strong>수학이 너희를 자유케하리라</strong>
          <span>${routeLabel()}</span>
        </div>
      </div>
      <div class="row">
        <span class="badge">${escapeHtml(syncStatus)}</span>
        <span class="user-chip">${escapeHtml(currentUserName())}</span>
        ${canTeacher() ? `<button class="ghost" data-route="teacher">강사</button>` : ""}
        ${canAdmin() ? `<button class="ghost" data-route="admin">관리</button>` : ""}
        ${session.type === "student" ? `<button class="ghost" data-route="student">알림장</button>` : ""}
        <button data-action="logout">나가기</button>
      </div>
    </header>
  `;
}

function routeLabel() {
  if (route === "admin") return "관리자/부원장 전체 관리";
  if (route === "teacher") return "강사 수업기록";
  return "학생/학부모 알림장";
}

function dateDayName(date) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return DAYS[(day + 6) % 7];
}

function monthDates(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const start = new Date(year, monthNumber - 1, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  });
}

function eventsOnDate(date, parentView = false) {
  return toList(state.academicEvents).filter(item => (!parentView || item.visibility !== "내부") && date >= item.startDate && date <= item.endDate);
}

function holidayOnDate(date) {
  if (typeof date !== "string" || date.length < 10) return "";
  const recurring = {
    "01-01": "신정", "03-01": "삼일절", "05-05": "어린이날", "06-06": "현충일",
    "08-15": "광복절", "10-03": "개천절", "10-09": "한글날", "12-25": "성탄절"
  };
  return KOREAN_HOLIDAYS[date] || recurring[date.slice(5)] || "";
}

function schedulesOnDate(date, studentId = "", teacherId = "") {
  if (eventsOnDate(date).some(item => ["휴원", "공휴일"].includes(item.type))) return [];
  return toList(state.schedules).filter(item => item.day === dateDayName(date)
    && (!studentId || item.studentId === studentId)
    && (!teacherId || toList(item.teacherIds).includes(teacherId)));
}

function moveMonth(month, delta) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function renderCalendar({ studentId = "", teacherId = "", parentView = false } = {}) {
  const dates = monthDates(calendarMonth);
  const recordScope = toList(state.records).filter(record => !record.hidden
    && (!studentId || toList(record.studentIds).includes(studentId))
    && (!teacherId || record.createdBy === teacherId));
  return `
    <section class="panel calendar-panel">
      <div class="between calendar-head">
        <button data-action="moveCalendarMonth" data-delta="-1">‹</button>
        <div><h2 class="section-title">${Number(calendarMonth.slice(5))}월 수업 달력</h2><button class="link-button" data-action="goCalendarToday">오늘로</button></div>
        <button data-action="moveCalendarMonth" data-delta="1">›</button>
      </div>
      <div class="calendar-weekdays">${["일","월","화","수","목","금","토"].map((day, index) => `<span class="${index === 0 ? "sunday" : index === 6 ? "saturday" : ""}">${day}</span>`).join("")}</div>
      <div class="calendar-grid">
        ${dates.map(date => {
          const schedules = schedulesOnDate(date, studentId, teacherId);
          const records = recordScope.filter(record => record.lessonDate === date);
          const events = eventsOnDate(date, parentView);
          const holiday = holidayOnDate(date);
          const weekDay = new Date(`${date}T12:00:00`).getDay();
          const outside = !date.startsWith(calendarMonth);
          return `<button class="calendar-day ${outside ? "outside" : ""} ${date === todayIso() ? "today" : ""} ${weekDay === 0 ? "sunday" : weekDay === 6 ? "saturday" : ""}" data-action="openCalendarDay" data-date="${date}" data-student-id="${studentId}">
            <span class="calendar-number">${Number(date.slice(8))}</span>
            ${holiday ? `<span class="calendar-holiday">${escapeHtml(holiday)}</span>` : ""}
            ${events.slice(0, 1).map(item => `<span class="calendar-event">${escapeHtml(item.title)}</span>`).join("")}
            ${records.length ? `<span class="calendar-record">학습 ${records.length}</span>` : schedules.length ? `<span class="calendar-scheduled">수업 ${schedules.length}</span>` : ""}
          </button>`;
        }).join("")}
      </div>
      <div class="calendar-legend"><span><i class="dot scheduled"></i>예정 수업</span><span><i class="dot recorded"></i>학습 기록</span><span><i class="dot event"></i>학사일정</span></div>
      ${parentView ? `<p class="policy-note">개인 사정으로 인한 결석은 보충 대상이 아닙니다. 학원에서 학습상 필요하다고 판단한 경우에만 별도로 안내드립니다.</p>` : ""}
    </section>`;
}

function renderCalendarDay() {
  const date = modal.date;
  const studentId = modal.studentId || "";
  const teacherId = session.type === "teacher" && !canAdmin() ? session.id : "";
  const schedules = schedulesOnDate(date, studentId, teacherId);
  const records = toList(state.records).filter(record => !record.hidden && record.lessonDate === date && (!studentId || toList(record.studentIds).includes(studentId)));
  const events = eventsOnDate(date, session.type === "student");
  const holiday = holidayOnDate(date);
  const query = modal.query || "";
  const scheduledIds = [...new Set(schedules.map(item => item.studentId))];
  const searchedStudents = canTeacher() && query ? toList(state.students).filter(student => student.active && (`${student.name} ${student.loginId} ${student.phone}`).includes(query)).slice(0, 10) : [];
  return `<div class="stack"><div class="between"><h2 class="section-title">${formatKoreanDate(date)}</h2><button data-action="closeModal">닫기</button></div>
    ${holiday ? `<div class="event-card holiday-card"><strong>${escapeHtml(holiday)}</strong><span>대한민국 공휴일</span></div>` : ""}
    ${events.map(item => `<div class="event-card"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.type)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</span></div>`).join("")}
    ${canTeacher() ? `<section class="stack calendar-student-select"><div class="between"><div><strong>이 날짜의 학생 선택</strong><div class="muted small">예정 학생과 검색 학생을 함께 여러 명 선택할 수 있어요.</div></div><div class="toolbar">${scheduledIds.length ? `<button data-action="selectCalendarScheduled" data-ids="${escapeHtml(scheduledIds.join(","))}">예정 학생 전체 선택</button>` : ""}<span class="badge">${selectedStudents.size}명 선택</span></div></div>
      ${scheduledIds.length ? `<div class="student-picker">${scheduledIds.map(idValue => { const student = state.students.find(item => item.id === idValue); return student ? `<button class="student-button ${selectedStudents.has(idValue) ? "selected" : ""}" data-action="pickCalendarStudent" data-id="${idValue}">${escapeHtml(student.name)}<span>예정 수업</span></button>` : ""; }).join("")}</div>` : `<div class="muted small">예정된 학생이 없습니다. 아래에서 다른 학생을 검색하세요.</div>`}
      <input data-action="searchCalendarStudent" value="${escapeHtml(query)}" placeholder="당일 수업이 아닌 학생도 이름·아이디로 검색" />
      ${searchedStudents.length ? `<div class="student-picker">${searchedStudents.map(student => `<button class="student-button ${selectedStudents.has(student.id) ? "selected" : ""}" data-action="pickCalendarStudent" data-id="${student.id}">${escapeHtml(student.name)}<span>${scheduledIds.includes(student.id) ? "예정 학생" : "추가 학생"}</span></button>`).join("")}</div>` : ""}
      <div class="form-actions"><button data-action="clearSelection" ${selectedStudents.size ? "" : "disabled"}>선택 해제</button><button class="primary" data-action="openCalendarRecord" ${selectedStudents.size ? "" : "disabled"}>선택 학생 함께 기록</button></div>
    </section>` : schedules.length ? `<div class="stack"><strong>예정 수업</strong>${schedules.map(item => `<div class="schedule-line"><span>${escapeHtml(item.period)} · ${escapeHtml(studentName(item.studentId))}</span><span class="badge">${escapeHtml(item.lessonType)}</span></div>`).join("")}</div>` : ""}
    ${records.length ? `<div class="stack"><strong>학습 이력</strong>${session.type === "student" ? renderStudentDailyNotices(records) : renderRecordList(records, canTeacher())}</div>` : ""}
    ${!holiday && !events.length && !schedules.length && !records.length && !canTeacher() ? `<div class="empty">등록된 일정이나 학습기록이 없습니다.</div>` : ""}</div>`;
}

function renderRoute() {
  if (route === "admin" && canAdmin()) return renderAdmin();
  if (route === "student") return renderStudent();
  return renderTeacher();
}

function renderTeacher() {
  const day = todayDay();
  const teacherSchedules = toList(state.schedules).filter(s => s.day === day && toList(s.teacherIds).includes(session.id));
  const allPeriods = periodOptions();
  const periods = allPeriods.filter(p => teacherSchedules.some(s => s.period === p));
  const activePeriods = periods.length ? periods : allPeriods.slice(0, 3);
  if (!activePeriods.includes(selectedPeriod)) selectedPeriod = activePeriods[0];
  const periodSchedules = teacherSchedules.filter(s => s.period === selectedPeriod);
  const scheduledStudents = periodSchedules.map(s => toList(state.students).find(st => st.id === s.studentId)).filter(Boolean);
  const recentRecords = toList(state.records)
    .filter(r => !r.hidden)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return `
    <div class="grid teacher-dashboard">
      ${session.mustChangePassword ? renderPasswordPanel() : ""}
      ${renderCalendar({ teacherId: session.id })}
      <section class="panel stack today-class-panel">
        <div class="between">
          <div>
            <h2 class="section-title">오늘 수업</h2>
            <div class="muted small">${todayIso()} · ${day}요일 · 모든 학생 검색/작성 가능</div>
          </div>
          <button class="blue" data-action="openQuickRecord">학생 검색 작성</button>
        </div>
        <div class="tabs">
          ${activePeriods.map(p => `<button class="${p === selectedPeriod ? "selected" : ""}" data-period="${p}">${p}</button>`).join("")}
        </div>
        ${scheduledStudents.length ? `
          <div class="between">
            <strong>${selectedPeriod} 학생</strong>
            <div class="toolbar">
              <button data-action="selectAllPeriod">전체 선택</button>
              <button data-action="clearSelection">전체 해제</button>
              <span class="badge">${selectedStudents.size}명 선택됨</span>
            </div>
          </div>
          <div class="student-picker">
            ${scheduledStudents.map(student => renderStudentButton(student, selectedStudents.has(student.id))).join("")}
          </div>
          <button class="primary" data-action="openBulkRecord" ${selectedStudents.size ? "" : "disabled"}>선택 학생 일괄 기록</button>
        ` : `<div class="empty">오늘 ${selectedPeriod}에 배정된 학생이 없습니다. 보충 학생은 검색해서 작성할 수 있어요.</div>`}
      </section>
      <section class="panel recent-records-panel">
        <div class="between">
          <h2 class="section-title">최근 작성 기록</h2>
          <span class="muted small">강사는 모든 학생 기록을 볼 수 있어요</span>
        </div>
        ${renderRecordList(recentRecords, true)}
      </section>
    </div>
  `;
}

function renderPasswordPanel() {
  return `
    <section class="panel stack password-panel">
      <strong>최초 로그인 비밀번호 변경</strong>
      <form class="grid two" data-form="changePassword">
        <label>새 비밀번호 <input name="password" type="password" minlength="4" required /></label>
        <label>새 비밀번호 확인 <input name="confirm" type="password" minlength="4" required /></label>
        <button class="primary" type="submit">변경</button>
      </form>
    </section>
  `;
}

function renderStudentButton(student, selected) {
  const schedule = toList(state.schedules).find(s => s.studentId === student.id && s.day === todayDay() && s.period === selectedPeriod);
  const progress = renderStudentProgress(student);
  return `
    <button class="student-button ${progress ? "progress-student-button" : ""} ${selected ? "selected" : ""}" data-student="${student.id}">
      ${escapeHtml(student.name)}
      <span>${schedule?.lessonType || "검색"} · ${student.loginId}</span>
      ${progress}
    </button>
  `;
}

function curriculumUnits(grade, term) {
  if (!grade || !term) return [];
  const semester = term === "2학기" ? "2" : "1";
  if (grade.startsWith("초")) return toList(state.units).filter(unit => unit.startsWith(`${grade}-${semester} `));
  if (grade.startsWith("중")) {
    const units = toList(state.units).filter(unit => unit.startsWith(`${grade} `));
    const splitAt = grade === "중1" ? 3 : 4;
    return term === "1학기" ? units.slice(0, splitAt) : units.slice(splitAt);
  }
  const units = toList(state.units).filter(unit => unit.startsWith(`${grade} `));
  const splitAt = Math.ceil(units.length / 2);
  return term === "1학기" ? units.slice(0, splitAt) : units.slice(splitAt);
}

function renderStudentProgress(student) {
  const materials = toList(student.materials).length ? student.materials : (student.currentMaterial ? [student.currentMaterial] : []);
  const units = curriculumUnits(student.schoolYear, student.studyTerm || "1학기");
  if (!materials.length || !units.length) return "";
  return `<span class="study-progress-list">${materials.map(material => {
    const latest = toList(state.records)
      .filter(record => !record.hidden && record.material === material && toList(record.studentIds).includes(student.id) && units.includes(record.unit))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0];
    const unitIndex = latest ? units.indexOf(latest.unit) : -1;
    const percent = unitIndex < 0 ? 0 : Math.round(((unitIndex + 1) / units.length) * 100);
    return `<span class="study-progress"><span class="study-progress-head"><b>${escapeHtml(material)}</b><em>${percent}%</em></span><span class="study-progress-track"><i style="width:${percent}%"></i></span><small>${latest ? escapeHtml(latest.unit.replace(/^\S+\s+/, "")) : "시작 전"}</small></span>`;
  }).join("")}</span>`;
}

function renderAdmin() {
  const visibleRecords = toList(state.records)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 30);
  return `
    <div class="grid">
      <section class="panel">
        <div class="between">
          <div>
            <h2 class="section-title">전체 관리</h2>
            <div class="muted small">관리자와 부원장은 모든 등록, 수정, 숨김, 복구 권한을 가집니다.</div>
          </div>
          <div class="toolbar">
            <button class="primary" data-action="openStudentForm">학생 등록</button>
            <button class="blue" data-action="openTeacherForm">강사 등록</button>
            <button data-action="openPeriodManager">교시/시간 관리</button>
            <button data-action="openScheduleForm">시간표 배정</button>
            <button data-action="openAcademicEventForm">학사일정 등록</button>
            <button data-action="exportData">데이터 백업</button>
            <button data-action="importData">데이터 복원</button>
            <input class="visually-hidden" id="dataImportInput" type="file" accept="application/json" data-action="loadBackupFile" />
          </div>
        </div>
      </section>
      ${renderCalendar()}
      <section class="grid two">
        <div class="panel">
          <h2 class="section-title">학생</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>이름</th><th>학년</th><th>아이디</th><th>전화</th><th></th></tr></thead>
              <tbody>${toList(state.students).map(s => `
                <tr>
                  <td>${escapeHtml(s.name)} ${!s.active ? `<span class="badge bad">숨김</span>` : ""}</td>
                  <td>${escapeHtml(s.schoolYear || "-")}</td>
                  <td>${escapeHtml(s.loginId)}</td>
                  <td>${escapeHtml(s.phone)}</td>
                  <td class="toolbar">
                    <button data-action="editStudent" data-id="${s.id}">수정</button>
                    <button data-action="toggleStudent" data-id="${s.id}">${s.active ? "숨김" : "복구"}</button>
                  </td>
                </tr>
              `).join("")}</tbody>
            </table>
          </div>
        </div>
        <div class="panel">
          <h2 class="section-title">강사</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>이름</th><th>아이디</th><th>전화</th><th>권한</th><th></th></tr></thead>
              <tbody>${toList(state.teachers).map(t => `
                <tr>
                  <td>${escapeHtml(t.name)} ${!t.active ? `<span class="badge bad">숨김</span>` : ""}</td>
                  <td>${escapeHtml(t.loginId)}</td>
                  <td>${escapeHtml(t.phone || "-")}</td>
                  <td>${roleName(t.role)}</td>
                  <td class="toolbar">
                    <button data-action="editTeacher" data-id="${t.id}">수정</button>
                    <button data-action="resetTeacherPassword" data-id="${t.id}">1234 초기화</button>
                    <button data-action="toggleTeacher" data-id="${t.id}">${t.active ? "숨김" : "복구"}</button>
                  </td>
                </tr>
              `).join("")}</tbody>
            </table>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="between"><h2 class="section-title">학사일정</h2><span class="muted small">휴원·시험·특강·안내</span></div>
        ${renderAcademicEventList()}
      </section>
      <section class="panel">
        <div class="between">
          <h2 class="section-title">교시/시간</h2>
          <button data-action="openPeriodManager">관리 열기</button>
        </div>
        ${renderPeriodTable()}
      </section>
      <section class="panel">
        <h2 class="section-title">수업 기록 전체</h2>
        ${renderRecordList(visibleRecords, true, true)}
      </section>
    </div>
  `;
}

function roleName(role) {
  return { admin: "관리자", deputy: "부원장", teacher: "강사" }[role] || role;
}

function renderStudent() {
  const records = toList(state.records)
    .filter(r => toList(r.studentIds).includes(session.id) && !r.hidden)
    .sort((a, b) => b.lessonDate.localeCompare(a.lessonDate) || b.updatedAt.localeCompare(a.updatedAt));
  const dayRecords = records.filter(record => record.lessonDate === studentViewDate);
  return `
    <div class="grid">
      ${renderCalendar({ studentId: session.id, parentView: true })}
      <section class="panel stack">
        <div class="between">
          <h2 class="section-title">내 학습 알림장</h2>
          <button data-action="goToday">오늘</button>
        </div>
        <div class="date-nav">
          <button class="date-arrow" data-action="moveStudentDate" data-days="-1">‹</button>
          <strong>${escapeHtml(formatKoreanDate(studentViewDate))}</strong>
          <button class="date-arrow" data-action="moveStudentDate" data-days="1">›</button>
        </div>
        ${renderStudentDailyNotices(dayRecords)}
        <div class="muted small">전체 기록 ${records.length}개 · 화살표로 날짜를 넘겨 이전 알림장을 볼 수 있어요.</div>
      </section>
    </div>
  `;
}

function renderStudentDailyNotices(records) {
  if (!records.length) return `<div class="empty">이 날의 학습기록이 없습니다.</div>`;
  return `<div class="list">${records.map(record => `
    <div class="stack">
      <div class="between">
        <strong>${isConfirmed(record, session.id) ? "확인한 알림장" : "확인이 필요한 알림장"}</strong>
        <span class="badge ${isConfirmed(record, session.id) ? "good" : "warn"}">${isConfirmed(record, session.id) ? "확인 완료" : "확인 전"}</span>
      </div>
      ${renderStudentRecordCard(record)}
      ${renderKeywordConfirm(record)}
      ${renderAssignmentConfirm(record)}
    </div>
  `).join("")}</div>`;
}

function renderAssignmentConfirm(record) {
  if (!String(record.assignment || "").trim()) return "";
  const confirmation = getConfirmation(record.id, session.id);
  const confirmed = confirmation?.assignmentConfirmed === true;
  return `
    <div class="assignment-confirm">
      <button class="blue" data-action="confirmAssignment" data-id="${record.id}" ${confirmed ? "disabled" : ""}>${confirmed ? "과제 확인 완료" : "과제 확인하기"}</button>
    </div>
  `;
}

function renderKeywordConfirm(record) {
  const keywords = keywordList(record);
  if (!keywords.length) {
    const confirmed = isConfirmed(record, session.id);
    return `<button class="primary" data-action="confirmRecord" data-id="${record.id}" ${confirmed ? "disabled" : ""}>${confirmed ? "확인 완료" : "확인 완료하기"}</button>`;
  }
  const confirmation = getConfirmation(record.id, session.id);
  const checked = toList(confirmation?.keywords);
  const confirmed = isConfirmed(record, session.id);
  const allChecked = keywords.every(keyword => checked.includes(keyword));
  return `
    <div class="stack">
      <div class="muted small">오늘의 리마인드 키워드를 한번씩 떠올려보고 눌러주세요.</div>
      <div class="keyword-grid">
        ${keywords.map(keyword => `<button class="${checked.includes(keyword) ? "selected" : ""}" data-action="toggleKeyword" data-id="${record.id}" data-keyword="${escapeHtml(keyword)}" ${confirmed ? "disabled" : ""}>${escapeHtml(keyword)}</button>`).join("")}
      </div>
      <button class="primary" data-action="confirmRecord" data-id="${record.id}" ${allChecked && !confirmed ? "" : "disabled"}>${confirmed ? "확인 완료" : "리마인드 완료"}</button>
    </div>
  `;
}

function renderRecordList(records, editable, adminMode = false) {
  if (!records.length) return `<div class="empty">아직 기록이 없습니다.</div>`;
  return `<div class="list">${records.map(r => renderRecordCard(r, editable, adminMode)).join("")}</div>`;
}

function renderRecordCard(record, editable, adminMode = false) {
  const testDisplay = formatTest(record.testName, record.testScore);
  const recordStudentIds = toList(record.studentIds);
  const students = recordStudentIds.map(studentName).join(", ");
  const author = teacherName(record.createdBy);
  const updater = record.updatedBy && record.updatedBy !== record.createdBy ? ` · 수정: ${teacherName(record.updatedBy)}` : "";
  const confirmCount = recordStudentIds.filter(sid => isConfirmed(record, sid)).length;
  return `
    <article class="record-item ${record.hidden ? "hidden" : ""}">
      <div class="record-head">
        <div>
          <strong>${escapeHtml(record.lessonDate)} · ${escapeHtml(record.period)} · ${escapeHtml(record.lessonType)}</strong>
          <div class="muted small">${escapeHtml(students)}</div>
        </div>
        <div class="row">
          <span class="badge">${escapeHtml(record.attendance)}</span>
          <span class="badge ${homeworkClass(record.homework)}">${escapeHtml(record.homework)}</span>
          ${record.hidden ? `<span class="badge bad">숨김</span>` : ""}
        </div>
      </div>
      <div class="record-body">
        ${(record.material || record.unit) ? `<div><b>진도</b> ${escapeHtml([record.material, record.unit].filter(Boolean).join(" · "))}</div>` : ""}
        ${record.content ? `<div><b>수업 내용</b> ${escapeHtml(record.content)}</div>` : ""}
        ${record.assignment ? `<div><b>오늘의 과제</b> ${escapeHtml(record.assignment)}</div>` : ""}
        ${record.focus ? `<div><b>수업집중도</b> ${escapeHtml(record.focus)}</div>` : ""}
        ${record.parentMessage ? `<div><b>학부모님께</b> ${escapeHtml(record.parentMessage)}</div>` : ""}
        ${record.studentMessage ? `<div><b>학생에게</b> ${escapeHtml(record.studentMessage)}</div>` : ""}
        ${testDisplay ? `<div><b>테스트</b> ${escapeHtml(testDisplay)}</div>` : ""}
        ${record.nextPlan ? `<div><b>다음 계획</b> ${escapeHtml(record.nextPlan)}</div>` : ""}
        <div class="muted small">작성자: ${escapeHtml(author)}${escapeHtml(updater)} · 확인 ${confirmCount}/${recordStudentIds.length}</div>
      </div>
      ${editable ? `
        <div class="form-actions">
          <button data-action="editRecord" data-id="${record.id}">수정</button>
          ${adminMode ? `<button class="${record.hidden ? "" : "danger"}" data-action="toggleRecordHidden" data-id="${record.id}">${record.hidden ? "복구" : "숨김"}</button>` : ""}
        </div>
      ` : ""}
    </article>
  `;
}

function renderStudentRecordList(records) {
  if (!records.length) return `<div class="empty">이 날의 학습기록이 없습니다.</div>`;
  return `<div class="list">${records.map(renderStudentRecordCard).join("")}</div>`;
}

function renderStudentRecordCard(record) {
  const testDisplay = formatTest(record.testName, record.testScore);
  const author = teacherName(record.createdBy);
  const updater = record.updatedBy && record.updatedBy !== record.createdBy ? ` · 수정: ${teacherName(record.updatedBy)}` : "";
  const learningProcess = [record.material, record.unit].filter(Boolean).join(" · ");
  const percent = homeworkPercent(record.homework);
  return `
    <article class="record-item student-notice">
      <div class="record-head">
        <div>
          <strong>${escapeHtml(record.lessonDate)}</strong>
          <div class="muted small">작성자: ${escapeHtml(author)}${escapeHtml(updater)}</div>
        </div>
      </div>
      <div class="notice-rows">
        <div><b>출석정보</b><span>${escapeHtml(record.attendance || "-")}</span></div>
        <div><b>과제수행도</b><span>${renderHomeworkMeter(percent)}</span></div>
        ${record.focus ? `<div><b>수업집중도</b><span>${escapeHtml(record.focus)}</span></div>` : ""}
        <div><b>학습과정</b><span>${escapeHtml(learningProcess || "-")}</span></div>
        <div><b>수업내용</b><span>${escapeHtml(record.content || "-")}</span></div>
        <div><b>오늘의과제</b><span>${escapeHtml(record.assignment || "-")}</span></div>
        ${record.parentMessage ? `<div><b>학부모님께</b><span>${escapeHtml(record.parentMessage)}</span></div>` : ""}
        ${record.studentMessage ? `<div><b>학생에게</b><span>${escapeHtml(record.studentMessage)}</span></div>` : ""}
        ${testDisplay ? `<div><b>테스트</b><span>${escapeHtml(testDisplay)}</span></div>` : ""}
      </div>
    </article>
  `;
}

function homeworkClass(value) {
  const percent = homeworkPercent(value);
  if (percent >= 100) return "good";
  if (percent <= 25) return "bad";
  return "warn";
}

function homeworkPercent(value = "완벽") {
  return { "완벽": 100, "잘함": 75, "보통": 50, "부족": 25, "미완료": 0 }[normalizeHomework(value)] ?? 100;
}

function renderHomeworkMeter(percent) {
  return `
    <span class="homework-meter" style="--progress:${percent}%">
      <span class="homework-track"><span class="homework-fill"></span><span class="homework-marker"></span></span>
      <span class="homework-scale"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></span>
      <strong>${percent}%</strong>
    </span>
  `;
}

function isConfirmed(record, studentId) {
  return toList(state.confirmations).some(c => c.recordId === record.id && c.studentId === studentId && c.version === record.version);
}

function getConfirmation(recordId, studentId) {
  return toList(state.confirmations).find(c => c.recordId === recordId && c.studentId === studentId);
}

function renderModal() {
  const renderers = {
    bulkRecord: () => renderRecordForm("bulk"),
    quickRecord: () => renderQuickRecordModal(),
    aiAssist: () => renderAiAssistModal(),
    editRecord: () => renderRecordForm("edit", toList(state.records).find(r => r.id === modal.recordId)),
    studentForm: () => renderStudentForm(),
    editStudentForm: () => renderStudentForm(toList(state.students).find(s => s.id === modal.studentId)),
    teacherForm: () => renderTeacherForm(),
    editTeacherForm: () => renderTeacherForm(toList(state.teachers).find(t => t.id === modal.teacherId)),
    editScheduleForm: () => renderEditScheduleForm(toList(state.schedules).find(s => s.id === modal.scheduleId)),
    periodManager: () => renderPeriodManager(),
    periodForm: () => renderPeriodForm(),
    scheduleForm: () => renderScheduleForm(),
    academicEventForm: () => renderAcademicEventForm(),
    calendarDay: () => renderCalendarDay()
  };
  const content = renderers[modal.type]?.() || "";
  return `
    <div class="modal-backdrop">
      <section class="modal ${["bulkRecord", "editRecord"].includes(modal.type) ? "record-modal" : ""}">
        ${content}
      </section>
    </div>
  `;
}

function renderRecordForm(mode, record = {}) {
  const studentIds = mode === "edit" ? toList(record.studentIds) : Array.from(selectedStudents);
  const selectedStudentData = studentIds.map(studentId => toList(state.students).find(student => student.id === studentId)).filter(Boolean);
  const currentMaterials = selectedStudentData.flatMap(student => toList(student.materials).length ? student.materials : [student.currentMaterial]).filter(Boolean);
  const defaultMaterial = record.material || (new Set(currentMaterials).size === 1 ? currentMaterials[0] : "");
  const materialOptions = currentMaterials.length ? [...new Set(currentMaterials)] : toList(state.materials);
  const curriculumKeys = [...new Set(selectedStudentData.map(student => `${student.schoolYear}|${student.studyTerm || "1학기"}`))];
  const [recordGrade = "", recordTerm = ""] = curriculumKeys.length === 1 ? curriculumKeys[0].split("|") : [];
  const filteredUnits = curriculumUnits(recordGrade, recordTerm);
  const unitOptions = filteredUnits.length ? filteredUnits : toList(state.units);
  return `
    <form class="stack desktop-record-form" data-form="record" data-mode="${mode}">
      <div class="between">
        <h2 class="section-title">${mode === "edit" ? "기록 수정" : "일괄 학습기록"}</h2>
        <button type="button" data-action="closeModal">닫기</button>
      </div>
      <div class="badge">${studentIds.map(studentName).join(", ") || "선택 학생 없음"}</div>
      <div class="grid two">
        <label>수업일 <input name="lessonDate" type="date" value="${record.lessonDate || modal?.lessonDate || todayIso()}" required /></label>
        <label>수업 구분 <select name="lessonType">${LESSON_TYPES.map(v => `<option ${v === normalizeLessonType(record.lessonType || "정규") ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      </div>
      <input type="hidden" name="period" value="${escapeHtml(record.period || selectedPeriod)}" />
      ${mode !== "edit" && studentIds.length > 1 ? `<div class="common-record-note"><strong>선택한 ${studentIds.length}명에게 공통으로 적용</strong><span>진도·수업 내용·과제를 한 번만 입력하세요. 학생별로 다른 내용만 아래에서 수정할 수 있습니다.</span></div>` : ""}
      <div class="grid two">
        <label>출석 <select name="attendance">${ATTENDANCE.map(v => `<option ${v === normalizeAttendance(record.attendance || "정시출석") ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>과제수행도 <select name="homework">${HOMEWORK.map(v => `<option ${v === normalizeHomework(record.homework || "완벽") ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      </div>
      <label>수업집중도 <select name="focus"><option value="">선택 안 함</option>${FOCUS_LEVELS.map(v => `<option ${v === record.focus ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <div class="grid two">
        <label>교재명 <select name="material">
          <option value="">선택 안 함</option>
          ${materialOptions.map(v => `<option value="${escapeHtml(v)}" ${v === defaultMaterial ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}
        </select></label>
        <label>교재 직접입력 <input name="materialCustom" value="" placeholder="목록에 없으면 입력" /></label>
      </div>
      <label>단원명 <select name="unit"><option value="">선택 안 함</option>${unitOptions.map(v => `<option value="${escapeHtml(v)}" ${v === record.unit ? "selected" : ""}>${escapeHtml(v.replace(/^\S+\s+/, ""))}</option>`).join("")}</select></label>
      <div class="muted small">${recordGrade ? `${escapeHtml(recordGrade)} · ${escapeHtml(recordTerm)} 단원만 표시됩니다.` : "선택 학생의 학년·학기가 같으면 해당 단원만 표시됩니다."}</div>
      <label>수업 내용 <textarea name="content" data-common-field="content" placeholder="오늘 진행한 내용을 짧게 입력">${escapeHtml(record.content || "")}</textarea></label>
      <label>오늘의 과제 <textarea name="assignment" data-common-field="assignment" placeholder="예: p.28~31 대표유형, 오답노트 3문항">${escapeHtml(record.assignment || "")}</textarea></label>
      <label>학부모님께 드리는 글 <span class="muted small">선택사항 · 짧게 쓰거나 비워두어도 됩니다</span><textarea name="parentMessage" data-common-field="parentMessage" placeholder="특별히 전달할 말이 있을 때만 간단히 입력">${escapeHtml(record.parentMessage || "")}</textarea></label>
      <label>학생에게 보내는 글 <textarea name="studentMessage" data-common-field="studentMessage" placeholder="학생에게 직접 남길 응원이나 안내">${escapeHtml(record.studentMessage || "")}</textarea></label>
      ${renderAiPromptTool(record)}
      <label>리마인드 키워드 <input name="keywords" data-common-field="keywords" value="${escapeHtml(record.keywords || "")}" placeholder="예: 기울기, 일차식, 동류항" /></label>
      <label>테스트 <input name="testName" data-common-field="testName" value="${escapeHtml([record.testName, record.testScore].filter(Boolean).join(" "))}" placeholder="예: Daily Test 12/20 또는 단원평가 85" /></label>
      <input type="hidden" name="testScore" value="" />
      <label>다음 수업 계획 <input name="nextPlan" data-common-field="nextPlan" value="${escapeHtml(record.nextPlan || "")}" /></label>
      ${mode !== "edit" && studentIds.length > 1 ? renderIndividualRecordFields(studentIds, record) : ""}
      <datalist id="materials">${toList(state.materials).map(v => `<option value="${escapeHtml(v)}"></option>`).join("")}</datalist>
      <datalist id="units">${toList(state.units).map(v => `<option value="${escapeHtml(v)}"></option>`).join("")}</datalist>
      <div class="form-actions">
        <button type="button" data-action="closeModal">취소</button>
        <button class="primary" type="submit">저장</button>
      </div>
    </form>
  `;
}

function renderAiPromptTool(record = {}) {
  return `
    <details class="ai-prompt-panel">
      <summary>AI 문장 다듬기</summary>
      <div class="stack">
        <div class="muted small">아래 글을 작성한 뒤 원하는 항목을 누르면 자동 프롬프트와 수정안을 확인할 수 있습니다.</div>
        <div class="toolbar">
          <button type="button" data-action="buildAiPrompt" data-ai-kind="content">수업내용 점검</button>
          <button type="button" data-action="buildAiPrompt" data-ai-kind="assignment">오늘의 과제 점검</button>
          <button type="button" data-action="buildAiPrompt" data-ai-kind="parentMessage">학부모님께 드리는 글 점검</button>
          <button type="button" data-action="buildAiPrompt" data-ai-kind="studentMessage">학생에게 보내는 글 점검</button>
        </div>
        <label>자동 프롬프트
          <textarea data-ai-prompt-output readonly>${escapeHtml(aiPromptText("content", ""))}</textarea>
        </label>
        <label>AI 수정안 확인
          <textarea data-ai-preview-output placeholder="점검 버튼을 누르면 수정안이 여기에 표시됩니다."></textarea>
        </label>
        <input type="hidden" data-ai-target value="content" />
        <div class="form-actions">
          <button type="button" data-action="applyAiSuggestion">수정안 적용</button>
        </div>
      </div>
    </details>
  `;
}

function renderIndividualRecordFields(studentIds, record = {}) {
  return `
    <section class="panel stack">
      <div>
        <strong>학생별 개별 수정</strong>
        <div class="muted small">위의 공통 진도와 과제가 기본으로 들어갑니다. 내용이 다른 학생만 열어서 수정하세요.</div>
      </div>
      ${studentIds.map(studentId => `
        <details class="student-detail">
          <summary>${escapeHtml(studentName(studentId))}</summary>
          <div class="stack">
            <label>수업 내용 <textarea name="content_${studentId}" data-individual-field="content" data-student-id="${studentId}">${escapeHtml(record.content || "")}</textarea></label>
            <label>오늘의 과제 <textarea name="assignment_${studentId}" data-individual-field="assignment" data-student-id="${studentId}">${escapeHtml(record.assignment || "")}</textarea></label>
            <label>학부모님께 드리는 글 <textarea name="parentMessage_${studentId}" data-individual-field="parentMessage" data-student-id="${studentId}">${escapeHtml(record.parentMessage || "")}</textarea></label>
            <label>학생에게 보내는 글 <textarea name="studentMessage_${studentId}" data-individual-field="studentMessage" data-student-id="${studentId}">${escapeHtml(record.studentMessage || "")}</textarea></label>
            <label>리마인드 키워드 <input name="keywords_${studentId}" data-individual-field="keywords" data-student-id="${studentId}" value="${escapeHtml(record.keywords || "")}" /></label>
            <label>테스트 <input name="testName_${studentId}" data-individual-field="testName" data-student-id="${studentId}" value="${escapeHtml([record.testName, record.testScore].filter(Boolean).join(" "))}" /></label>
            <label>다음 수업 계획 <input name="nextPlan_${studentId}" data-individual-field="nextPlan" data-student-id="${studentId}" value="${escapeHtml(record.nextPlan || "")}" /></label>
          </div>
        </details>
      `).join("")}
    </section>
  `;
}

function renderQuickRecordModal() {
  const query = modal.query || "";
  const lessonDate = modal.lessonDate || todayIso();
  const found = toList(state.students).filter(s => s.active && (`${s.name} ${s.loginId} ${s.phone}`).includes(query)).slice(0, 12);
  return `
    <div class="stack">
      <div class="between">
        <h2 class="section-title">학생 검색 작성</h2>
        <button data-action="closeModal">닫기</button>
      </div>
      <div class="between">
        <div class="muted small">학생을 여러 명 눌러 선택한 뒤 함께 기록할 수 있어요.</div>
        <span class="badge">${selectedStudents.size}명 선택됨</span>
      </div>
      <label>수업 날짜 <input type="date" data-action="selectQuickRecordDate" value="${lessonDate}" max="${todayIso()}" /></label>
      <input data-action="searchStudent" value="${escapeHtml(query)}" placeholder="학생 이름, 아이디, 전화번호로 검색" autofocus />
      <div class="student-picker">
        ${found.map(s => `<button class="student-button ${selectedStudents.has(s.id) ? "selected" : ""}" data-action="pickQuickStudent" data-id="${s.id}">${escapeHtml(s.name)}<span>${escapeHtml(s.loginId)}</span></button>`).join("")}
      </div>
      <div class="form-actions">
        <button data-action="clearQuickSelection" ${selectedStudents.size ? "" : "disabled"}>선택 해제</button>
        <button class="primary" data-action="openQuickSelectedRecord" ${selectedStudents.size ? "" : "disabled"}>선택 학생 ${selectedStudents.size}명 기록 작성</button>
      </div>
    </div>
  `;
}

function renderAiAssistModal() {
  return `
    <div class="stack">
      <div class="between">
        <h2 class="section-title">AI 문장 다듬기</h2>
        <button type="button" data-action="closeModal">닫기</button>
      </div>
      <div class="empty">
        실제 AI 연결은 배포 후 서버/API 연결 단계에서 붙입니다.<br />
        흐름은 원문 작성 → AI 다듬기 → 미리보기 → 적용 또는 원문 유지로 진행할 예정입니다.
      </div>
      <label>다시 요청할 내용
        <textarea placeholder="예: 더 짧게, 학부모용으로 부드럽게, 과제 부분 강조"></textarea>
      </label>
      <div class="form-actions">
        <button type="button" data-action="closeModal">원문 유지</button>
        <button type="button" class="primary" data-action="closeModal">확인</button>
      </div>
    </div>
  `;
}

function renderStudentForm(student = null) {
  const slots = student ? toList(state.schedules).filter(item => item.studentId === student.id).map(item => ({ day: item.day, period: item.period })) : toList(modal.scheduleSlots);
  const existingSchedules = student ? toList(state.schedules).filter(item => item.studentId === student.id) : [];
  const teacherIds = [...new Set(existingSchedules.flatMap(item => toList(item.teacherIds)))];
  const selectedMaterials = student ? (toList(student.materials).length ? student.materials : [student.currentMaterial].filter(Boolean)) : [];
  return `
    <form class="stack" data-form="${student ? "studentEdit" : "student"}">
      <div class="between"><h2 class="section-title">${student ? "학생 수정" : "학생 등록"}</h2><button type="button" data-action="closeModal">닫기</button></div>
      ${student ? `<input type="hidden" name="id" value="${student.id}" />` : ""}
      <div class="grid two">
        <label>이름 <input name="name" value="${escapeHtml(student?.name || "")}" required /></label>
        <label>생일 4자리 <input name="birthday4" maxlength="4" placeholder="0315" value="${escapeHtml(student?.birthday4 || "")}" required /></label>
      </div>
      <label>학년
        <div class="grade-grid">
          ${GRADES.map(grade => `<button type="button" class="${student?.schoolYear === grade ? "selected" : ""}" data-action="pickGrade" data-grade="${grade}">${grade}</button>`).join("")}
        </div>
        <input type="hidden" name="schoolYear" value="${escapeHtml(student?.schoolYear || "")}" />
      </label>
      <label>전화번호 <input name="phone" data-phone inputmode="numeric" maxlength="13" placeholder="010-0000-0000" value="${escapeHtml(student?.phone || "")}" required /></label>
      <label>로그인 아이디 <input name="loginId" value="${escapeHtml(student?.loginId || "")}" placeholder="비워두면 이름+생일4자리 자동 생성" /></label>
      <label>비밀번호 <input name="password" value="${escapeHtml(student?.password || "")}" placeholder="비워두면 전화번호 뒤 4자리" /></label>
      <section class="panel stack curriculum-setup">
        <div><strong>학습 교재와 교육과정</strong><div class="muted small">교재를 여러 권 체크할 수 있습니다.</div></div>
        <div class="grid two">
          <label>학기 <select name="studyTerm">${TERMS.map(term => `<option ${term === (student?.studyTerm || "1학기") ? "selected" : ""}>${term}</option>`).join("")}</select></label>
          <div><span class="field-title">교재 다중 선택</span><div class="material-check-grid">${toList(state.materials).map(v => `<label><input type="checkbox" name="materials" value="${escapeHtml(v)}" ${selectedMaterials.includes(v) ? "checked" : ""} />${escapeHtml(v)}</label>`).join("")}</div></div>
        </div>
        <div class="muted small">학년은 위에서 선택합니다. 학습기록 작성 시 해당 학년·학기의 단원만 검색됩니다.</div>
      </section>
      <section class="panel stack"><div><strong>정규 수업 시간표</strong><div class="muted small">학생 등록과 동시에 요일과 교시를 선택합니다.</div></div>
        <div class="weekly-period-grid">${DAYS.map(day => `<div class="day-column"><div class="day-title">${day}</div>${periodOptions().map(period => `<button type="button" class="${slots.some(slot => slot.day === day && slot.period === period) ? "selected" : ""}" data-action="pickStudentFormSlot" data-day="${day}" data-period-name="${escapeHtml(period)}">${escapeHtml(period)}</button>`).join("")}</div>`).join("")}</div>
        <input type="hidden" name="slots" value="${escapeHtml(JSON.stringify(slots))}" />
        <label>담당 선생님 <select name="teacherIds" multiple size="4">${toList(state.teachers).filter(t => t.active).map(t => `<option value="${t.id}" ${teacherIds.includes(t.id) ? "selected" : ""}>${escapeHtml(t.name)}</option>`).join("")}</select></label>
      </section>
      <div class="form-actions"><button type="button" data-action="closeModal">취소</button><button class="primary" type="submit">${student ? "저장" : "등록"}</button></div>
    </form>
  `;
}

function renderAcademicEventList() {
  const events = [...toList(state.academicEvents)].sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (!events.length) return `<div class="empty">등록된 학사일정이 없습니다.</div>`;
  return `<div class="list">${events.map(item => `<div class="between event-card"><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.startDate)}${item.endDate !== item.startDate ? ` ~ ${escapeHtml(item.endDate)}` : ""} · ${escapeHtml(item.type)} · ${escapeHtml(item.visibility)}</span></div><button class="danger" data-action="deleteAcademicEvent" data-id="${item.id}">삭제</button></div>`).join("")}</div>`;
}

function renderAcademicEventForm() {
  return `<form class="stack" data-form="academicEvent"><div class="between"><h2 class="section-title">학사일정 등록</h2><button type="button" data-action="closeModal">닫기</button></div>
    <label>일정명 <input name="title" placeholder="예: 여름방학, 중간고사 대비" required /></label>
    <div class="grid two"><label>시작일 <input type="date" name="startDate" value="${todayIso()}" required /></label><label>종료일 <input type="date" name="endDate" value="${todayIso()}" required /></label></div>
    <div class="grid two"><label>구분 <select name="type"><option>휴원</option><option>공휴일</option><option>시험</option><option>특강</option><option>안내</option></select></label><label>공개 <select name="visibility"><option>전체</option><option>내부</option></select></label></div>
    <label>메모 <textarea name="note" placeholder="필요한 안내만 간단히 입력"></textarea></label>
    <div class="form-actions"><button type="button" data-action="closeModal">취소</button><button class="primary" type="submit">등록</button></div></form>`;
}

function renderTeacherForm(teacher = null) {
  return `
    <form class="stack" data-form="${teacher ? "teacherEdit" : "teacher"}">
      <div class="between"><h2 class="section-title">${teacher ? "강사 수정" : "강사 등록"}</h2><button type="button" data-action="closeModal">닫기</button></div>
      ${teacher ? `<input type="hidden" name="id" value="${teacher.id}" />` : ""}
      <div class="grid two">
        <label>표시 이름 <input name="name" value="${escapeHtml(teacher?.name || "")}" required /></label>
        <label>로그인 아이디 <input name="loginId" value="${escapeHtml(teacher?.loginId || "")}" required /></label>
      </div>
      <label>전화번호 <input name="phone" data-phone inputmode="numeric" maxlength="13" placeholder="010-0000-0000" value="${escapeHtml(teacher?.phone || "")}" required /></label>
      <label>권한 <select name="role"><option value="teacher" ${teacher?.role === "teacher" ? "selected" : ""}>강사</option><option value="deputy" ${teacher?.role === "deputy" ? "selected" : ""}>부원장</option><option value="admin" ${teacher?.role === "admin" ? "selected" : ""}>관리자</option></select></label>
      <label>비밀번호 <input name="password" value="${escapeHtml(teacher?.password || "")}" placeholder="비워두면 전화번호 뒤 4자리" /></label>
      <div class="muted small">신규 강사의 초기 비밀번호는 전화번호 뒤 4자리로 자동 등록됩니다.</div>
      <div class="form-actions"><button type="button" data-action="closeModal">취소</button><button class="primary" type="submit">${teacher ? "저장" : "등록"}</button></div>
    </form>
  `;
}

function renderPeriodTable() {
  const periods = toList(state.periods);
  if (!periods.length) return `<div class="empty">등록된 교시가 없습니다. 교시를 추가해주세요.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>교시</th><th>시간</th><th></th></tr></thead>
        <tbody>${periods.map(p => `
          <tr>
            <td>${escapeHtml(p.name)} ${!p.active ? `<span class="badge bad">숨김</span>` : ""}</td>
            <td>${escapeHtml([p.startTime, p.endTime].filter(Boolean).join(" ~ ") || "시간 미지정")}</td>
            <td class="toolbar">
              <button data-action="togglePeriod" data-id="${p.id}">${p.active ? "숨김" : "복구"}</button>
              <button class="danger" data-action="deletePeriod" data-id="${p.id}">삭제</button>
            </td>
          </tr>
        `).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderPeriodManager() {
  return `
    <div class="stack">
      <div class="between">
        <h2 class="section-title">교시/시간 관리</h2>
        <button type="button" data-action="closeModal">닫기</button>
      </div>
      ${renderPeriodTable()}
      ${renderPeriodForm(true)}
    </div>
  `;
}

function renderPeriodForm(compact = false) {
  return `
    <form class="stack" data-form="period">
      <div class="between">
        <h2 class="section-title">교시/시간 생성</h2>
        ${compact ? "" : `<button type="button" data-action="closeModal">닫기</button>`}
      </div>
      <div class="grid three">
        <label>교시 이름 <input name="name" placeholder="예: 7교시 또는 토요보충" required /></label>
        <label>시작 시간 <input name="startTime" type="time" /></label>
        <label>종료 시간 <input name="endTime" type="time" /></label>
      </div>
      <div class="form-actions"><button type="button" data-action="closeModal">취소</button><button class="primary" type="submit">생성</button></div>
    </form>
  `;
}

function renderScheduleForm() {
  const selectedSlots = toList(modal.scheduleSlots);
  const activeStudents = toList(state.students).filter(s => s.active);
  const selectedStudentIds = toList(modal.scheduleStudentIds);
  const selectedStudentSchedules = toList(state.schedules).filter(schedule => selectedStudentIds.includes(schedule.studentId));
  return `
    <form class="stack" data-form="schedule">
      <div class="between"><h2 class="section-title">시간표 배정</h2><button type="button" data-action="closeModal">닫기</button></div>
      <label>학생 중복 선택
        <div class="student-picker">
          ${activeStudents.map(student => `<button type="button" class="student-button ${selectedStudentIds.includes(student.id) ? "selected" : ""}" data-action="pickScheduleStudent" data-id="${student.id}">${escapeHtml(student.name)}<span>${escapeHtml(student.schoolYear || student.loginId)}</span></button>`).join("")}
        </div>
        <input type="hidden" name="studentIds" value="${escapeHtml(JSON.stringify(selectedStudentIds))}" />
      </label>
      <div class="panel stack">
        <strong>이미 배정된 시간</strong>
        <div data-selected-schedules>
        ${selectedStudentSchedules.length ? `
          <div class="list">
            ${selectedStudentSchedules.map(schedule => `
              <div class="between">
                <span>${escapeHtml(studentName(schedule.studentId))} · ${escapeHtml(schedule.day)} · ${escapeHtml(schedule.period)} · ${escapeHtml(schedule.lessonType || "정규")} · ${toList(schedule.teacherIds).map(teacherName).join(", ")}</span>
                <span class="toolbar">
                  <button type="button" data-action="editSchedule" data-id="${schedule.id}">수정</button>
                  <button type="button" class="danger" data-action="deleteSchedule" data-id="${schedule.id}">삭제</button>
                </span>
              </div>
            `).join("")}
          </div>
        ` : `<div class="empty">선택한 학생의 배정 시간이 없습니다.</div>`}
        </div>
      </div>
      <label>요일별 교시
        <div class="weekly-period-grid">
          ${DAYS.map(day => `
            <div class="day-column">
              <div class="day-title">${day}</div>
              ${periodOptions().map(period => `
                <button
                  type="button"
                  class="${selectedSlots.some(slot => slot.day === day && slot.period === period) ? "selected" : ""}"
                  data-action="pickScheduleSlot"
                  data-day="${day}"
                  data-period-name="${escapeHtml(period)}"
                >${escapeHtml(period)}</button>
              `).join("")}
            </div>
          `).join("")}
        </div>
        <input type="hidden" name="slots" value="${escapeHtml(JSON.stringify(selectedSlots))}" />
      </label>
      <label>수업 구분 <select name="lessonType">${LESSON_TYPES.map(v => `<option>${v}</option>`).join("")}</select></label>
      <label>담당 선생님 복수 선택
        <select name="teacherIds" multiple size="5">
          ${toList(state.teachers).filter(t => t.active && ["teacher", "admin", "deputy"].includes(t.role)).map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("")}
        </select>
      </label>
      <div class="form-actions"><button type="button" data-action="closeModal">취소</button><button class="primary" type="submit">배정</button></div>
    </form>
  `;
}

function renderEditScheduleForm(schedule = {}) {
  const selectedDay = schedule.day || DAYS[0];
  const selectedPeriod = schedule.period || periodOptions()[0];
  return `
    <form class="stack" data-form="scheduleEdit">
      <div class="between">
        <h2 class="section-title">배정 시간 수정</h2>
        <button type="button" data-action="closeModal">닫기</button>
      </div>
      <input type="hidden" name="id" value="${escapeHtml(schedule.id || "")}" />
      <div class="badge">${escapeHtml(studentName(schedule.studentId))}</div>
      <label>요일별 교시
        <div class="weekly-period-grid">
          ${DAYS.map(day => `
            <div class="day-column">
              <div class="day-title">${day}</div>
              ${periodOptions().map(period => `
                <button
                  type="button"
                  class="${day === selectedDay && period === selectedPeriod ? "selected" : ""}"
                  data-action="pickEditScheduleSlot"
                  data-day="${day}"
                  data-period-name="${escapeHtml(period)}"
                >${escapeHtml(period)}</button>
              `).join("")}
            </div>
          `).join("")}
        </div>
        <input type="hidden" name="day" value="${escapeHtml(selectedDay)}" />
        <input type="hidden" name="period" value="${escapeHtml(selectedPeriod)}" />
      </label>
      <label>수업 구분 <select name="lessonType">${LESSON_TYPES.map(v => `<option ${v === (schedule.lessonType || "정규") ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>담당 선생님 복수 선택
        <select name="teacherIds" multiple size="5">
          ${toList(state.teachers).filter(t => t.active && ["teacher", "admin", "deputy"].includes(t.role)).map(t => `<option value="${t.id}" ${toList(schedule.teacherIds).includes(t.id) ? "selected" : ""}>${escapeHtml(t.name)}</option>`).join("")}
        </select>
      </label>
      <div class="form-actions">
        <button type="button" data-action="closeModal">취소</button>
        <button class="primary" type="submit">저장</button>
      </div>
    </form>
  `;
}

function bindRouteEvents() {
  ensureGlobalListeners();
}

function handleGlobalClick(event) {
  const routeButton = event.target.closest("button[data-route]");
  if (routeButton) {
    event.preventDefault();
    route = routeButton.dataset.route;
    render();
    return;
  }

  const periodButton = event.target.closest("button[data-period]");
  if (periodButton) {
    event.preventDefault();
    selectedPeriod = periodButton.dataset.period;
    selectedStudents.clear();
    render();
    return;
  }

  const studentButton = event.target.closest("button[data-student]");
  if (studentButton) {
    event.preventDefault();
    const sid = studentButton.dataset.student;
    selectedStudents.has(sid) ? selectedStudents.delete(sid) : selectedStudents.add(sid);
    render();
    return;
  }

  const actionButton = event.target.closest("button[data-action]");
  if (actionButton) {
    if (actionButton.getAttribute("type") === "submit") return;
    event.preventDefault();
    const nonRenderingAction = handleNonRenderingAction(actionButton);
    if (nonRenderingAction) return;
    handleAction({ currentTarget: actionButton });
  }
}

function handleNonRenderingAction(button) {
  const action = button.dataset.action;
  if (action === "exportData") {
    exportData();
    return true;
  }

  if (action === "importData") {
    document.getElementById("dataImportInput")?.click();
    return true;
  }

  if (action === "buildAiPrompt") {
    buildAiPrompt(button);
    return true;
  }

  if (action === "applyAiSuggestion") {
    applyAiSuggestion(button);
    return true;
  }

  if (action === "pickGrade") {
    const form = button.closest("form");
    form.querySelectorAll("[data-action='pickGrade']").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
    form.elements.schoolYear.value = button.dataset.grade;
    return true;
  }

  if (action === "pickStudentFormSlot") {
    const form = button.closest("form");
    let slots = [];
    try { slots = JSON.parse(form.elements.slots.value || "[]"); } catch { slots = []; }
    const exists = slots.some(slot => slot.day === button.dataset.day && slot.period === button.dataset.periodName);
    slots = exists ? slots.filter(slot => !(slot.day === button.dataset.day && slot.period === button.dataset.periodName)) : [...slots, { day: button.dataset.day, period: button.dataset.periodName }];
    form.elements.slots.value = JSON.stringify(slots);
    button.classList.toggle("selected");
    return true;
  }

  if (action === "pickScheduleStudent") {
    const studentId = button.dataset.id;
    const selected = new Set(toList(modal.scheduleStudentIds));
    selected.has(studentId) ? selected.delete(studentId) : selected.add(studentId);
    modal.scheduleStudentIds = Array.from(selected);
    button.classList.toggle("selected");
    const form = button.closest("form");
    form.elements.studentIds.value = JSON.stringify(modal.scheduleStudentIds);
    updateSelectedScheduleList(form);
    return true;
  }

  if (action === "pickScheduleSlot") {
    const day = button.dataset.day;
    const period = button.dataset.periodName;
    const slots = toList(modal.scheduleSlots);
    const exists = slots.some(slot => slot.day === day && slot.period === period);
    modal.scheduleSlots = exists
      ? slots.filter(slot => !(slot.day === day && slot.period === period))
      : [...slots, { day, period }];
    button.classList.toggle("selected");
    const form = button.closest("form");
    form.elements.slots.value = JSON.stringify(modal.scheduleSlots);
    return true;
  }

  if (action === "pickEditScheduleSlot") {
    const form = button.closest("form");
    form.querySelectorAll("[data-action='pickEditScheduleSlot']").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
    form.elements.day.value = button.dataset.day;
    form.elements.period.value = button.dataset.periodName;
    return true;
  }

  return false;
}

function updateSelectedScheduleList(form) {
  const target = form.querySelector("[data-selected-schedules]");
  if (!target) return;
  const selectedStudentIds = toList(modal.scheduleStudentIds);
  const schedules = toList(state.schedules).filter(schedule => selectedStudentIds.includes(schedule.studentId));
  target.innerHTML = schedules.length ? `
    <div class="list">
      ${schedules.map(schedule => `
        <div class="between">
          <span>${escapeHtml(studentName(schedule.studentId))} · ${escapeHtml(schedule.day)} · ${escapeHtml(schedule.period)} · ${escapeHtml(schedule.lessonType || "정규")} · ${toList(schedule.teacherIds).map(teacherName).join(", ")}</span>
          <span class="toolbar">
            <button type="button" data-action="editSchedule" data-id="${schedule.id}">수정</button>
            <button type="button" class="danger" data-action="deleteSchedule" data-id="${schedule.id}">삭제</button>
          </span>
        </div>
      `).join("")}
    </div>
  ` : `<div class="empty">선택한 학생의 배정 시간이 없습니다.</div>`;
}

function buildAiPrompt(button) {
  const form = button.closest("form");
  const output = form?.querySelector("[data-ai-prompt-output]");
  const preview = form?.querySelector("[data-ai-preview-output]");
  const target = form?.querySelector("[data-ai-target]");
  if (!form || !output || !preview || !target) return;
  const kind = button.dataset.aiKind;
  const data = Object.fromEntries(new FormData(form).entries());
  const source = data[kind] || "";
  output.value = aiPromptText(kind, source);
  preview.value = buildAiSuggestion(kind, source);
  target.value = kind;
  preview.focus();
  preview.setSelectionRange(preview.value.length, preview.value.length);
}

function applyAiSuggestion(button) {
  const form = button.closest("form");
  const preview = form?.querySelector("[data-ai-preview-output]");
  const target = form?.querySelector("[data-ai-target]")?.value;
  if (!form || !preview || !target || !form.elements[target]) return;
  if (!preview.value.trim()) {
    showMessage("먼저 점검할 항목을 선택해주세요.");
    return;
  }
  form.elements[target].value = preview.value.trim();
  form.elements[target].dispatchEvent(new Event("input", { bubbles: true }));
}

function aiPromptText(kind, source = "") {
  const subject = aiPromptSubject(kind);
  return [
    "역할: 수학학원 학습 알림장을 작성하는 선생님",
    `작성 대상: ${subject.title}`,
    `요청: ${subject.instruction}`,
    "조건: 과장하지 말고, 한글 맞춤법을 자연스럽게 고치고, 2~4문장으로 작성해주세요.",
    "원문:",
    source || "(작성한 글이 여기에 자동으로 들어갑니다.)"
  ].join("\n");
}

function aiPromptSubject(kind) {
  return {
    content: {
      title: "수업내용",
      instruction: "학부모가 읽기 좋은 알림장 문장으로, 오늘 배운 개념과 학생의 학습 태도가 자연스럽게 드러나게 다듬어주세요."
    },
    assignment: {
      title: "오늘의 과제",
      instruction: "학생이 해야 할 과제를 명확하고 간결하게 정리하고, 학부모가 확인할 수 있는 문장으로 다듬어주세요."
    },
    parentMessage: {
      title: "학부모님께 드리는 글",
      instruction: "학부모님께 전달하는 정중하고 따뜻한 문장으로 다듬어주세요. 걱정 표현은 부드럽게, 필요한 협조 사항은 구체적으로 써주세요."
    },
    studentMessage: {
      title: "학생에게 보내는 글",
      instruction: "학생에게 직접 전하는 짧고 따뜻한 격려 문장으로 다듬어주세요. 다음 행동이 분명하게 느껴지면 좋겠습니다."
    }
  }[kind] || {
    title: "알림장 문장",
    instruction: "읽기 좋은 알림장 문장으로 다듬어주세요."
  };
}

function buildAiSuggestion(kind, source = "") {
  const text = source.trim();
  if (!text) return "먼저 해당 입력칸에 원문을 작성한 뒤 다시 점검해주세요.";
  const clean = text
    .replace(/\s+/g, " ")
    .replace(/\s*([,.!?])\s*/g, "$1 ")
    .trim();
  if (kind === "content") {
    return `오늘 수업에서는 ${clean} 내용을 중심으로 학습했습니다. 핵심 개념을 다시 확인하며 문제 적용까지 차근차근 이어갈 수 있도록 지도했습니다.`;
  }
  if (kind === "assignment") {
    return `오늘의 과제는 ${clean}입니다. 풀이 과정과 오답을 함께 확인하며 마무리할 수 있도록 가정에서도 한 번 살펴봐 주세요.`;
  }
  if (kind === "parentMessage") {
    return `${clean} 앞으로도 학생의 이해도와 학습 흐름을 세심하게 확인하며 지도하겠습니다. 가정에서도 따뜻한 격려 부탁드립니다.`;
  }
  if (kind === "studentMessage") {
    return `${clean} 오늘 배운 내용을 한 번 더 떠올리며 과제까지 차분히 마무리해보자. 지금처럼 꾸준히 이어가면 충분히 좋아질 수 있어.`;
  }
  return clean;
}

function handleGlobalSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  handleForm(form);
}

function handleGlobalInput(event) {
  const phoneInput = event.target.closest("input[data-phone]");
  if (phoneInput) {
    phoneInput.value = formatPhone(phoneInput.value);
  }

  const importFile = event.target.closest("input[data-action='loadBackupFile']");
  if (importFile) {
    importBackupFile(importFile.files?.[0]);
    importFile.value = "";
    return;
  }

  const individualField = event.target.closest("[data-individual-field]");
  if (individualField) {
    individualField.dataset.dirty = "true";
  }

  const commonField = event.target.closest("[data-common-field]");
  if (commonField) {
    const field = commonField.dataset.commonField;
    document.querySelectorAll(`[data-individual-field="${field}"]`).forEach(input => {
      if (input.dataset.dirty === "true") return;
      input.value = commonField.value;
    });
  }

  const scheduleStudent = event.target.closest("select[data-action='pickScheduleStudent']");
  if (scheduleStudent) {
    modal.scheduleStudentId = scheduleStudent.value;
    render();
    return;
  }

  const quickDate = event.target.closest("input[data-action='selectQuickRecordDate']");
  if (quickDate) {
    modal.lessonDate = quickDate.value || todayIso();
    return;
  }

  const search = event.target.closest("input[data-action='searchStudent'], input[data-action='searchCalendarStudent']");
  if (!search) return;
  if (event.isComposing || event.inputType === "insertCompositionText") return;
  const searchAction = search.dataset.action;
  modal.query = search.value.trim();
  clearTimeout(searchRenderTimer);
  searchRenderTimer = setTimeout(() => {
    render();
    const nextSearch = document.querySelector(`input[data-action='${searchAction}']`);
    if (nextSearch) {
      nextSearch.focus();
      nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
    }
  }, 450);
}

function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  const idValue = event.currentTarget.dataset.id;
  if (action === "logout") {
    logout();
    return;
  }
  if (action === "closeModal") modal = null;
  if (action === "selectAllPeriod") {
    toList(state.schedules)
      .filter(s => s.day === todayDay() && s.period === selectedPeriod && toList(s.teacherIds).includes(session.id))
      .forEach(s => selectedStudents.add(s.studentId));
  }
  if (action === "clearSelection") selectedStudents.clear();
  if (action === "openBulkRecord") modal = { type: "bulkRecord" };
  if (action === "openQuickRecord") { selectedStudents.clear(); modal = { type: "quickRecord", query: "", lessonDate: todayIso() }; }
  if (action === "openAiAssist") modal = { type: "aiAssist" };
  if (action === "pickQuickStudent") {
    selectedStudents.has(idValue) ? selectedStudents.delete(idValue) : selectedStudents.add(idValue);
  }
  if (action === "clearQuickSelection") selectedStudents.clear();
  if (action === "openQuickSelectedRecord" && selectedStudents.size) modal = { type: "bulkRecord", lessonDate: modal.lessonDate || todayIso() };
  if (action === "editRecord") modal = { type: "editRecord", recordId: idValue };
  if (action === "openStudentForm") modal = { type: "studentForm", scheduleSlots: [] };
  if (action === "editStudent") modal = { type: "editStudentForm", studentId: idValue, scheduleSlots: [] };
  if (action === "openTeacherForm") modal = { type: "teacherForm" };
  if (action === "editTeacher") modal = { type: "editTeacherForm", teacherId: idValue };
  if (action === "openPeriodManager") modal = { type: "periodManager" };
  if (action === "openPeriodForm") modal = { type: "periodForm" };
  if (action === "openScheduleForm") modal = { type: "scheduleForm", scheduleSlots: [], scheduleStudentIds: [] };
  if (action === "openAcademicEventForm") modal = { type: "academicEventForm" };
  if (action === "deleteAcademicEvent") state.academicEvents = toList(state.academicEvents).filter(item => item.id !== idValue);
  if (action === "moveCalendarMonth") calendarMonth = moveMonth(calendarMonth, Number(event.currentTarget.dataset.delta));
  if (action === "goCalendarToday") calendarMonth = todayIso().slice(0, 7);
  if (action === "openCalendarDay") {
    if (canTeacher()) selectedStudents.clear();
    modal = { type: "calendarDay", date: event.currentTarget.dataset.date, studentId: event.currentTarget.dataset.studentId || "", query: "" };
  }
  if (action === "pickCalendarStudent") {
    selectedStudents.has(idValue) ? selectedStudents.delete(idValue) : selectedStudents.add(idValue);
  }
  if (action === "selectCalendarScheduled") {
    String(event.currentTarget.dataset.ids || "").split(",").filter(Boolean).forEach(studentId => selectedStudents.add(studentId));
  }
  if (action === "openCalendarRecord" && selectedStudents.size) modal = { type: "bulkRecord", lessonDate: modal.date };
  if (action === "editSchedule") modal = { type: "editScheduleForm", scheduleId: idValue };
  if (action === "pickScheduleDay") modal.scheduleDay = event.currentTarget.dataset.value;
  if (action === "pickSchedulePeriod") modal.schedulePeriod = event.currentTarget.dataset.value;
  if (action === "pickScheduleSlot") {
    const day = event.currentTarget.dataset.day;
    const period = event.currentTarget.dataset.periodName;
    const slots = toList(modal.scheduleSlots);
    const exists = slots.some(slot => slot.day === day && slot.period === period);
    modal.scheduleSlots = exists
      ? slots.filter(slot => !(slot.day === day && slot.period === period))
      : [...slots, { day, period }];
  }
  if (action === "pickEditScheduleSlot") {
    const schedule = toList(state.schedules).find(item => item.id === modal.scheduleId);
    if (schedule) {
      schedule.day = event.currentTarget.dataset.day;
      schedule.period = event.currentTarget.dataset.periodName;
    }
  }
  if (action === "confirmRecord") confirmRecord(idValue);
  if (action === "confirmAssignment") confirmAssignment(idValue);
  if (action === "toggleKeyword") toggleKeyword(idValue, event.currentTarget.dataset.keyword);
  if (action === "moveStudentDate") {
    const records = toList(state.records).filter(r => toList(r.studentIds).includes(session.id) && !r.hidden);
    studentViewDate = moveToRecordDate(records, Number(event.currentTarget.dataset.days || 0));
  }
  if (action === "goToday") studentViewDate = todayIso();
  if (action === "toggleRecordHidden") toggleRecordHidden(idValue);
  if (action === "resetTeacherPassword") resetTeacherPassword(idValue);
  if (action === "toggleStudent") toggleActive("students", idValue);
  if (action === "toggleTeacher") toggleActive("teachers", idValue);
  if (action === "togglePeriod") toggleActive("periods", idValue);
  if (action === "deletePeriod") deletePeriod(idValue);
  if (action === "deleteSchedule") deleteSchedule(idValue);
  saveState();
  render();
}

function exportData() {
  const payload = {
    app: "eagle-math-app",
    exportedAt: new Date().toISOString(),
    version: 1,
    state: normalizeState(JSON.parse(JSON.stringify(state)))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `eagle-math-backup-${todayIso()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function importBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const nextState = parsed?.state || parsed;
      if (!nextState || typeof nextState !== "object") throw new Error("invalid");
      if (!window.confirm("현재 브라우저에 저장된 데이터를 백업 파일 내용으로 바꿀까요?")) return;
      state = normalizeState(nextState);
      selectedStudents.clear();
      modal = null;
      saveState();
      render();
      showMessage("데이터 복원이 완료되었습니다.");
    } catch {
      showMessage("백업 파일을 읽지 못했습니다. JSON 파일인지 확인해주세요.");
    }
  };
  reader.readAsText(file);
}

function handleForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  let result;
  if (form.dataset.form === "record") result = saveRecord(form.dataset.mode, data);
  if (form.dataset.form === "student") result = addStudent(form, data);
  if (form.dataset.form === "studentEdit") result = updateStudent(form, data);
  if (form.dataset.form === "teacher") result = addTeacher(data);
  if (form.dataset.form === "teacherEdit") result = updateTeacher(data);
  if (form.dataset.form === "period") result = addPeriod(data);
  if (form.dataset.form === "schedule") result = addSchedule(form);
  if (form.dataset.form === "scheduleEdit") result = updateSchedule(form);
  if (form.dataset.form === "academicEvent") result = addAcademicEvent(data);
  if (form.dataset.form === "changePassword") result = changePassword(data);
  if (result === false) return;
  saveState();
  modal = null;
  render();
}

function saveRecord(mode, data) {
  const now = new Date().toISOString();
  const material = data.materialCustom?.trim() || data.material?.trim() || "";
  const unit = data.unit?.trim() || "";
  delete data.materialCustom;
  state.materials = toList(state.materials);
  state.units = toList(state.units);
  if (material && !state.materials.includes(material)) state.materials.push(material);
  if (unit && !state.units.includes(unit)) state.units.push(unit);
  if (mode === "edit") {
    const record = toList(state.records).find(r => r.id === modal.recordId);
    if (!record) return;
    Object.assign(record, data, {
      material, unit,
      updatedBy: session.id,
      updatedAt: now,
      version: record.version + 1
    });
    state.confirmations = toList(state.confirmations).filter(c => c.recordId !== record.id);
    if (material) toList(record.studentIds).forEach(studentId => {
      const student = state.students.find(item => item.id === studentId);
      if (student) {
        student.currentMaterial = material;
        student.materials = [...new Set([...toList(student.materials), material])];
      }
    });
    return;
  }
  const studentIds = Array.from(selectedStudents);
  if (!studentIds.length) return;
  state.records = toList(state.records);
  studentIds.forEach(studentId => {
    state.records.push({
      id: id("rec"),
      studentIds: [studentId],
      ...data,
      content: data[`content_${studentId}`] ?? data.content,
      assignment: data[`assignment_${studentId}`] ?? data.assignment,
      parentMessage: data[`parentMessage_${studentId}`] ?? data.parentMessage,
      studentMessage: data[`studentMessage_${studentId}`] ?? data.studentMessage,
      keywords: data[`keywords_${studentId}`] ?? data.keywords,
      testName: data[`testName_${studentId}`] ?? data.testName,
      nextPlan: data[`nextPlan_${studentId}`] ?? data.nextPlan,
      testScore: "",
      material,
      unit,
      createdBy: session.id,
      updatedBy: session.id,
      createdAt: now,
      updatedAt: now,
      version: 1,
      hidden: false,
      hiddenBy: null,
      hiddenAt: null
    });
    if (material) {
      const student = state.students.find(item => item.id === studentId);
      if (student) {
        student.currentMaterial = material;
        student.materials = [...new Set([...toList(student.materials), material])];
      }
    }
  });
  selectedStudents.clear();
}

function readStudentScheduleForm(form) {
  let slots = [];
  try { slots = JSON.parse(new FormData(form).get("slots") || "[]"); } catch { slots = []; }
  const teacherIds = Array.from(form.elements.teacherIds.selectedOptions).map(option => option.value);
  if (slots.length && !teacherIds.length) {
    showMessage("시간표를 선택했다면 담당 선생님도 선택해주세요.");
    return null;
  }
  return { slots, teacherIds };
}

function readStudentMaterials(form) {
  return [...new Set(new FormData(form).getAll("materials").map(value => String(value).trim()).filter(Boolean))];
}

function syncStudentSchedules(studentId, scheduleData) {
  state.schedules = toList(state.schedules).filter(item => item.studentId !== studentId);
  scheduleData.slots.forEach(slot => state.schedules.push({ id: id("sch"), studentId, day: slot.day, period: slot.period, teacherIds: scheduleData.teacherIds, lessonType: "정규" }));
}

function addStudent(form, data) {
  const scheduleData = readStudentScheduleForm(form);
  if (!scheduleData) return false;
  const materials = readStudentMaterials(form);
  const phone = formatPhone(data.phone);
  if (!isValidPhone(phone)) {
    showMessage("전화번호는 010-0000-0000 형식으로 입력해주세요.");
    return false;
  }
  const tail = phoneTail(phone);
  const base = `${data.name.trim()}${data.birthday4.trim()}`;
  let loginId = data.loginId?.trim() || base;
  let count = 2;
  state.students = toList(state.students);
  while (state.students.some(s => s.loginId === loginId)) {
    loginId = `${base}-${count++}`;
  }
  if (toList(state.teachers).some(t => t.loginId === loginId)) {
    showMessage("같은 아이디를 쓰는 강사가 있습니다. 로그인 아이디를 직접 입력해주세요.");
    return false;
  }
  const studentId = id("s");
  state.students.push({
    id: studentId,
    name: data.name.trim(),
    birthday4: data.birthday4.trim(),
    schoolYear: data.schoolYear?.trim() || "",
    phone,
    loginId,
    password: data.password?.trim() || tail,
    studyTerm: TERMS.includes(data.studyTerm) ? data.studyTerm : "1학기",
    materials,
    currentMaterial: materials[0] || "",
    active: true
  });
  syncStudentSchedules(studentId, scheduleData);
}

function updateStudent(form, data) {
  const scheduleData = readStudentScheduleForm(form);
  if (!scheduleData) return false;
  const materials = readStudentMaterials(form);
  const student = toList(state.students).find(item => item.id === data.id);
  if (!student) return;
  const phone = formatPhone(data.phone);
  if (!isValidPhone(phone)) {
    showMessage("전화번호는 010-0000-0000 형식으로 입력해주세요.");
    return false;
  }
  const tail = phoneTail(phone);
  const loginId = data.loginId?.trim() || `${data.name.trim()}${data.birthday4.trim()}`;
  const duplicateStudent = toList(state.students).some(item => item.id !== student.id && item.loginId === loginId);
  const duplicateTeacher = toList(state.teachers).some(item => item.loginId === loginId);
  if (duplicateStudent || duplicateTeacher) {
    showMessage("이미 사용 중인 로그인 아이디입니다.");
    return false;
  }
  student.name = data.name.trim();
  student.birthday4 = data.birthday4.trim();
  student.schoolYear = data.schoolYear?.trim() || "";
  student.phone = phone;
  student.loginId = loginId;
  student.password = data.password?.trim() || tail;
  student.studyTerm = TERMS.includes(data.studyTerm) ? data.studyTerm : "1학기";
  student.materials = materials;
  student.currentMaterial = materials[0] || "";
  syncStudentSchedules(student.id, scheduleData);
}

function addAcademicEvent(data) {
  if (data.endDate < data.startDate) {
    showMessage("종료일은 시작일보다 빠를 수 없습니다.");
    return false;
  }
  state.academicEvents = toList(state.academicEvents);
  state.academicEvents.push({ id: id("evt"), title: data.title.trim(), startDate: data.startDate, endDate: data.endDate, type: data.type, visibility: data.visibility, note: data.note?.trim() || "" });
}

function addTeacher(data) {
  state.teachers = toList(state.teachers);
  const loginId = data.loginId.trim();
  const phone = formatPhone(data.phone);
  if (!isValidPhone(phone)) {
    showMessage("전화번호는 010-0000-0000 형식으로 입력해주세요.");
    return false;
  }
  if (toList(state.teachers).some(t => t.loginId === loginId) || toList(state.students).some(s => s.loginId === loginId)) {
    showMessage("이미 사용 중인 로그인 아이디입니다.");
    return false;
  }
  state.teachers.push({
    id: id("t"),
    name: data.name.trim(),
    loginId,
    phone,
    password: data.password?.trim() || phoneTail(phone),
    role: data.role,
    mustChangePassword: data.role === "teacher",
    active: true
  });
}

function updateTeacher(data) {
  const teacher = toList(state.teachers).find(item => item.id === data.id);
  if (!teacher) return;
  const loginId = data.loginId.trim();
  const phone = formatPhone(data.phone);
  if (!isValidPhone(phone)) {
    showMessage("전화번호는 010-0000-0000 형식으로 입력해주세요.");
    return false;
  }
  const duplicateTeacher = toList(state.teachers).some(item => item.id !== teacher.id && item.loginId === loginId);
  const duplicateStudent = toList(state.students).some(item => item.loginId === loginId);
  if (duplicateTeacher || duplicateStudent) {
    showMessage("이미 사용 중인 로그인 아이디입니다.");
    return false;
  }
  teacher.name = data.name.trim();
  teacher.loginId = loginId;
  teacher.phone = phone;
  teacher.role = data.role;
  if (data.password?.trim()) teacher.password = data.password.trim();
  teacher.mustChangePassword = teacher.role === "teacher" && teacher.password === "1234";
}

function addPeriod(data) {
  state.periods = toList(state.periods);
  const name = data.name.trim();
  if (state.periods.some(period => period.name === name)) {
    showMessage("이미 등록된 교시 이름입니다.");
    return false;
  }
  state.periods.push({
    id: id("p"),
    name,
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    active: true
  });
}

function addSchedule(form) {
  const fd = new FormData(form);
  const teacherIds = Array.from(form.elements.teacherIds.selectedOptions).map(o => o.value);
  if (!teacherIds.length) {
    showMessage("담당 강사를 한 명 이상 선택해주세요.");
    return false;
  }
  let studentIds = [];
  try {
    studentIds = JSON.parse(fd.get("studentIds") || "[]");
  } catch {
    studentIds = [];
  }
  if (!studentIds.length) {
    showMessage("배정할 학생을 선택해주세요.");
    return false;
  }
  let slots = [];
  try {
    slots = JSON.parse(fd.get("slots") || "[]");
  } catch {
    slots = [];
  }
  if (!slots.length) {
    showMessage("배정할 요일/교시를 선택해주세요.");
    return false;
  }
  state.schedules = toList(state.schedules);
  studentIds.forEach(studentId => {
    slots.forEach(slot => {
      state.schedules.push({
        id: id("sch"),
        studentId,
        day: slot.day,
        period: slot.period,
        lessonType: fd.get("lessonType"),
        teacherIds
      });
    });
  });
  modal.scheduleStudentIds = studentIds;
}

function updateSchedule(form) {
  const fd = new FormData(form);
  const schedule = toList(state.schedules).find(item => item.id === fd.get("id"));
  if (!schedule) return;
  const teacherIds = Array.from(form.elements.teacherIds.selectedOptions).map(option => option.value);
  if (!teacherIds.length) {
    showMessage("담당 강사를 한 명 이상 선택해주세요.");
    return false;
  }
  schedule.day = fd.get("day");
  schedule.period = fd.get("period");
  schedule.lessonType = fd.get("lessonType");
  schedule.teacherIds = teacherIds;
}

function changePassword(data) {
  if (data.password !== data.confirm) {
    showMessage("비밀번호 확인이 일치하지 않습니다.");
    return false;
  }
  const teacher = toList(state.teachers).find(t => t.id === session.id);
  teacher.password = data.password;
  teacher.mustChangePassword = false;
  session.mustChangePassword = false;
}

function confirmRecord(recordId) {
  const record = toList(state.records).find(r => r.id === recordId);
  if (!record) return;
  const keywords = keywordList(record);
  const existing = getConfirmation(recordId, session.id);
  const checked = toList(existing?.keywords);
  if (keywords.length && !keywords.every(keyword => checked.includes(keyword))) return;
  state.confirmations = toList(state.confirmations).filter(c => !(c.recordId === recordId && c.studentId === session.id));
  state.confirmations.push({
    ...(existing || {}),
    id: existing?.id || id("con"),
    recordId,
    studentId: session.id,
    version: record.version,
    keywords: checked,
    confirmedAt: new Date().toISOString()
  });
}

function toggleKeyword(recordId, keyword) {
  const record = toList(state.records).find(r => r.id === recordId);
  if (!record) return;
  const existing = getConfirmation(recordId, session.id);
  const checked = new Set(toList(existing?.keywords));
  checked.has(keyword) ? checked.delete(keyword) : checked.add(keyword);
  state.confirmations = toList(state.confirmations).filter(c => !(c.recordId === recordId && c.studentId === session.id));
  state.confirmations.push({ ...(existing || {}), id: existing?.id || id("con"), recordId, studentId: session.id, version: 0, keywords: Array.from(checked), confirmedAt: existing?.confirmedAt || null });
}

function confirmAssignment(recordId) {
  const record = toList(state.records).find(r => r.id === recordId);
  if (!record) return;
  const existing = getConfirmation(recordId, session.id);
  state.confirmations = toList(state.confirmations).filter(c => !(c.recordId === recordId && c.studentId === session.id));
  state.confirmations.push({
    ...(existing || {}),
    id: existing?.id || id("con"),
    recordId,
    studentId: session.id,
    version: existing?.version || 0,
    assignmentConfirmed: true,
    assignmentConfirmedAt: new Date().toISOString()
  });
}

function toggleRecordHidden(recordId) {
  if (!canAdmin()) return;
  const record = toList(state.records).find(r => r.id === recordId);
  if (!record) return;
  record.hidden = !record.hidden;
  record.hiddenBy = record.hidden ? session.id : null;
  record.hiddenAt = record.hidden ? new Date().toISOString() : null;
}

function resetTeacherPassword(teacherId) {
  if (!canAdmin()) return;
  const teacher = toList(state.teachers).find(t => t.id === teacherId);
  if (!teacher) return;
  teacher.password = "1234";
  teacher.mustChangePassword = teacher.role === "teacher";
}

function toggleActive(collection, itemId) {
  if (!canAdmin()) return;
  state[collection] = toList(state[collection]);
  const item = state[collection].find(x => x.id === itemId);
  if (!item) return;
  item.active = !item.active;
}

function deletePeriod(periodId) {
  if (!canAdmin()) return;
  const period = toList(state.periods).find(item => item.id === periodId);
  if (!period) return;
  state.periods = toList(state.periods).filter(item => item.id !== periodId);
  state.schedules = toList(state.schedules).filter(schedule => schedule.period !== period.name);
  if (selectedPeriod === period.name) {
    selectedPeriod = periodOptions()[0] || DEFAULT_PERIODS[0];
  }
}

function deleteSchedule(scheduleId) {
  if (!canAdmin()) return;
  state.schedules = toList(state.schedules).filter(schedule => schedule.id !== scheduleId);
}

render();
loadRemoteState();
