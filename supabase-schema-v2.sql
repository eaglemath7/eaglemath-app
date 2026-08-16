-- Eagle Math App — Schema v2
-- Auth + Row Level Security 기반 재설계
--
-- 적용 방법: Supabase Dashboard > SQL Editor > New query 에 이 파일 전체를 붙여넣고 Run.
--
-- ⚠️ 주의: 기존 v1 스키마(supabase-schema.sql)로 만든 테이블을 전부 삭제하고 새로 만듭니다.
-- 테스트/시드 데이터 외 실제 운영 데이터가 없다는 전제입니다. 실제 데이터가 이미 들어있다면
-- 이 스크립트를 실행하기 전에 반드시 백업(관리자 화면의 '데이터 백업')부터 받아두세요.

drop table if exists record_confirmations cascade;
drop table if exists lesson_records cascade;
drop table if exists schedules cascade;
drop table if exists units cascade;
drop table if exists materials cascade;
drop table if exists periods cascade;
drop table if exists students cascade;
drop table if exists teachers cascade;
drop table if exists app_users cascade;
drop table if exists app_state cascade;

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. profiles — auth.users 1:1, 역할·표시정보
-- =========================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'deputy', 'teacher', 'student')),
  name text not null,
  login_id text not null unique,
  phone text,
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 2. students — 학생 전용 부가 정보 (id = profiles.id)
-- =========================================================
create table if not exists students (
  id uuid primary key references profiles(id) on delete cascade,
  birthday4 text not null,
  school_year text,
  study_plans jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 3. 교시 / 시간표 / 교재 / 단원 / 학사일정
-- =========================================================
create table if not exists periods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_time time,
  end_time time,
  "order" integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  day text not null,
  period text not null,
  lesson_type text not null default '정규',
  teacher_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists schedules_student_idx on schedules(student_id);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table if not exists academic_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date date not null,
  end_date date not null,
  type text not null default '안내',
  visibility text not null default '전체' check (visibility in ('전체', '내부')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 4. 수업기록 — 학생 1명당 1행 (일괄작성은 group_id로 묶음)
-- =========================================================
create table if not exists lesson_records (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  lesson_date date not null,
  period text,
  lesson_type text not null default '정규',
  attendance text not null default '정시출석',
  homework text not null default '완벽',
  focus text,
  material text,
  unit text,
  content text,
  assignment text,
  parent_message text,
  student_message text,
  keywords text,
  test_name text,
  next_plan text,
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null,
  version integer not null default 1,
  hidden boolean not null default false,
  hidden_by uuid references profiles(id) on delete set null,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lesson_records_student_idx on lesson_records(student_id, lesson_date);
create index if not exists lesson_records_group_idx on lesson_records(group_id);

create table if not exists record_confirmations (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references lesson_records(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  version integer not null default 0,
  keywords text[] not null default '{}',
  assignment_confirmed boolean not null default false,
  assignment_confirmed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_id, student_id)
);

-- =========================================================
-- 5. updated_at 자동 갱신 트리거
-- =========================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','students','periods','schedules','academic_events','lesson_records','record_confirmations']
  loop
    execute format('drop trigger if exists trg_set_updated_at on %I;', t);
    execute format('create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- created_by / updated_by 스푸핑 방지: 서버에서 auth.uid()로 강제
create or replace function lesson_records_stamp_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lesson_records_stamp on lesson_records;
create trigger trg_lesson_records_stamp
  before insert or update on lesson_records
  for each row execute function lesson_records_stamp_author();

-- =========================================================
-- 6. 권한 헬퍼 함수 (security definer로 RLS 재귀 회피)
-- =========================================================
create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'deputy')
  );
$$;

create or replace function is_teacher_or_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'deputy', 'teacher')
  );
$$;

-- 최초 로그인 비밀번호 변경 완료 처리 (본인만, 컬럼 단위로 안전하게 노출)
create or replace function complete_password_change()
returns void language sql security definer set search_path = public as $$
  update profiles set must_change_password = false where id = auth.uid();
$$;
grant execute on function complete_password_change() to authenticated;

-- =========================================================
-- 7. RLS 활성화 + 정책
-- =========================================================
alter table profiles enable row level security;
alter table students enable row level security;
alter table periods enable row level security;
alter table schedules enable row level security;
alter table materials enable row level security;
alter table units enable row level security;
alter table academic_events enable row level security;
alter table lesson_records enable row level security;
alter table record_confirmations enable row level security;

-- profiles: 교사 이상은 전체 조회(이름 표시용), 본인도 조회. 학생은 자기 자신만.
-- (학생이 강사 이름을 봐야 하는 경우엔 아래 staff_directory 뷰를 통해 이름/역할만 제공)
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (is_teacher_or_staff() or id = auth.uid());
drop policy if exists profiles_write on profiles;
create policy profiles_write on profiles for all
  using (is_staff()) with check (is_staff());

-- 학생 세션에서도 강사/관리자 "이름"만 조회할 수 있게 하는 최소 정보 뷰.
-- 전화번호 등 민감정보는 제외. 뷰는 소유자(postgres) 권한으로 실행되어 RLS를
-- 우회하지만, 애초에 노출 컬럼을 name/role로만 좁혀뒀기 때문에 안전합니다.
create or replace view staff_directory as
  select id, name, role from profiles where role in ('admin', 'deputy', 'teacher') and active = true;
grant select on staff_directory to authenticated;

-- students: 교사 이상 전체 조회, 학생 본인 조회. 쓰기는 관리자만.
drop policy if exists students_select on students;
create policy students_select on students for select
  using (is_teacher_or_staff() or id = auth.uid());
drop policy if exists students_write on students;
create policy students_write on students for all
  using (is_staff()) with check (is_staff());

-- periods/materials/units: 로그인한 누구나 조회, 쓰기는 관리자만.
drop policy if exists periods_select on periods;
create policy periods_select on periods for select using (auth.uid() is not null);
drop policy if exists periods_write on periods;
create policy periods_write on periods for all using (is_staff()) with check (is_staff());

drop policy if exists materials_select on materials;
create policy materials_select on materials for select using (auth.uid() is not null);
drop policy if exists materials_write on materials;
create policy materials_write on materials for all using (is_staff()) with check (is_staff());

drop policy if exists units_select on units;
create policy units_select on units for select using (auth.uid() is not null);
drop policy if exists units_write on units;
create policy units_write on units for all using (is_staff()) with check (is_staff());

-- schedules: 교사 이상 전체 조회(학생 이름 매칭 필요), 학생은 본인 배정만 조회. 쓰기는 관리자만.
drop policy if exists schedules_select on schedules;
create policy schedules_select on schedules for select
  using (is_teacher_or_staff() or student_id = auth.uid());
drop policy if exists schedules_write on schedules;
create policy schedules_write on schedules for all
  using (is_staff()) with check (is_staff());

-- academic_events: '내부' 공개범위는 교사 이상만, '전체'는 로그인한 누구나. 쓰기는 관리자만.
drop policy if exists academic_events_select on academic_events;
create policy academic_events_select on academic_events for select
  using (visibility = '전체' or is_teacher_or_staff());
drop policy if exists academic_events_write on academic_events;
create policy academic_events_write on academic_events for all
  using (is_staff()) with check (is_staff());

-- lesson_records: 교사 이상 전체 조회/작성/수정, 학생은 본인 것 + 숨김 아닌 것만 조회.
drop policy if exists lesson_records_select on lesson_records;
create policy lesson_records_select on lesson_records for select
  using (is_teacher_or_staff() or (student_id = auth.uid() and hidden = false));
drop policy if exists lesson_records_insert on lesson_records;
create policy lesson_records_insert on lesson_records for insert
  with check (is_teacher_or_staff());
drop policy if exists lesson_records_update on lesson_records;
create policy lesson_records_update on lesson_records for update
  using (is_teacher_or_staff()) with check (is_teacher_or_staff());

-- record_confirmations: 교사 이상 전체 조회, 학생은 본인 것만 조회/작성/수정.
drop policy if exists record_confirmations_select on record_confirmations;
create policy record_confirmations_select on record_confirmations for select
  using (is_teacher_or_staff() or student_id = auth.uid());
drop policy if exists record_confirmations_insert on record_confirmations;
create policy record_confirmations_insert on record_confirmations for insert
  with check (student_id = auth.uid() or is_staff());
drop policy if exists record_confirmations_update on record_confirmations;
create policy record_confirmations_update on record_confirmations for update
  using (student_id = auth.uid() or is_staff())
  with check (student_id = auth.uid() or is_staff());

-- =========================================================
-- 8. 기본 데이터 시드 (교시 / 교재 / 단원)
-- =========================================================
insert into periods (name, "order") values
  ('1교시', 0), ('2교시', 1), ('3교시', 2), ('4교시', 3), ('5교시', 4), ('6교시', 5)
on conflict (name) do nothing;

insert into materials (name) values
  ('디딤돌기본'), ('디딤돌응용'), ('쎈'), ('쎈B'), ('숨마쿰라우테'),
  ('개념원리'), ('백발백중'), ('일품수학'), ('블랙라벨'), ('학습지')
on conflict (name) do nothing;

insert into units (name) values
  ('초1-1 9까지의 수'), ('초1-1 여러 가지 모양'), ('초1-1 덧셈과 뺄셈'), ('초1-1 비교하기'), ('초1-1 50까지의 수'),
  ('초1-2 100까지의 수'), ('초1-2 덧셈과 뺄셈'), ('초1-2 여러 가지 모양'), ('초1-2 시계 보기와 규칙 찾기'), ('초1-2 덧셈과 뺄셈 활용'),
  ('초2-1 세 자리 수'), ('초2-1 여러 가지 도형'), ('초2-1 덧셈과 뺄셈'), ('초2-1 길이 재기'), ('초2-1 분류하기'), ('초2-1 곱셈'),
  ('초2-2 네 자리 수'), ('초2-2 곱셈구구'), ('초2-2 길이 재기'), ('초2-2 시각과 시간'), ('초2-2 표와 그래프'), ('초2-2 규칙 찾기'),
  ('초3-1 덧셈과 뺄셈'), ('초3-1 평면도형'), ('초3-1 나눗셈'), ('초3-1 곱셈'), ('초3-1 길이와 시간'), ('초3-1 분수와 소수'),
  ('초3-2 곱셈'), ('초3-2 나눗셈'), ('초3-2 원'), ('초3-2 분수'), ('초3-2 들이와 무게'), ('초3-2 자료의 정리'),
  ('초4-1 큰 수'), ('초4-1 각도'), ('초4-1 곱셈과 나눗셈'), ('초4-1 평면도형의 이동'), ('초4-1 막대그래프'), ('초4-1 규칙 찾기'),
  ('초4-2 분수의 덧셈과 뺄셈'), ('초4-2 삼각형'), ('초4-2 소수의 덧셈과 뺄셈'), ('초4-2 사각형'), ('초4-2 꺾은선그래프'), ('초4-2 다각형'),
  ('초5-1 자연수의 혼합 계산'), ('초5-1 약수와 배수'), ('초5-1 규칙과 대응'), ('초5-1 약분과 통분'), ('초5-1 분수의 덧셈과 뺄셈'), ('초5-1 다각형의 둘레와 넓이'),
  ('초5-2 수의 범위와 어림하기'), ('초5-2 분수의 곱셈'), ('초5-2 합동과 대칭'), ('초5-2 소수의 곱셈'), ('초5-2 직육면체'), ('초5-2 평균과 가능성'),
  ('초6-1 분수의 나눗셈'), ('초6-1 각기둥과 각뿔'), ('초6-1 소수의 나눗셈'), ('초6-1 비와 비율'), ('초6-1 여러 가지 그래프'), ('초6-1 직육면체의 부피와 겉넓이'),
  ('초6-2 분수와 소수의 혼합 계산'), ('초6-2 원의 넓이'), ('초6-2 비례식과 비례배분'), ('초6-2 원기둥 원뿔 구'), ('초6-2 경우의 수'),
  ('중1 수와 연산'), ('중1 문자와 식'), ('중1 좌표평면과 그래프'), ('중1 기본 도형'), ('중1 평면도형'), ('중1 입체도형'), ('중1 자료의 정리와 해석'),
  ('중2 유리수와 순환소수'), ('중2 식의 계산'), ('중2 일차부등식과 연립일차방정식'), ('중2 일차함수'), ('중2 도형의 성질'), ('중2 도형의 닮음'), ('중2 확률'),
  ('중3 실수와 그 계산'), ('중3 다항식의 곱셈과 인수분해'), ('중3 이차방정식'), ('중3 이차함수'), ('중3 삼각비'), ('중3 원의 성질'), ('중3 통계'),
  ('고1 공통수학1 다항식'), ('고1 공통수학1 방정식과 부등식'), ('고1 공통수학1 경우의 수'), ('고1 공통수학1 행렬'),
  ('고1 공통수학2 도형의 방정식'), ('고1 공통수학2 집합과 명제'), ('고1 공통수학2 함수와 그래프'),
  ('고2 대수 지수함수와 로그함수'), ('고2 대수 삼각함수'), ('고2 대수 수열'),
  ('고2 미적분Ⅰ 함수의 극한과 연속'), ('고2 미적분Ⅰ 미분'), ('고2 미적분Ⅰ 적분'),
  ('고2 확률과 통계 경우의 수'), ('고2 확률과 통계 확률'), ('고2 확률과 통계 통계'),
  ('고2 기하 이차곡선'), ('고2 기하 공간도형과 공간좌표'), ('고2 기하 벡터'),
  ('고3 미적분Ⅱ 수열의 극한'), ('고3 미적분Ⅱ 미분법'), ('고3 미적분Ⅱ 적분법')
on conflict (name) do nothing;

-- 완료. profiles/students 계정은 이 스크립트로 만들지 않습니다 — Edge Function
-- admin-create-user 를 통해 관리자 화면에서 등록하세요 (auth.users + profiles/students를
-- 함께 만들어야 하므로 SQL만으로는 계정을 안전하게 만들 수 없습니다).
