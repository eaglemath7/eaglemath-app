begin;
-- Persistent two-party acknowledgement, independent of reading/opening the UI.
create table public.academy_required_reviews (
 source_id uuid primary key references academy_items(id) on delete cascade,
 teacher_id uuid references profiles(id), teacher_at timestamptz,
 director_id uuid references profiles(id), director_at timestamptz,
 lesson_id uuid references academy_items(id) on delete set null,
 updated_at timestamptz not null default clock_timestamp()
);
create function public.academy_assigned_teacher(p_student uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select academy_staff() and exists(select 1 from schedules s where s.student_id=p_student and auth.uid()=any(s.teacher_ids));
$$;
alter table academy_required_reviews enable row level security;
create policy required_reviews_read on academy_required_reviews for select to authenticated using(
 academy_admin() or exists(select 1 from academy_items i where i.id=source_id and academy_assigned_teacher(i.student_id))
);
revoke all on academy_required_reviews from public,anon,authenticated;
grant select on academy_required_reviews to authenticated;

create function public.academy_acknowledge_source(p_source uuid,p_director boolean default false) returns void
language plpgsql security definer set search_path=public as $$
declare source academy_items; review academy_required_reviews;
begin
 if not academy_staff() then raise exception '직원만 확인할 수 있습니다'; end if;
 select * into source from academy_items where id=p_source;
 select * into review from academy_required_reviews where source_id=p_source for update;
 if not found then raise exception '확인할 알림을 찾을 수 없습니다'; end if;
 if p_director then
  if not academy_admin() then raise exception '원장 확인 권한이 없습니다'; end if;
 else
  if not academy_assigned_teacher(source.student_id) then raise exception '담당 강사만 확인할 수 있습니다'; end if;
 end if;
 if source.kind='reflection' and review.lesson_id is null then raise exception '학부모 알림장을 먼저 발행해주세요'; end if;
 if p_director then
  update academy_required_reviews set director_id=auth.uid(),director_at=clock_timestamp(),updated_at=clock_timestamp() where source_id=p_source;
  update academy_comment_notifications set checked_at=clock_timestamp() where comment_id=p_source and recipient_id=auth.uid() and checked_at is null;
 else
  update academy_required_reviews set teacher_id=auth.uid(),teacher_at=clock_timestamp(),updated_at=clock_timestamp() where source_id=p_source;
 end if;
end $$;
revoke all on function academy_assigned_teacher(uuid),academy_acknowledge_source(uuid,boolean) from public,anon;
grant execute on function academy_assigned_teacher(uuid),academy_acknowledge_source(uuid,boolean) to authenticated;

create function public.academy_required_review_activity() returns trigger
language plpgsql security definer set search_path=public as $$
declare parent_author boolean; r record; source uuid;
begin
 if new.kind='reflection' and new.status<>'draft' then
  if tg_op='UPDATE' and (new.body-'feedback') is not distinct from (old.body-'feedback') and old.status<>'draft' then return new; end if;
  insert into academy_required_reviews(source_id) values(new.id) on conflict(source_id) do update
   set teacher_id=null,teacher_at=null,director_id=null,director_at=null,lesson_id=null,updated_at=clock_timestamp();
 elsif new.kind='lesson' and new.status='published' and nullif(new.body->>'reflection_id','') is not null then
  source:=(new.body->>'reflection_id')::uuid;
  if not exists(select 1 from academy_items i where i.id=source and i.kind='reflection' and i.student_id=new.student_id) then return new; end if;
  if exists(select 1 from academy_items i where i.id=source and (i.body-'feedback') is distinct from ((new.body->'reflection')-'feedback')) then
   raise exception '학생 수업기록이 변경되었습니다. 최신 기록을 연결한 일지를 저장한 뒤 발행해주세요';
  end if;
  insert into academy_required_reviews(source_id,lesson_id) values(source,new.id) on conflict(source_id) do update
   set lesson_id=new.id,teacher_id=null,teacher_at=null,director_id=null,director_at=null,updated_at=clock_timestamp();
  -- Publishing acknowledges only the publisher's own role, never both roles.
  if academy_admin() then perform academy_acknowledge_source(source,true);
  elsif academy_assigned_teacher(new.student_id) then perform academy_acknowledge_source(source,false); end if;
 elsif new.kind in ('question','reply') and new.audience='parent' then
  select role='parent' into parent_author from profiles where id=new.owner_id;
  if parent_author then
   if tg_op='UPDATE' and new.body->>'text' is not distinct from old.body->>'text' then return new; end if;
   insert into academy_required_reviews(source_id) values(new.id) on conflict(source_id) do update
    set teacher_id=null,teacher_at=null,director_id=null,director_at=null,updated_at=clock_timestamp();
  elsif tg_op='INSERT' and new.kind='reply' and academy_staff() then
   for r in select rr.source_id from academy_required_reviews rr join academy_items i on i.id=rr.source_id join profiles p on p.id=i.owner_id
    where p.role='parent' and i.audience='parent' and i.student_id=new.student_id and
    (case when new.body ? 'in_reply_to' then i.id=(new.body->>'in_reply_to')::uuid else i.id=(new.body->>'thread')::uuid or i.body->>'thread'=new.body->>'thread' end)
   loop
    if academy_admin() then perform academy_acknowledge_source(r.source_id,true);
    elsif academy_assigned_teacher(new.student_id) then perform academy_acknowledge_source(r.source_id,false); end if;
   end loop;
  end if;
 end if;
 return new;
end $$;
revoke all on function academy_required_review_activity() from public,anon,authenticated;
create trigger zz_academy_required_review_activity after insert or update on academy_items for each row execute function academy_required_review_activity();
-- Keep old clients compatible without letting a director impersonate a homeroom teacher.
create or replace function public.academy_check_comment(p_comment uuid,p_director boolean default false) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform academy_acknowledge_source(p_comment,p_director);
 if not p_director then
  update academy_comment_reviews set teacher_id=auth.uid(),teacher_at=clock_timestamp(),updated_at=clock_timestamp() where comment_id=p_comment;
  perform academy_notify_comment(p_comment,'teacher_checked');
 end if;
end $$;
-- Existing records need explicit acknowledgement; do not guess who reviewed them.
insert into academy_required_reviews(source_id,lesson_id)
select i.id,(select l.id from academy_items l where l.kind='lesson' and l.status='published' and l.student_id=i.student_id and l.body->>'reflection_id'=i.id::text order by l.updated_at desc limit 1)
from academy_items i join profiles p on p.id=i.owner_id
where (i.kind='reflection' and i.status<>'draft') or (i.kind in ('question','reply') and i.audience='parent' and p.role='parent');
commit;
