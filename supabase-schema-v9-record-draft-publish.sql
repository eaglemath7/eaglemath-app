-- v9 패치: 학습기록 임시저장(초안) / 발행 분리
--
-- 적용 방법: Supabase Dashboard > SQL Editor > New query 에 전체 붙여넣고 Run.
-- (이 세션에서는 Supabase MCP로 이미 적용 완료 — 기록용 파일입니다.)
--
-- 강사가 기록을 저장하면 항상 "임시저장(초안)" 상태가 되어 학부모에게 안 보이고,
-- 관리자/부원장이 저장하면 바로 "발행"되어 보입니다. 강사가 쓴 초안은 관리자
-- 화면의 "임시저장 목록"에서 한 건씩 또는 여러 건 한꺼번에 발행할 수 있습니다.

alter table lesson_records add column if not exists is_draft boolean not null default false;

drop policy if exists lesson_records_select on lesson_records;
create policy lesson_records_select on lesson_records for select
  using (is_teacher_or_staff() or (student_id in (select family_student_ids()) and hidden = false and is_draft = false));

-- 강사(teacher)가 insert/update하면 항상 임시저장 상태가 되도록 서버에서
-- 강제합니다(클라이언트가 is_draft를 조작해서 보내도 무시됨). 관리자/부원장이
-- 저장하면 보낸 값 그대로(기본값 false=발행) 둡니다.
create or replace function enforce_lesson_record_draft()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role = 'teacher' then
    new.is_draft := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lesson_records_draft on lesson_records;
create trigger trg_lesson_records_draft
  before insert or update on lesson_records
  for each row execute function enforce_lesson_record_draft();
