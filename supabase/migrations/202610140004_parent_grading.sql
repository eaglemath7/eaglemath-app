-- 학부모도 자녀의 채점 결과를 볼 수 있게 합니다(저학년은 부모님이 사진을 찍어 채점).
begin;
create or replace function public.grading_my_results(p_book uuid, p_student uuid default null)
returns table(no integer, verdict text, attempt integer, recognized text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
 select distinct on (r.no) r.no, r.verdict, r.attempt, r.recognized, r.created_at
 from grading_results r
 where r.book_id = p_book
   and r.student_id = case
     when p_student is not null and (academy_staff() or academy_child(p_student)) then p_student
     else auth.uid() end
   and (academy_staff() or academy_role() = 'student' or (p_student is not null and academy_child(p_student)))
 order by r.no, r.attempt desc, r.created_at desc;
$$;
revoke all on function public.grading_my_results(uuid, uuid) from public, anon;
grant execute on function public.grading_my_results(uuid, uuid) to authenticated;
commit;
