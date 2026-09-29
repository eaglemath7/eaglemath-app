begin;
create or replace function public.academy_required_review_activity() returns trigger
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
 elsif new.kind in ('question','reply') and new.audience in ('parent','student') then
  select role in ('parent','student') into parent_author from profiles where id=new.owner_id;
  if parent_author then
   if tg_op='UPDATE' and new.body->>'text' is not distinct from old.body->>'text' then return new; end if;
   insert into academy_required_reviews(source_id) values(new.id) on conflict(source_id) do update
    set teacher_id=null,teacher_at=null,director_id=null,director_at=null,updated_at=clock_timestamp();
  elsif tg_op='INSERT' and new.kind='reply' and academy_staff() then
   for r in select rr.source_id from academy_required_reviews rr join academy_items i on i.id=rr.source_id join profiles p on p.id=i.owner_id
    where p.role in ('parent','student') and i.audience=new.audience and i.student_id=new.student_id and
    (case when new.body ? 'in_reply_to' then i.id=(new.body->>'in_reply_to')::uuid else i.id=(new.body->>'thread')::uuid or i.body->>'thread'=new.body->>'thread' end)
   loop
    if academy_admin() then perform academy_acknowledge_source(r.source_id,true);
    elsif academy_assigned_teacher(new.student_id) then perform academy_acknowledge_source(r.source_id,false); end if;
   end loop;
  end if;
 end if;
 return new;
end $$;

insert into academy_required_reviews(source_id)
select i.id from academy_items i join profiles p on p.id=i.owner_id
where p.role='student' and i.kind in ('question','reply') and i.audience='student'
on conflict(source_id) do nothing;
commit;
