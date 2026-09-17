begin;
create table public.academy_task_archives (
 task_id uuid primary key references public.academy_items(id),
 archived_by uuid not null references public.profiles(id),
 archived_at timestamptz not null default clock_timestamp(),
 is_archived boolean not null default true,
 snapshot jsonb not null
);
alter table academy_task_archives enable row level security;
create policy task_archives_read on academy_task_archives for select to authenticated using (
 exists(select 1 from academy_items i where i.id=task_id and academy_can_read(i))
);
revoke all on academy_task_archives from anon,authenticated;
grant select on academy_task_archives to authenticated;
create function public.academy_archive_task(p_id uuid,p_expected timestamptz,p_restore boolean default false) returns void
language plpgsql security definer set search_path=public as $$
declare i academy_items;
begin
 select * into i from academy_items where id=p_id and kind='task' for update;
 if not academy_staff() or i.id is null or not academy_can_read(i) then raise exception '업무 확인 권한이 없습니다'; end if;
 if not academy_admin() and not(i.owner_id=auth.uid() and i.audience='private') then raise exception '배정받은 업무는 원장 확인 후 보관됩니다'; end if;
 if p_expected is null or i.updated_at<>p_expected then raise exception '업무가 변경됐습니다. 새로고침 후 확인해주세요'; end if;
 if i.status<>'done' then raise exception '완료한 업무만 보관할 수 있습니다'; end if;
 if p_restore then
  update academy_task_archives set is_archived=false where task_id=i.id and is_archived;
 else
  insert into academy_task_archives(task_id,archived_by,snapshot) values(i.id,auth.uid(),to_jsonb(i))
  on conflict(task_id) do update set archived_by=excluded.archived_by,archived_at=clock_timestamp(),is_archived=true,snapshot=excluded.snapshot
  where not academy_task_archives.is_archived;
 end if;
 if found then insert into academy_audit(item_id,actor_id,action,after_data) values(i.id,auth.uid(),case when p_restore then 'task_restore' else 'task_archive' end,to_jsonb(i)); end if;
end $$;
revoke all on function academy_archive_task(uuid,timestamptz,boolean) from public,anon;
grant execute on function academy_archive_task(uuid,timestamptz,boolean) to authenticated;
create function public.academy_guard_archived_task() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.kind='task' and exists(select 1 from academy_task_archives where task_id=old.id and is_archived) then raise exception '보관된 업무는 완료 기록에서 복원 후 변경해주세요'; end if;
 return new;
end $$;
create trigger academy_guard_archived_task before update on academy_items for each row execute function academy_guard_archived_task();
revoke all on function academy_guard_archived_task() from public,anon,authenticated;
commit;
