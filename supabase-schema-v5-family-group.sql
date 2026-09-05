-- v5 패치: 형제/자매 계정 연결 (한 로그인 아이디로 형제/자매 알림장을 함께 보기)
--
-- 적용 방법: Supabase Dashboard > SQL Editor > New query 에 전체 붙여넣고 Run.
-- (admin-create-user, admin-reset-password, ai-polish 처럼 별도 배포가 필요한
--  Edge Function이 아니라 순수 SQL이라 SQL Editor에서 한 번만 실행하면 됩니다.)

-- 1. 학생을 형제/자매 그룹으로 묶는 컬럼. 같은 값을 가진 학생끼리가 한 가족입니다.
alter table students add column if not exists family_id uuid;
create index if not exists idx_students_family_id on students(family_id) where family_id is not null;

-- 2. 로그인한 학생 본인 + (있다면) 같은 family_id를 가진 형제/자매의 id 목록.
--    is_staff()/is_teacher_or_staff()와 같은 방식(security definer)으로
--    RLS 정책 안에서 students 테이블을 재귀 없이 다시 조회합니다.
create or replace function family_student_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from students
  where id = auth.uid()
     or (family_id is not null and family_id = (select family_id from students where id = auth.uid()))
$$;

-- 3. 학생 본인 조회 정책에 "형제/자매도 조회 가능"을 추가.
drop policy if exists students_select on students;
create policy students_select on students for select
  using (is_teacher_or_staff() or id = auth.uid() or id in (select family_student_ids()));

-- 4. 시간표: 형제/자매 것도 캘린더에서 볼 수 있어야 합니다.
drop policy if exists schedules_select on schedules;
create policy schedules_select on schedules for select
  using (is_teacher_or_staff() or student_id in (select family_student_ids()));

-- 5. 학습기록: 형제/자매 것도 조회 가능(숨김 처리된 기록은 여전히 제외).
drop policy if exists lesson_records_select on lesson_records;
create policy lesson_records_select on lesson_records for select
  using (is_teacher_or_staff() or (student_id in (select family_student_ids()) and hidden = false));

-- 6. 확인 처리(키워드 확인/과제 확인): 형제/자매 몫도 같은 계정에서 조회/작성/수정 가능.
drop policy if exists record_confirmations_select on record_confirmations;
create policy record_confirmations_select on record_confirmations for select
  using (is_teacher_or_staff() or student_id in (select family_student_ids()));

drop policy if exists record_confirmations_insert on record_confirmations;
create policy record_confirmations_insert on record_confirmations for insert
  with check (student_id in (select family_student_ids()) or is_staff());

drop policy if exists record_confirmations_update on record_confirmations;
create policy record_confirmations_update on record_confirmations for update
  using (student_id in (select family_student_ids()) or is_staff())
  with check (student_id in (select family_student_ids()) or is_staff());

-- 7. 키워드 토글 RPC도 형제/자매 몫을 대신 누를 수 있도록 대상 학생 id를
--    선택적으로 받게 확장합니다(기본값은 본인). 함수 시그니처(매개변수 개수)가
--    바뀌므로 기존 2개 인자 버전을 먼저 지워야 PostgREST가 어떤 걸 호출할지
--    헷갈리지 않습니다.
drop function if exists toggle_confirmation_keyword(uuid, text);

create or replace function toggle_confirmation_keyword(p_record_id uuid, p_keyword text, p_student_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid := coalesce(p_student_id, auth.uid());
  v_version integer;
begin
  if v_student_id <> auth.uid() and v_student_id not in (select family_student_ids()) then
    raise exception 'not allowed';
  end if;

  select version into v_version from lesson_records where id = p_record_id;
  if v_version is null then
    raise exception 'record not found';
  end if;

  insert into record_confirmations (record_id, student_id, version, keywords)
  values (p_record_id, v_student_id, v_version, array[p_keyword])
  on conflict (record_id, student_id) do update
  set keywords = case
    when p_keyword = any(record_confirmations.keywords)
      then array_remove(record_confirmations.keywords, p_keyword)
    else array_append(record_confirmations.keywords, p_keyword)
  end;
end;
$$;
grant execute on function toggle_confirmation_keyword(uuid, text, uuid) to authenticated;
