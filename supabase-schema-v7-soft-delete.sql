-- v7 패치: 학생 "삭제"를 되돌릴 수 있게 변경 (휴지통 개념)
--
-- 적용 방법: Supabase Dashboard > SQL Editor > New query 에 전체 붙여넣고 Run.
--
-- status에 '삭제' 값을 추가로 허용합니다. 재원/휴원/퇴원과 마찬가지로 학생 행과
-- 학습기록은 전혀 지우지 않고, 목록에서만 안 보이게 됩니다(휴지통에서 복구 가능).
-- 진짜 영구 삭제(계정까지 완전히 제거)는 휴지통 안의 "완전 삭제" 버튼을 눌렀을 때만
-- 일어나며, 그건 여전히 admin-delete-user Edge Function을 씁니다.

alter table students drop constraint if exists students_status_check;
alter table students add constraint students_status_check
  check (status in ('재원', '휴원', '퇴원', '삭제'));
