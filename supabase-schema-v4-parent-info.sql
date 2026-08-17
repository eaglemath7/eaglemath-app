-- v4 패치: 학생 정보 확장(학교명/학생·학부모 연락처/관계), 생일 필수 해제
-- 적용 방법: Supabase Dashboard > SQL Editor > New query 에 전체 붙여넣고 Run.

alter table students
  add column if not exists school_name text,
  add column if not exists student_phone text,
  add column if not exists parent_phone text,
  add column if not exists parent_name text,
  add column if not exists parent_relation text;

alter table students alter column birthday4 drop not null;
