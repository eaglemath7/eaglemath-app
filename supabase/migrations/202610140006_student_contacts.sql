-- 학생 연락처 2개(관계·성함·번호)와 최초 등록일
-- 기존 parent_phone/parent_name/parent_relation = 연락처 1, 새 parent2_* = 연락처 2
begin;
alter table public.students
  add column if not exists parent2_phone text,
  add column if not exists parent2_name text,
  add column if not exists parent2_relation text,
  add column if not exists enrolled_on date;
commit;
