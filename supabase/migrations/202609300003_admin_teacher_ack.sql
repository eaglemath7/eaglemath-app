begin;
-- Admin/deputy may explicitly acknowledge the teacher lane; lanes stay independent.
create or replace function public.academy_acknowledge_source(p_source uuid,p_director boolean default false) returns void
language plpgsql security definer set search_path=public as $$
declare source academy_items; review academy_required_reviews;
begin
 if not academy_staff() then raise exception '직원만 확인할 수 있습니다'; end if;
 select * into source from academy_items where id=p_source;
 select * into review from academy_required_reviews where source_id=p_source for update;
 if not found then raise exception '확인할 알림을 찾을 수 없습니다'; end if;
 if p_director then
  if not academy_admin() then raise exception '관리자(원장·부원장)만 확인할 수 있습니다'; end if;
 else
  if not academy_admin() and not academy_assigned_teacher(source.student_id) then raise exception '담당 강사 또는 관리자만 확인할 수 있습니다'; end if;
 end if;
 if source.kind='reflection' and review.lesson_id is null then raise exception '학부모 알림장을 먼저 발행해주세요'; end if;
 if p_director then
  update academy_required_reviews set director_id=auth.uid(),director_at=clock_timestamp(),updated_at=clock_timestamp() where source_id=p_source;
  update academy_comment_notifications set checked_at=clock_timestamp() where comment_id=p_source and recipient_id=auth.uid() and checked_at is null;
 else
  update academy_required_reviews set teacher_id=auth.uid(),teacher_at=clock_timestamp(),updated_at=clock_timestamp() where source_id=p_source;
 end if;
end $$;
commit;
