-- Allow students to backfill their own lesson records. Keep original dates immutable.
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
   if role_name<>'student' or n.student_id<>auth.uid() or n.day>(now() at time zone 'Asia/Seoul')::date or n.status not in ('draft','submitted') or (o.id is not null and o.status='approved') then raise exception '오늘 또는 지난 날짜의 본인 학습 정리만 수정할 수 있습니다'; end if;
   if o.id is not null and (n.day<>o.day or n.body->>'period' is distinct from o.body->>'period') then raise exception '기존 기록의 날짜와 수업은 변경할 수 없습니다'; end if;
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
