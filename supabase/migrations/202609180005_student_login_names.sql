-- Keep UUIDs, passwords and all student-linked records unchanged.
begin;
create or replace function public.sync_student_login_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_email text;
begin
  if new.role <> 'student' or new.login_id is not distinct from old.login_id then return new; end if;
  if nullif(btrim(new.login_id),'') is null then raise exception '로그인 아이디가 필요합니다.'; end if;
  target_email := 'u' || encode(convert_to(new.login_id,'UTF8'),'hex') || '@eaglemath.local';
  update auth.users set email=target_email,
    raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb) || jsonb_build_object('login_id',new.login_id),
    updated_at=now() where id=new.id;
  if not found then raise exception '학생 인증 계정이 없습니다.'; end if;
  update auth.identities set identity_data=jsonb_set(identity_data,'{email}',to_jsonb(target_email)),updated_at=now()
    where user_id=new.id and provider='email';
  if not found then raise exception '학생 이메일 인증 정보가 없습니다.'; end if;
  return new;
end $$;
revoke all on function public.sync_student_login_email() from public, anon, authenticated;
create trigger sync_student_login_email after update of login_id on public.profiles
for each row execute function public.sync_student_login_email();

create temp table student_login_changes on commit drop as
select p.id,p.login_id old_login_id,
  case when p.name in ('김하준','김민준','이다연') then
    p.name || case left(s.school_year,1) when '초' then substring(s.school_year from 2)::int
      when '중' then substring(s.school_year from 2)::int+6
      when '고' then substring(s.school_year from 2)::int+9 end::text
    else btrim(p.name) end new_login_id,
  u.encrypted_password password_before
from public.profiles p join public.students s on s.id=p.id join auth.users u on u.id=p.id
where p.role='student' and s.status is distinct from '삭제';
do $$ begin
  if exists(select 1 from student_login_changes where nullif(new_login_id,'') is null)
    or exists(select 1 from student_login_changes group by new_login_id having count(*)>1)
    or exists(select 1 from student_login_changes c join public.profiles p on p.login_id=c.new_login_id
      where not exists(select 1 from student_login_changes x where x.id=p.id)) then
    raise exception '아이디 중복 또는 학년 정보 누락: 변경을 취소합니다.';
  end if;
end $$;
-- Two phases handle usernames currently held by another student in the same batch.
update public.profiles p set login_id='migration-' || p.id::text from student_login_changes c
where p.id=c.id and c.old_login_id is distinct from c.new_login_id;
update public.profiles p set login_id=c.new_login_id from student_login_changes c
where p.id=c.id and p.login_id is distinct from c.new_login_id;
do $$ begin
  if exists(select 1 from student_login_changes c join auth.users u on u.id=c.id
    where u.encrypted_password is distinct from c.password_before
      or u.email <> 'u' || encode(convert_to(c.new_login_id,'UTF8'),'hex') || '@eaglemath.local') then
    raise exception '계정 검증 실패: 변경을 취소합니다.';
  end if;
end $$;
select count(*) as students_checked,count(*) filter(where old_login_id<>new_login_id) as ids_changed from student_login_changes;
commit;
