-- v3 패치: 키워드 체크/해제, 확인 처리를 서버에서 원자적으로 처리
-- (학생/학부모가 같은 계정으로 동시에 조작해도 데이터가 유실되지 않도록)
--
-- 적용 방법: Supabase Dashboard > SQL Editor > New query 에 전체 붙여넣고 Run.

-- 키워드 체크/해제를 한 번의 원자적 UPDATE로 처리 (기존: 읽고 → 고치고 → 통째로 저장,
-- 새 방식: DB 안에서 "지금 값 기준으로" 바로 토글하므로 동시 요청이 순서대로 안전하게 처리됨)
create or replace function toggle_confirmation_keyword(p_record_id uuid, p_keyword text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid := auth.uid();
  v_version integer;
begin
  select version into v_version from lesson_records where id = p_record_id;
  if v_version is null then
    raise exception 'record not found';
  end if;

  insert into record_confirmations (record_id, student_id, version, keywords)
  values (p_record_id, v_student_id, v_version, array[p_keyword])
  on conflict (record_id, student_id) do update
  set keywords = case
    when p_keyword = any(record_confirmations.keywords)
      then array_remove(record_confirmations.keywords, p_keyword)
    else array_append(record_confirmations.keywords, p_keyword)
  end;
end;
$$;
grant execute on function toggle_confirmation_keyword(uuid, text) to authenticated;
