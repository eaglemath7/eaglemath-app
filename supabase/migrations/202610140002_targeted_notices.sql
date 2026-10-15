-- 공지 대상 지정: 학생/학부모, 학교급(초·중·고)·학년·학교·개별 학생.
-- Additive migration. 기존 공지와 일정은 그대로(대상 '전체', 그룹 없음) 보입니다.
begin;

alter table public.academic_events add column if not exists audience text not null default 'all';
alter table public.academic_events drop constraint if exists academic_events_audience_check;
alter table public.academic_events add constraint academic_events_audience_check check (audience in ('all','student','parent'));
-- target 예: {"levels":["초"],"grades":["중1"],"schools":["배곧중"],"students":["<학생 id>"]}
-- 비어 있으면 모두에게, 하나라도 있으면 그중 하나라도 해당하는 학생(또는 그 학부모)에게만 보입니다.
alter table public.academic_events add column if not exists target jsonb not null default '{}';

create or replace function public.academy_notice_student_match(p_student uuid, p_target jsonb)
returns boolean language sql stable security definer set search_path = public as $$
 select case
  when coalesce(jsonb_array_length(p_target->'levels'),0) + coalesce(jsonb_array_length(p_target->'grades'),0)
     + coalesce(jsonb_array_length(p_target->'schools'),0) + coalesce(jsonb_array_length(p_target->'students'),0) = 0 then true
  else exists (
   select 1 from students s where s.id = p_student and (
    (p_target ? 'levels' and p_target->'levels' ? left(coalesce(s.school_year,''),1))
    or (p_target ? 'grades' and p_target->'grades' ? coalesce(s.school_year,''))
    or (p_target ? 'schools' and p_target->'schools' ? coalesce(s.school_name,''))
    or (p_target ? 'students' and p_target->'students' ? s.id::text)
   ))
 end;
$$;

create or replace function public.academy_event_visible(e public.academic_events)
returns boolean language sql stable security definer set search_path = public as $$
 select case
  when academy_staff() then true
  when e.visibility <> '전체' then false
  when academy_role() = 'student' then e.audience in ('all','student') and academy_notice_student_match(auth.uid(), e.target)
  when academy_role() = 'parent' then e.audience in ('all','parent') and exists (
    select 1 from parent_students ps where ps.parent_id = auth.uid() and academy_notice_student_match(ps.student_id, e.target))
  else false
 end;
$$;
revoke all on function public.academy_notice_student_match(uuid, jsonb) from public, anon;
revoke all on function public.academy_event_visible(public.academic_events) from public, anon;
grant execute on function public.academy_notice_student_match(uuid, jsonb) to authenticated;
grant execute on function public.academy_event_visible(public.academic_events) to authenticated;

drop policy if exists academic_events_select on public.academic_events;
create policy academic_events_select on public.academic_events for select to authenticated
 using (academy_event_visible(academic_events));

commit;
