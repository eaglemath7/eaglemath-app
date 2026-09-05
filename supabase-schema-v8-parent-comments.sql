-- v8 패치: 학부모(학생) 자유 코멘트 + 강사/원장 이중 확인
--
-- 적용 방법: Supabase Dashboard > SQL Editor > New query 에 전체 붙여넣고 Run.
-- (이 세션에서는 Supabase MCP로 이미 적용 완료했습니다 — 팀 내 다른 환경에
--  똑같이 적용할 때 쓰는 기록용 파일입니다.)
--
-- 학습기록마다 학부모/학생이 자유롭게 글을 남기고, 강사 화면과 관리자 화면에
-- 각각 "확인" 버튼이 따로 있어서 강사가 확인하고 원장도 확인해야 그 코멘트가
-- "확인 완료"로 바뀝니다(둘 중 하나만 확인하면 계속 미확인으로 남음).

create table if not exists record_comments (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references lesson_records(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  author_role text not null,
  content text not null,
  teacher_confirmed_at timestamptz,
  teacher_confirmed_by uuid references profiles(id) on delete set null,
  admin_confirmed_at timestamptz,
  admin_confirmed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table record_comments enable row level security;

-- 조회: 교사 이상 전체, 학생/학부모는 본인(형제/자매 포함) 기록의 코멘트만.
drop policy if exists record_comments_select on record_comments;
create policy record_comments_select on record_comments for select
  using (is_teacher_or_staff() or student_id in (select family_student_ids()));

-- 작성: 교사 이상이거나 본인(형제/자매) 학생 몫만, author_id는 반드시 본인.
drop policy if exists record_comments_insert on record_comments;
create policy record_comments_insert on record_comments for insert
  with check (
    author_id = auth.uid()
    and (is_teacher_or_staff() or student_id in (select family_student_ids()))
  );

-- 수정(확인 처리): 교사 이상만. 실제로 teacher_confirmed_*를 쓸지
-- admin_confirmed_*를 쓸지는 앱에서 role별로 구분해서 채웁니다.
drop policy if exists record_comments_update on record_comments;
create policy record_comments_update on record_comments for update
  using (is_teacher_or_staff())
  with check (is_teacher_or_staff());
