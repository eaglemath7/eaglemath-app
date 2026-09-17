begin;
create table public.academy_comment_reviews (
 comment_id uuid primary key references public.academy_items(id) on delete cascade,
 teacher_id uuid references public.profiles(id), teacher_at timestamptz,
 updated_at timestamptz not null default now()
);
create table public.academy_comment_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles(id),
 comment_id uuid not null references public.academy_items(id) on delete cascade,
 actor_id uuid references public.profiles(id),
 event text not null check(event in ('comment','edited','teacher_checked','reply')),
 created_at timestamptz not null default clock_timestamp(), checked_at timestamptz
);
alter table academy_comment_reviews enable row level security;
alter table academy_comment_notifications enable row level security;
create policy comment_reviews_read on academy_comment_reviews for select to authenticated using(academy_staff());
create policy comment_notifications_read on academy_comment_notifications for select to authenticated using(recipient_id=auth.uid() and academy_admin());
revoke all on academy_comment_reviews,academy_comment_notifications from anon,authenticated;
grant select on academy_comment_reviews,academy_comment_notifications to authenticated;
create index on academy_comment_notifications(recipient_id,checked_at);
create function public.academy_notify_comment(p_comment uuid,p_event text) returns void
language sql security definer set search_path=public as $$
 insert into academy_comment_notifications(recipient_id,comment_id,actor_id,event)
 select id,p_comment,auth.uid(),p_event from profiles where active and role in ('admin','deputy');
$$;
revoke all on function academy_notify_comment(uuid,text) from public,anon,authenticated;
create function public.academy_comment_activity() returns trigger language plpgsql security definer set search_path=public as $$
declare r record; parent_author boolean;
begin
 if new.kind not in ('reply','question') or new.audience<>'parent' then return new; end if;
 select role='parent' into parent_author from profiles where id=new.owner_id;
 if parent_author then
  if tg_op='UPDATE' and new.body->>'text' is not distinct from old.body->>'text' then return new; end if;
  insert into academy_comment_reviews(comment_id) values(new.id)
   on conflict(comment_id) do update set teacher_id=null,teacher_at=null,updated_at=clock_timestamp();
  perform academy_notify_comment(new.id,case when tg_op='INSERT' then 'comment' else 'edited' end);
 elsif tg_op='INSERT' and new.kind='reply' and academy_staff() then
  -- Explicit comment replies acknowledge only that comment; normal thread replies
  -- acknowledge parent messages already present in the same conversation.
  for r in select cr.comment_id from academy_comment_reviews cr join academy_items i on i.id=cr.comment_id
   where (case when new.body ? 'in_reply_to' then i.id=(new.body->>'in_reply_to')::uuid
     else i.id=(new.body->>'thread')::uuid or i.body->>'thread'=new.body->>'thread' end)
   and i.student_id=new.student_id and i.audience='parent'
   for update of cr
  loop
   update academy_comment_reviews set teacher_id=auth.uid(),teacher_at=clock_timestamp(),updated_at=clock_timestamp() where comment_id=r.comment_id;
   perform academy_notify_comment(r.comment_id,'reply');
  end loop;
 end if;
 return new;
end $$;
create trigger academy_comment_activity after insert or update on academy_items for each row execute function academy_comment_activity();
revoke all on function academy_comment_activity() from public,anon,authenticated;
create function public.academy_check_comment(p_comment uuid,p_director boolean default false) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not academy_staff() then raise exception '직원만 확인할 수 있습니다'; end if;
 perform 1 from academy_comment_reviews where comment_id=p_comment for update;
 if not found then raise exception '코멘트를 찾을 수 없습니다'; end if;
 if p_director then
  if not academy_admin() then raise exception '원장 확인 권한이 없습니다'; end if;
  update academy_comment_notifications set checked_at=clock_timestamp() where comment_id=p_comment and recipient_id=auth.uid() and checked_at is null;
 else
  update academy_comment_reviews set teacher_id=auth.uid(),teacher_at=clock_timestamp(),updated_at=clock_timestamp() where comment_id=p_comment and teacher_at is null;
  if found then perform academy_notify_comment(p_comment,'teacher_checked'); end if;
 end if;
end $$;
revoke all on function academy_check_comment(uuid,boolean) from public,anon;
grant execute on function academy_check_comment(uuid,boolean) to authenticated;
-- Include comments that predate this migration.
insert into academy_comment_reviews(comment_id)
select i.id from academy_items i join profiles p on p.id=i.owner_id where i.kind in ('reply','question') and i.audience='parent' and p.role='parent';
insert into academy_comment_notifications(recipient_id,comment_id,actor_id,event)
select p.id,r.comment_id,i.owner_id,'comment' from academy_comment_reviews r join academy_items i on i.id=r.comment_id cross join profiles p where p.active and p.role in ('admin','deputy');
commit;
