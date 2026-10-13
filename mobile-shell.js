// 학생·학부모 화면은 휴대폰 전용: 컴퓨터에서 열어도 휴대폰 폭(440px) 화면으로 보여줍니다.
// 화면 폭 기준(@media max-width) 휴대폰용 규칙은 넓은 화면에서 저절로 켜지지 않으므로,
// 같은 사이트의 스타일시트에서 그 규칙들을 찾아 항상 적용되도록 한 번 더 넣습니다.
const SHELL_WIDTH = 440;

export function enableMobileShell(on = true) {
  document.body.classList.toggle('family-mobile', on);
  const old = document.getElementById('mobile-shell-forced');
  if (!on) { old?.remove(); return; }
  if (old) return;
  const css = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // 다른 사이트의 스타일시트는 읽지 않음
    for (const rule of rules || []) {
      if (!(rule instanceof CSSMediaRule)) continue;
      const m = rule.conditionText.replace(/\s+/g, '').match(/^(?:screenand)?\(max-width:(\d+)px\)$/);
      if (m && Number(m[1]) >= SHELL_WIDTH) css.push([...rule.cssRules].map((r) => r.cssText).join('\n'));
    }
  }
  const style = document.createElement('style');
  style.id = 'mobile-shell-forced';
  style.textContent = css.join('\n');
  document.head.appendChild(style);
}
