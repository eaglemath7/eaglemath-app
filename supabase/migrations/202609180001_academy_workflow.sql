-- Additive migration. Never run the destructive v2 bootstrap on production.
begin;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(role in ('admin','deputy','teacher','assistant','student','parent'));
create table if not exists public.parent_students (
 parent_id uuid references public.profiles(id) on delete cascade,
 student_id uuid references public.students(id) on delete cascade,
 primary key(parent_id,student_id)
);
create or replace function public.academy_role() returns text language sql stable security definer set search_path=public as $$
 select role from profiles where id=auth.uid() and active;
$$;
create or replace function public.academy_staff() returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(academy_role() in ('admin','deputy','teacher','assistant'),false);
$$;
create or replace function public.academy_admin() returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(academy_role() in ('admin','deputy'),false);
$$;
create or replace function public.academy_child(p_student uuid) returns boolean language sql stable security definer set search_path=public as $$
 select academy_role()='parent' and exists(select 1 from parent_students where parent_id=auth.uid() and student_id=p_student);
$$;
alter table parent_students enable row level security;
create policy parent_students_read on parent_students for select to authenticated using(parent_id=auth.uid() or academy_admin());
-- Parent accounts are distinct; student accounts no longer gain sibling access.
create or replace function public.family_student_ids() returns setof uuid language sql stable security definer set search_path=public as $$
 select id from students where id=auth.uid() and academy_role()='student'
 union select student_id from parent_students where parent_id=auth.uid() and academy_role()='parent';
$$;
create or replace function public.academy_children() returns table(id uuid,name text,school_year text,school_name text) language sql stable security definer set search_path=public as $$
 select s.id,p.name,s.school_year,s.school_name from students s join profiles p on p.id=s.id
 where p.active and (academy_staff() or s.id=auth.uid() or academy_child(s.id));
$$;
create or replace function public.is_teacher_or_staff() returns boolean language sql stable security definer set search_path=public as $$select academy_staff();$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$select academy_admin();$$;
create or replace view public.staff_directory as select id,name,role from profiles where active and role in ('admin','deputy','teacher','assistant');
grant select on public.staff_directory to authenticated;
create table public.academy_items (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('task','class_plan','homework','reflection','attendance','lesson_draft','lesson','student_message','parent_message','question','reply','school_event','assessment','progress')),
 student_id uuid references public.students(id), owner_id uuid not null references public.profiles(id),
 assignee_id uuid references public.profiles(id), audience text not null default 'student' check(audience in ('student','parent','staff','private')),
 title text not null default '', status text not null default 'draft', day date not null default current_date, due_at timestamptz,
 body jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index academy_items_student on academy_items(student_id,kind,day desc);
create index academy_items_assignee on academy_items(assignee_id,kind,status);
create unique index academy_plan_once on academy_items(student_id,day,(body->>'period')) where kind='class_plan';
create unique index academy_assessment_once on academy_items(student_id,day,title,(body->>'category'),(body->>'first_attempt')) where kind='assessment';
create unique index academy_reflection_once on academy_items(student_id,day,(body->>'period')) where kind='reflection';
create unique index academy_attendance_once on academy_items(student_id,day,(body->>'period')) where kind='attendance';
create unique index academy_task_occurrence on academy_items(owner_id,(body->>'template'),day) where kind='task' and body ? 'template';
create or replace function public.academy_can_read(i public.academy_items) returns boolean language sql stable security definer set search_path=public as $$
 select case
 when academy_role() is null then false
 when i.kind='task' then i.owner_id=auth.uid() or i.assignee_id=auth.uid() or (academy_admin() and i.audience='staff')
 when academy_staff() then true
 when i.kind in ('attendance','lesson_draft') then false
 when i.kind='school_event' then i.student_id=auth.uid() or (academy_child(i.student_id) and i.status='approved')
 when i.kind='parent_message' then academy_child(i.student_id) and i.status='published'
 when i.kind='student_message' then i.student_id=auth.uid() and i.status='published'
 when i.kind='lesson' then (i.student_id=auth.uid() or academy_child(i.student_id)) and i.status='published'
 when i.kind in ('question','reply') then (i.audience='student' and i.student_id=auth.uid()) or (i.audience='parent' and academy_child(i.student_id))
 when i.kind='class_plan' then i.student_id=auth.uid()
 when i.kind='reflection' then i.student_id=auth.uid()
 else i.student_id=auth.uid() or academy_child(i.student_id) end;
$$;
alter table academy_items enable row level security;
create policy academy_items_read on academy_items for select to authenticated using(academy_can_read(academy_items));
revoke all on academy_items from anon,authenticated;
grant select on academy_items to authenticated;
create table public.academy_points (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references students(id),
 source_key text not null, reason text not null, points integer not null check(points>=0),
 earned_at timestamptz not null default now(), updated_at timestamptz not null default now(), checked_by uuid references profiles(id),
 unique(student_id,source_key)
);
alter table academy_points enable row level security;
create policy academy_points_read on academy_points for select to authenticated using(academy_staff() or student_id=auth.uid() or academy_child(student_id));
revoke all on academy_points from anon,authenticated;
grant select on academy_points to authenticated;
create table public.academy_audit(id bigint generated always as identity primary key,item_id uuid,actor_id uuid,action text,before_data jsonb,after_data jsonb,created_at timestamptz default now());
alter table academy_audit enable row level security;
create policy academy_audit_read on academy_audit for select to authenticated using(academy_admin());
revoke all on academy_audit from anon,authenticated;
grant select on academy_audit to authenticated;
create or replace function public.academy_award(s uuid,k text,r text,n integer) returns void language sql security definer set search_path=public as $$
 insert into academy_points(student_id,source_key,reason,points,checked_by) values(s,k,r,n,auth.uid())
 on conflict(student_id,source_key) do update set points=excluded.points,reason=excluded.reason,checked_by=auth.uid(),updated_at=now();
$$;
revoke all on function public.academy_award(uuid,text,text,integer) from public,anon,authenticated;
create or replace function public.academy_save(p_item jsonb,p_expected timestamptz default null) returns public.academy_items
language plpgsql security definer set search_path=public as $$
declare
 n academy_items; o academy_items; staff boolean:=academy_staff(); admin boolean:=academy_admin(); role_name text:=academy_role();
 score numeric; total numeric; bonus integer:=0; thread academy_items; f text; file_owner text;
begin
 if role_name is null then raise exception '로그인이 필요합니다'; end if;
 n.id:=coalesce((p_item->>'id')::uuid,gen_random_uuid());
 select * into o from academy_items where id=n.id for update;
 if o.id is not null then
  if not academy_can_read(o) then raise exception '접근 권한이 없습니다'; end if;
  if p_expected is null or o.updated_at<>p_expected then raise exception '다른 사람이 수정했습니다. 새로고침 후 다시 시도해주세요'; end if;
 end if;
 n.kind:=coalesce(o.kind,p_item->>'kind'); n.owner_id:=coalesce(o.owner_id,auth.uid());
 n.student_id:=coalesce(o.student_id,(p_item->>'student_id')::uuid);
 n.assignee_id:=nullif(p_item->>'assignee_id','')::uuid; n.audience:=coalesce(p_item->>'audience','student');
 n.title:=trim(coalesce(p_item->>'title','')); n.status:=coalesce(p_item->>'status','draft');
 n.day:=coalesce((p_item->>'day')::date,current_date); n.due_at:=nullif(p_item->>'due_at','')::timestamptz;
 n.body:=coalesce(p_item->'body','{}');
 if n.kind in ('question','reply') then n.body:=n.body||jsonb_build_object('author_name',(select name from profiles where id=auth.uid())); end if; n.created_at:=coalesce(o.created_at,now()); n.updated_at:=clock_timestamp();
 if length(n.title)>200 or length(n.body::text)>100000 then raise exception '입력 내용이 너무 큽니다'; end if;
 if n.kind<>'task' and n.student_id is null then raise exception '학생을 선택해주세요'; end if;
 if n.kind in ('lesson','student_message','parent_message') then raise exception '게시 기능을 사용해주세요'; end if;
 if n.kind='task' then
  if not staff then raise exception '직원 전용입니다'; end if;
  if n.status not in ('todo','doing','done') then raise exception '잘못된 업무 상태'; end if;
  if n.title='' then raise exception '업무 내용을 입력해주세요'; end if;
  if n.body->>'priority' not in ('high','normal','low') then raise exception '우선순위를 선택해주세요'; end if;
  if not admin then
   if o.id is null and (n.assignee_id is distinct from auth.uid() or n.audience<>'private') then raise exception '업무 배정은 원장만 가능합니다'; end if;
   if o.id is not null and o.owner_id<>auth.uid() then
    if o.assignee_id<>auth.uid() then raise exception '내 업무만 변경 가능합니다'; end if;
    n.title:=o.title;n.body:=o.body;n.assignee_id:=o.assignee_id;n.audience:=o.audience;n.due_at:=o.due_at;n.day:=o.day;
   elsif o.id is not null and (n.assignee_id is distinct from o.assignee_id or n.audience<>o.audience) then raise exception '담당 변경은 원장만 가능합니다'; end if;
  end if;
  if n.assignee_id is not null and not exists(select 1 from profiles where id=n.assignee_id and active and role in ('admin','deputy','teacher','assistant')) then raise exception '직원 담당자를 선택해주세요'; end if;
 elsif n.kind='homework' then
  if not staff then
   if role_name<>'student' or n.student_id<>auth.uid() or o.id is null or o.status not in ('assigned','submitted','returned') or n.status<>'submitted' then raise exception '제출 가능한 본인 과제만 변경할 수 있습니다'; end if;
   if jsonb_array_length(coalesce(n.body->'files','[]'))=0 then raise exception '과제 사진을 첨부해주세요'; end if;
   n.body:=o.body || jsonb_build_object('files',n.body->'files','submitted_at',now());
   n.title:=o.title;n.day:=o.day;n.due_at:=o.due_at;n.assignee_id:=o.assignee_id;n.audience:=o.audience;
  end if;
  if n.status not in ('assigned','submitted','returned','checked') then raise exception '잘못된 과제 상태'; end if;
 elsif n.kind='reflection' then
  if not staff then
   if role_name<>'student' or n.student_id<>auth.uid() or n.day<>(now() at time zone 'Asia/Seoul')::date or n.status not in ('draft','submitted') or (o.id is not null and o.status='approved') then raise exception '오늘의 본인 학습 정리만 수정할 수 있습니다'; end if;
   n.body:=jsonb_build_object('material',n.body->>'material','unit',n.body->>'unit','pages',n.body->>'pages','worksheets',n.body->>'worksheets','learned',n.body->>'learned','assignment',n.body->>'assignment','feeling',n.body->>'feeling','period',n.body->>'period','feedback',o.body->>'feedback');
   if n.status='submitted' and (coalesce(trim(n.body->>'learned'),'')='' or coalesce(trim(n.body->>'assignment'),'')='') then raise exception '배운 내용과 과제를 입력해주세요'; end if;
  end if;
  if n.status not in ('draft','submitted','returned','approved') then raise exception '잘못된 학습 정리 상태'; end if;
 elsif n.kind in ('question','reply') then
  if n.kind='reply' then
   select * into thread from academy_items where id=(n.body->>'thread')::uuid and kind in ('question','lesson');
   if thread.id is null or not academy_can_read(thread) then raise exception '질문이나 알림장을 확인할 수 없습니다'; end if;
   n.student_id:=thread.student_id;
   if thread.kind='question' then n.audience:=thread.audience; end if;
  end if;
  if not staff then
   if n.audience='parent' then
    if not academy_child(n.student_id) then raise exception '연결된 자녀의 대화만 가능합니다'; end if;
   elsif n.audience='student' then
    if n.student_id<>auth.uid() or role_name<>'student' then raise exception '본인 질문만 가능합니다'; end if;
   else raise exception '대화 대상을 확인해주세요'; end if;
   if o.id is not null and o.owner_id<>auth.uid() then raise exception '본인의 글만 수정할 수 있습니다'; end if;
   if n.kind='question' and n.status not in ('open','resolved') then raise exception '잘못된 질문 상태'; end if;
   n.body:=n.body-'ai_draft'-'answer'; n.assignee_id:=o.assignee_id;
  end if;
 elsif n.kind='school_event' then
  if not staff then
   if role_name<>'student' or n.student_id<>auth.uid() or n.status<>'submitted' or (o.id is not null and o.status<>'submitted') then raise exception '본인 학교 일정을 제출해주세요'; end if;
  elsif not admin and n.status='approved' then raise exception '일정 확정은 원장만 가능합니다'; end if;
 elsif n.kind in ('attendance','class_plan','lesson_draft','assessment','progress') then
  if not staff then raise exception '직원 전용입니다'; end if;
 else raise exception '지원하지 않는 기록 종류'; end if;
 -- Files must have been uploaded by this author, or belong to the existing record.
 for f in select jsonb_array_elements_text(coalesce(n.body->'files','[]')) loop
  if not (coalesce(o.body->'files','[]') ? f) then
   file_owner:=split_part(f,'/',1);
   if file_owner<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='academy-private' and name=f) then raise exception '첨부파일을 확인해주세요'; end if;
  end if;
 end loop;
 if n.kind='class_plan' then n.body:=jsonb_build_object('period',n.body->>'period','material',n.body->>'material','unit',n.body->>'unit','content',n.body->>'content','assignment',n.body->>'assignment'); end if;
 if n.kind='assessment' then
  score:=(n.body->>'score')::numeric; total:=(n.body->>'total')::numeric;
  if score is null or total is null or total<=0 or score<0 or score>total then raise exception '점수와 만점을 확인해주세요'; end if;
  n.body:=n.body || jsonb_build_object('percent',round(score/total*100,2));
 end if;
 insert into academy_items select n.* on conflict(id) do update set assignee_id=n.assignee_id,audience=n.audience,title=n.title,status=n.status,day=n.day,due_at=n.due_at,body=n.body,updated_at=n.updated_at;
 insert into academy_audit(item_id,actor_id,action,before_data,after_data) values(n.id,auth.uid(),'save',to_jsonb(o),to_jsonb(n));
 if n.kind='attendance' then
  perform academy_award(n.student_id,'attendance:'||n.day,'출석 체크',case when exists(select 1 from academy_items where kind='attendance' and student_id=n.student_id and day=n.day and status in ('present','late')) then 1 else 0 end);
 elsif n.kind='reflection' then
  perform academy_award(n.student_id,'reflection:'||n.day,'학습 리마인드',case when exists(select 1 from academy_items where kind='reflection' and student_id=n.student_id and day=n.day and status='approved') then 1 else 0 end);
 elsif n.kind='homework' then
  if not staff and n.due_at is not null and now()<=n.due_at then perform academy_award(n.student_id,'homework:'||n.id,'기한 내 과제 제출',1); end if;
  if n.body->>'extra'='true' then perform academy_award(n.student_id,'extra:'||n.id,'추가 학습지 완료',case when n.status='checked' then 1 else 0 end); end if;
 elsif n.kind='assessment' then
  if n.body->>'clinic'='true' then perform academy_award(n.student_id,'clinic:'||n.id,'테스트 오답 클리닉 완료',1); else perform academy_award(n.student_id,'clinic:'||n.id,'테스트 오답 클리닉 완료',0); end if;
  if coalesce(n.body->>'first_attempt','true')='true' then
   if n.body->>'category'='단원평가' and exists(select 1 from students where id=n.student_id and school_year like '초%') and score=total then bonus:=5;
   elsif n.body->>'category' in ('중간고사','기말고사') then bonus:=case when score=total then 10 when score/total>=0.9 then 5 else 0 end; end if;
  end if;
  perform academy_award(n.student_id,'exam:'||n.id,n.title||' 성취 보너스',bonus);
 end if;
 return n;
end;
$$;
revoke all on function public.academy_save(jsonb,timestamptz) from public,anon;
grant execute on function public.academy_save(jsonb,timestamptz) to authenticated;
-- Publish a sanitized common report and two separate audience messages in one transaction.
create or replace function public.academy_publish(p_id uuid,p_expected timestamptz) returns uuid language plpgsql security definer set search_path=public as $$
declare d academy_items; target uuid; k text; b jsonb; aud text;
begin
 if not academy_staff() then raise exception '직원 전용입니다'; end if;
 select * into d from academy_items where id=p_id and kind='lesson_draft' for update;
 if d.id is null or d.updated_at<>p_expected then raise exception '초안을 새로고침해주세요'; end if;
 target:=coalesce((d.body->>'published_id')::uuid,gen_random_uuid());
 foreach k in array array['lesson','student_message','parent_message'] loop
  aud:=case when k='parent_message' then 'parent' else 'student' end;
  b:=case when k='lesson' then d.body-'internal_note'-'student_message'-'parent_message'-'published_id' else jsonb_build_object('text',d.body->>k,'lesson_id',target) end;
  if k='lesson' then
   insert into academy_items(id,kind,student_id,owner_id,title,status,day,audience,body) values(target,k,d.student_id,auth.uid(),d.title,'published',d.day,aud,b)
   on conflict(id) do update set body=excluded.body,updated_at=now();
  else
   delete from academy_items where kind=k and body->>'lesson_id'=target::text;
   insert into academy_items(kind,student_id,owner_id,title,status,day,audience,body) values(k,d.student_id,auth.uid(),d.title,'published',d.day,aud,b);
  end if;
 end loop;
 update academy_items set status='published',body=body||jsonb_build_object('published_id',target),updated_at=now() where id=p_id;
 insert into academy_audit(item_id,actor_id,action,before_data,after_data) values(p_id,auth.uid(),'publish',to_jsonb(d),jsonb_build_object('published_id',target));
 return target;
end;
$$;
revoke all on function public.academy_publish(uuid,timestamptz) from public,anon;
grant execute on function public.academy_publish(uuid,timestamptz) to authenticated;
create or replace function public.academy_ranking(p_months integer default 1,p_start date default null,p_end date default null) returns table(student_id uuid,display_name text,school_group text,total bigint,place bigint)
language sql stable security definer set search_path=public as $$
 with totals as (
 select s.id,p.name,left(coalesce(s.school_year,'미'),1) grp,coalesce(sum(a.points),0)::bigint total
 from students s join profiles p on p.id=s.id and p.active
 left join academy_points a on a.student_id=s.id and a.earned_at>=coalesce(p_start::timestamptz,now()-make_interval(months=>greatest(1,least(p_months,6)))) and a.earned_at<coalesce((p_end+1)::timestamptz,now())
 where academy_role() is not null group by s.id,p.name,s.school_year
 ), ranked as (select *,rank() over(partition by grp order by total desc) pos from totals)
 select id,case when academy_staff() or id=auth.uid() or academy_child(id) then name else left(name,1)||repeat('○',greatest(length(name)-1,1)) end,grp,total,pos from ranked where academy_staff() or pos<=5 or id=auth.uid() or academy_child(id) order by grp,pos;
$$;
revoke all on function public.academy_ranking(integer,date,date) from public,anon;
grant execute on function public.academy_ranking(integer,date,date) to authenticated;
grant execute on function public.academy_children() to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('academy-private','academy-private',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']) on conflict(id) do nothing;
create policy academy_upload on storage.objects for insert to authenticated with check(bucket_id='academy-private' and (storage.foldername(name))[1]=auth.uid()::text and academy_role() is not null);
create policy academy_files_read on storage.objects for select to authenticated using(bucket_id='academy-private' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from academy_items i where i.body->'files' ? name and academy_can_read(i))));
create unique index parent_students_one_account on parent_students(student_id);
create or replace function public.academy_link_family(p_parent uuid,p_students uuid[]) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from profiles where id=p_parent and role='parent' and active) then raise exception '학부모 계정이 아닙니다'; end if;
 if exists(select 1 from parent_students where student_id=any(p_students) and parent_id<>p_parent) then raise exception '이미 다른 학부모 계정에 연결된 학생이 있습니다'; end if;
 delete from parent_students where parent_id=p_parent;
 insert into parent_students(parent_id,student_id) select p_parent,unnest(p_students);
end;
$$;
revoke all on function public.academy_link_family(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.academy_link_family(uuid,uuid[]) to service_role;
-- Legacy records are returned with audience-specific fields removed.
create or replace function public.academy_legacy_records() returns setof jsonb language sql stable security definer set search_path=public as $$
 select case when academy_staff() then to_jsonb(r)
 when academy_role()='parent' then to_jsonb(r)-'student_message'-'next_plan'-'focus'
 else to_jsonb(r)-'parent_message'-'next_plan'-'focus' end
 from lesson_records r where academy_staff() or
 (not r.hidden and not r.is_draft and (r.student_id=auth.uid() or academy_child(r.student_id)));
$$;
revoke all on function public.academy_legacy_records() from public,anon;
grant execute on function public.academy_legacy_records() to authenticated;
drop policy if exists lesson_records_select on lesson_records;
create policy lesson_records_select on lesson_records for select to authenticated using(academy_staff());
commit;
