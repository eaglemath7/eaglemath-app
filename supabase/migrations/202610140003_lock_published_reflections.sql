-- 선생님이 학생 수업기록으로 알림장을 발행하면, 학생은 그 기록을 더 이상 고칠 수 없습니다.
-- (학부모가 보는 알림장과 학생 원문이 달라지지 않도록) 선생님은 계속 수정할 수 있습니다.
begin;
create or replace function public.academy_lock_published_reflection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
 if old.kind = 'reflection' and not academy_staff() and exists (
   select 1 from academy_items l
   where l.kind = 'lesson' and l.status = 'published' and l.body->>'reflection_id' = old.id::text
 ) then
  raise exception '선생님이 확인해서 알림장으로 발행한 기록이라 더 이상 고칠 수 없어요';
 end if;
 return new;
end;
$$;
drop trigger if exists trg_lock_published_reflection on public.academy_items;
create trigger trg_lock_published_reflection before update or delete on public.academy_items
 for each row when (old.kind = 'reflection') execute function public.academy_lock_published_reflection();
commit;
