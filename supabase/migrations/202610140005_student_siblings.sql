-- 형제자매 바꾸기: 같은 학부모에 연결된 학생끼리를 형제자매로 봅니다.
-- 학생으로 로그인하면 형제자매 목록(본인 포함)을 돌려줍니다. 다른 정보는 주지 않습니다.
begin;
create or replace function public.academy_siblings()
returns table(id uuid, name text, school_year text)
language sql stable security definer set search_path = public as $$
 select s.id, p.name, s.school_year
 from students s join profiles p on p.id = s.id
 where academy_role() = 'student' and p.active and p.role = 'student'
   and s.id in (
     select ps2.student_id from parent_students ps1
     join parent_students ps2 on ps2.parent_id = ps1.parent_id
     where ps1.student_id = auth.uid()
     union select auth.uid())
 order by p.name;
$$;
revoke all on function public.academy_siblings() from public, anon;
grant execute on function public.academy_siblings() to authenticated;
commit;
