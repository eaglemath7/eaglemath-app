// 화면과 테스트가 함께 쓰는 순수 함수들 (브라우저 API 사용 안 함).

export const VERDICT_LABEL = { O: 'O', X: 'X', pending: '확인 중' };

// 학생×문항별로 가장 최근 시도만 남깁니다.
export function latestByStudentNo(rows) {
  const best = new Map();
  for (const r of rows) {
    const k = r.student_id + ':' + r.no;
    const old = best.get(k);
    if (!old || r.attempt > old.attempt || (r.attempt === old.attempt && r.created_at > old.created_at)) best.set(k, r);
  }
  return best;
}

// 문항 번호 구간(예: 1-50, 51-100 ...)
export function rangeOptions(maxNo, size = 50) {
  const out = [];
  for (let a = 1; a <= maxNo; a += size) out.push([a, Math.min(maxNo, a + size - 1)]);
  return out;
}

// AI가 준 0~1000 좌표 상자를 실제 픽셀 상자로. 여유(pad)를 두고 사진 밖으로 나가지 않게 자릅니다.
export function cropRect(box, width, height, pad = 0.03) {
  let [x0, y0, x1, y1] = box.map(Number);
  if (!(x1 > x0) || !(y1 > y0)) [x0, y0, x1, y1] = [0, 0, 1000, 1000];
  const px = pad * width, py = pad * height;
  const left = Math.max(0, Math.floor(x0 / 1000 * width - px));
  const top = Math.max(0, Math.floor(y0 / 1000 * height - py));
  const right = Math.min(width, Math.ceil(x1 / 1000 * width + px));
  const bottom = Math.min(height, Math.ceil(y1 / 1000 * height + py));
  return { x: left, y: top, w: Math.max(1, right - left), h: Math.max(1, bottom - top) };
}

// 긴 변이 max를 넘지 않게 줄이는 배율(확대는 안 함)
export function fitScale(w, h, max) {
  return Math.min(1, max / Math.max(w, h));
}

export function summarize(list) {
  const s = { O: 0, X: 0, pending: 0 };
  for (const r of list) s[r.verdict] = (s[r.verdict] || 0) + 1;
  return s;
}

// 정답지 JSON(answers_*.json 형식) 검사
export function parseAnswerFile(text) {
  const data = JSON.parse(text);
  const answers = Array.isArray(data) ? data : data.answers;
  if (!Array.isArray(answers) || !answers.length) throw new Error('정답 목록(answers)이 없습니다.');
  const seen = new Set();
  for (const a of answers) {
    if (!Number.isInteger(a.no) || a.no < 1) throw new Error('문항 번호가 잘못된 항목이 있습니다.');
    if (!a.answer || !a.type) throw new Error(a.no + '번에 정답 또는 유형이 없습니다.');
    if (seen.has(a.no)) throw new Error(a.no + '번이 중복되었습니다.');
    seen.add(a.no);
  }
  return { title: Array.isArray(data) ? '' : (data.book || ''), answers };
}
