begin;
-- Return only each authorized student's sessions; never expose the shared roster JSON.
create or replace function public.academy_makeup_json(note text) returns jsonb
language plpgsql immutable set search_path='' as $$
begin return note::jsonb; exception when others then return null; end $$;
revoke all on function public.academy_makeup_json(text) from public,anon,authenticated;
create or replace function public.academy_lesson_sessions(p_day date)
returns table(student_id uuid,period text,lesson_type text,teacher_ids uuid[])
language sql stable security definer set search_path=public as $$
with eligible as (
 select s.id from students s join profiles p on p.id=s.id
 where p.active and s.status is distinct from '삭제' and academy_role() is not null
 and (academy_staff() or s.id=auth.uid() or academy_child(s.id))
), normal as (
 select s.student_id,s.period,coalesce(s.lesson_type,'정규') lesson_type,s.teacher_ids
 from schedules s join eligible e on e.id=s.student_id
 where s.day=(array['일','월','화','수','목','금','토'])[extract(dow from p_day)::int+1]
), makeup as (
 select distinct st.id student_id,'보충 '||(j.b->>'start')||'–'||(j.b->>'end') period,'보충'::text lesson_type,
 array(select distinct t from schedules sc cross join lateral unnest(sc.teacher_ids) t where sc.student_id=st.id) teacher_ids
 from academic_events ev cross join lateral (select academy_makeup_json(ev.note) b) j
 join eligible st on coalesce(j.b->'studentIds','[]'::jsonb) ? st.id::text
 where ev.type='보충' and ev.start_date=p_day and j.b->>'version'='1'
 and j.b->>'start' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 and j.b->>'end' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
)
select * from normal union select * from makeup;
$$;
revoke all on function public.academy_lesson_sessions(date) from public,anon;
grant execute on function public.academy_lesson_sessions(date) to authenticated;

create or replace function public.academy_reflection_source(b jsonb) returns jsonb
language sql immutable set search_path='' as $$
select jsonb_build_object('material',coalesce(b->>'material',''),'unit',coalesce(b->>'unit',''),
'pages',coalesce(b->>'pages',''),'worksheets',coalesce(b->>'worksheets',''),
'content',concat_ws(E'\n',nullif(b->>'content',''),case when coalesce(b->>'pages','')<>'' then '페이지: '||(b->>'pages') end,case when coalesce(b->>'worksheets','')<>'' then '학습지·문항 수: '||(b->>'worksheets') end),
'learned',coalesce(b->>'learned',''),'assignment',coalesce(b->>'assignment',''),'feeling',coalesce(b->>'feeling',''));
$$;
revoke all on function public.academy_reflection_source(jsonb) from public,anon,authenticated;
create or replace function public.academy_link_reflection_draft() returns trigger
language plpgsql security definer set search_path=public as $$
declare existing academy_items; source jsonb; previous jsonb; draft_body jsonb; k text;
begin
 if new.kind<>'reflection' or new.status not in ('submitted','approved') then return new; end if;
 perform pg_advisory_xact_lock(hashtext('reflection-draft:'||new.id::text));
 select * into existing from academy_items where kind='lesson_draft' and student_id=new.student_id and body->>'reflection_id'=new.id::text order by created_at limit 1 for update;
 if existing.id is not null and existing.status<>'draft' then return new; end if;
 source:=academy_reflection_source(new.body);
 previous:=case when TG_OP='UPDATE' then academy_reflection_source(old.body) else '{}'::jsonb end;
 draft_body:=coalesce(existing.body,'{}'::jsonb);
 for k in select jsonb_object_keys(source) loop
  if existing.id is null or not(draft_body ? k) or draft_body->k=previous->k then draft_body:=jsonb_set(draft_body,array[k],source->k); end if;
 end loop;
 draft_body:=draft_body||jsonb_build_object('period',new.body->>'period','reflection_id',new.id,'reflection',new.body);
 if existing.id is null then
  insert into academy_items(kind,student_id,owner_id,title,status,day,audience,body)
  values('lesson_draft',new.student_id,new.owner_id,coalesce(nullif(new.body->>'period',''),'오늘')||' 수업','draft',new.day,'staff',draft_body);
 else
  update academy_items a set body=draft_body,updated_at=clock_timestamp() where a.id=existing.id;
 end if;
 return new;
end $$;
revoke all on function public.academy_link_reflection_draft() from public,anon,authenticated;
create trigger academy_reflection_to_draft after insert or update on public.academy_items
for each row when (new.kind='reflection') execute function public.academy_link_reflection_draft();
-- Link previously submitted records too. Published drafts are left untouched.
update public.academy_items set body=body where kind='reflection' and status in ('submitted','approved');
commit;
