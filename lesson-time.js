// Presentation only: stored period identifiers remain unchanged.
export function lessonTime(value) {
  return String(value ?? '').replace(/(^|[^\d])(\d{2})(\d{2})\s*[-~–]\s*(\d{2})(\d{2})(?!\d)/g,
    (whole,prefix,h1,m1,h2,m2) => +h1<24 && +h2<24 && +m1<60 && +m2<60 ? `${prefix}${h1}:${m1}–${h2}:${m2}` : whole);
}
