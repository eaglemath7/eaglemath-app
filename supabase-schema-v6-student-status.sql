-- v6 패치: 학생 상태를 재원/휴원/퇴원 세 가지로 구분
-- (기존에는 profiles.active로 "숨김/복구" 하나뿐이었습니다)
--
-- 적용 방법: Supabase Dashboard > SQL Editor > New query 에 전체 붙여넣고 Run.
--
-- 퇴원 처리해도 students/lesson_records 행을 지우지 않으니 학습기록은 그대로
-- 남아있습니다. 나중에 다시 등록하면(같은 이름·학부모전화) 앱이 새 계정을 만드는
-- 대신 이 학생을 "재원"으로 되돌리라고 안내하고, 그러면 예전 기록이 그대로 이어집니다.

alter table students add column if not exists status text not null default '재원'
  check (status in ('재원', '휴원', '퇴원'));

-- 이미 숨김 처리(active=false)되어 있던 학생은 일단 퇴원으로 맞춰둡니다.
-- 사실은 휴원이었던 학생이 있다면 관리자 화면에서 상태를 휴원으로 바꿔주세요.
update students s set status = '퇴원'
from profiles p
where p.id = s.id and p.active = false and s.status = '재원';
