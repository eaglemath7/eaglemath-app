const fields = { material: '교재', unit: '단원·진도', content: '오늘 공부한 내용', assignment: '오늘의 숙제', parent_message: '학부모님께' };
export function photoJournalControls() {
  return `<section class="panel stack" data-photo-journal><strong>사진으로 알림장 쓰기</strong><p class="muted small">교재나 수업 기록을 찍으면 AI가 초안을 만들어요. 한 학생의 기록만 올려주세요. 최대 3장.</p><div class="toolbar"><label>📷 사진 찍어 알림장 쓰기<input type="file" accept="image/*" capture="environment" data-journal-camera /></label><label>앨범에서 고르기<input type="file" accept="image/*" multiple data-journal-camera /></label></div><p role="status" aria-live="polite" data-photo-status></p><div class="stack" data-photo-preview></div><button type="button" data-photo-apply hidden>초안을 입력칸에 적용</button><small>적용하면 해당 입력칸의 기존 내용이 바뀝니다. 확인·수정 후 게시해주세요.</small></section>`;
}
export async function prepareJournalImage(file) {
  if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) throw new Error('20MB 이하 사진을 골라주세요.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { media_type: 'image/jpeg', data: canvas.toDataURL('image/jpeg', .85).split(',')[1] };
  } catch { throw new Error('사진을 열 수 없어요. JPG·PNG 사진으로 다시 골라주세요.'); }
  finally { URL.revokeObjectURL(url); }
}
export function applyPhotoDraft(form, draft) {
  for (const key of Object.keys(fields)) {
    const value = draft[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const target = form.elements[key === 'parent_message' && !form.elements.parent_message ? 'parentMessage' : key];
    if (!target) continue;
    if (key === 'material' && form.elements.materialCustom) {
      form.elements.materialCustom.value = value;
      form.elements.materialCustom.dispatchEvent(new Event('input', { bubbles: true }));
      continue;
    }
    if (target.tagName === 'SELECT' && !Array.from(target.options).some(o => o.value === value)) target.add(new Option(value, value));
    target.value = value;
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
export function installPhotoJournal(invoke) {
  document.addEventListener('change', async event => {
    const input = event.target.closest('[data-journal-camera]');
    if (!input || !input.files.length) return;
    const box = input.closest('[data-photo-journal]'), form = box.closest('form');
    const status = box.querySelector('[data-photo-status]'), preview = box.querySelector('[data-photo-preview]'), apply = box.querySelector('[data-photo-apply]');
    const files = Array.from(input.files); input.value = '';
    if (files.length > 3) { status.textContent = '사진은 한 번에 3장까지 골라주세요.'; return; }
    const controls = Array.from(form.querySelectorAll('button, input[type="file"]'));
    const disabled = controls.map(el => el.disabled);
    controls.forEach(el => el.disabled = true); apply.hidden = true; preview.replaceChildren();
    status.textContent = '사진을 읽어 알림장 초안을 작성하고 있어요…';
    try {
      const images = await Promise.all(files.map(prepareJournalImage));
      const { data, error } = await invoke({ kind: 'photoJournal', images });
      if (error || data?.error) throw new Error(data?.error || '사진 분석에 실패했어요. 잠시 후 다시 시도해주세요.');
      if (!form.isConnected) return;
      const draft = data?.draft;
      if (!draft || !Object.keys(fields).some(k => typeof draft[k] === 'string' && draft[k].trim())) throw new Error(typeof draft?.warning === 'string' && draft.warning.trim() ? draft.warning : '읽을 수 있는 학습 내용이 없어요. 글자가 잘 보이게 다시 찍어주세요.');
      const editors = {};
      for (const [key, label] of Object.entries(fields)) {
        const row = document.createElement('label'); row.textContent = label;
        const editor = document.createElement('textarea'); editor.value = typeof draft[key] === 'string' ? draft[key] : '';
        row.append(editor); preview.append(row); editors[key] = editor;
      }
      status.textContent = '초안을 확인해주세요. ' + (typeof draft.warning === 'string' ? draft.warning : '');
      apply.hidden = false;
      apply.onclick = () => {
        applyPhotoDraft(form, Object.fromEntries(Object.entries(editors).map(([key, el]) => [key, el.value])));
        status.textContent = '초안을 입력칸에 적용했어요. 확인·수정 후 게시해주세요.';
      };
    } catch (error) { if (form.isConnected) status.textContent = error.message; }
    finally { controls.forEach((el, i) => el.disabled = disabled[i]); }
  });
}
