-- 자동채점: 교재 정답지, 사진 제출, 문항별 O/X 결과.
-- Additive migration. 기존 알림장 테이블은 건드리지 않습니다.
-- 학생은 정답지를 읽을 수 없고, 자기 결과는 grading_my_results()로만 봅니다.
begin;

create table if not exists public.grading_books (
 id uuid primary key default gen_random_uuid(),
 title text not null unique,
 active boolean not null default true,
 -- 채점 기준: unit_optional(단위를 빠뜨려도 정답), fraction_equivalent(14/7 자리에 2처럼 크기가 같으면 정답)
 rules jsonb not null default '{"unit_optional":true,"fraction_equivalent":false}',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.grading_keys (
 book_id uuid not null references public.grading_books(id) on delete cascade,
 no integer not null check (no > 0),
 answer text not null,
 type text not null,
 spec jsonb not null default '{}',
 primary key (book_id, no)
);

create table if not exists public.grading_submissions (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 book_id uuid not null references public.grading_books(id) on delete cascade,
 submitted_by uuid not null references public.profiles(id),
 photo_path text not null,
 status text not null default 'located' check (status in ('located','done','failed')),
 problems jsonb not null default '[]',
 error text,
 created_at timestamptz not null default now(),
 graded_at timestamptz
);
create index if not exists grading_submissions_student on public.grading_submissions(student_id, book_id, created_at desc);

create table if not exists public.grading_results (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.grading_submissions(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 book_id uuid not null references public.grading_books(id) on delete cascade,
 no integer not null,
 attempt integer not null default 1,
 read_a text,
 read_b text,
 recognized text,
 auto_verdict text check (auto_verdict in ('O','X','pending')),
 verdict text not null check (verdict in ('O','X','pending')),
 note text,
 crop_path text,
 confirmed_by uuid references public.profiles(id),
 confirmed_at timestamptz,
 created_at timestamptz not null default now(),
 unique (submission_id, no)
);
create index if not exists grading_results_student on public.grading_results(student_id, book_id, no, attempt desc);
create index if not exists grading_results_pending on public.grading_results(verdict) where verdict = 'pending';

alter table public.grading_books enable row level security;
alter table public.grading_keys enable row level security;
alter table public.grading_submissions enable row level security;
alter table public.grading_results enable row level security;

-- 교재 목록: 로그인한 학생·직원 누구나(교재 이름만). 쓰기는 원장·부원장만.
drop policy if exists grading_books_read on public.grading_books;
create policy grading_books_read on public.grading_books for select to authenticated using (academy_role() is not null);
drop policy if exists grading_books_write on public.grading_books;
create policy grading_books_write on public.grading_books for update to authenticated using (academy_admin()) with check (academy_admin());

-- 정답지: 직원만 조회. 학생·학부모는 절대 못 읽음. 쓰기는 grading_import_key()로만.
drop policy if exists grading_keys_read on public.grading_keys;
create policy grading_keys_read on public.grading_keys for select to authenticated using (academy_staff());

-- 제출·결과 원본: 직원만 조회. 쓰기는 Edge Function(service role)과 아래 RPC로만.
drop policy if exists grading_submissions_read on public.grading_submissions;
create policy grading_submissions_read on public.grading_submissions for select to authenticated using (academy_staff());
drop policy if exists grading_results_read on public.grading_results;
create policy grading_results_read on public.grading_results for select to authenticated using (academy_staff());

revoke all on public.grading_books, public.grading_keys, public.grading_submissions, public.grading_results from anon, authenticated;
grant select on public.grading_books, public.grading_keys, public.grading_submissions, public.grading_results to authenticated;
grant update (active, rules, updated_at) on public.grading_books to authenticated;

-- 학생 본인(또는 직원이 지정한 학생)의 문항별 최신 결과. 정답은 돌려주지 않습니다.
create or replace function public.grading_my_results(p_book uuid, p_student uuid default null)
returns table(no integer, verdict text, attempt integer, recognized text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
 select distinct on (r.no) r.no, r.verdict, r.attempt, r.recognized, r.created_at
 from grading_results r
 where r.book_id = p_book
   and r.student_id = case when academy_staff() and p_student is not null then p_student else auth.uid() end
   and (academy_staff() or academy_role() = 'student')
 order by r.no, r.attempt desc, r.created_at desc;
$$;
revoke all on function public.grading_my_results(uuid, uuid) from public, anon;
grant execute on function public.grading_my_results(uuid, uuid) to authenticated;

-- 선생님 확정(보류 해결 또는 판정 정정).
create or replace function public.grading_confirm(p_result uuid, p_verdict text)
returns void language plpgsql security definer set search_path = public as $$
begin
 if not academy_staff() then raise exception '직원 전용입니다'; end if;
 if p_verdict not in ('O','X') then raise exception 'O 또는 X로 확정해주세요'; end if;
 update grading_results set verdict = p_verdict, confirmed_by = auth.uid(), confirmed_at = now() where id = p_result;
 if not found then raise exception '채점 결과를 찾을 수 없습니다'; end if;
end;
$$;
revoke all on function public.grading_confirm(uuid, text) from public, anon;
grant execute on function public.grading_confirm(uuid, text) to authenticated;

-- 정답지 올리기(같은 제목이면 정답 전체 교체). p_answers = [{no, answer, type, ...}]
create or replace function public.grading_import_key(p_title text, p_answers jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare b uuid; n integer;
begin
 if not academy_admin() then raise exception '원장·부원장만 정답지를 올릴 수 있습니다'; end if;
 if coalesce(trim(p_title), '') = '' then raise exception '교재 이름을 입력해주세요'; end if;
 if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) = 0 then raise exception '정답 목록이 비어 있습니다'; end if;
 if jsonb_array_length(p_answers) > 5000 then raise exception '정답이 너무 많습니다'; end if;
 select count(*) into n from jsonb_array_elements(p_answers) a
  where (a->>'no') is null or (a->>'no') !~ '^[0-9]+$' or coalesce(a->>'answer', '') = '' or coalesce(a->>'type', '') = '';
 if n > 0 then raise exception '번호·정답·유형이 빠진 항목이 %개 있습니다', n; end if;
 select count(*) - count(distinct (a->>'no')::int) into n from jsonb_array_elements(p_answers) a;
 if n > 0 then raise exception '중복된 문항 번호가 있습니다'; end if;
 insert into grading_books(title) values (trim(p_title))
  on conflict (title) do update set updated_at = now()
  returning id into b;
 delete from grading_keys where book_id = b;
 insert into grading_keys(book_id, no, answer, type, spec)
  select b, (a->>'no')::int, a->>'answer', a->>'type', a - 'no' - 'answer' - 'type'
  from jsonb_array_elements(p_answers) a;
 return b;
end;
$$;
revoke all on function public.grading_import_key(text, jsonb) from public, anon;
grant execute on function public.grading_import_key(text, jsonb) to authenticated;

-- 직원은 채점용 사진·문항 크롭을 볼 수 있음(학생은 원래 정책대로 자기 폴더만).
drop policy if exists grading_files_read on storage.objects;
create policy grading_files_read on storage.objects for select to authenticated
 using (bucket_id = 'academy-private' and (storage.foldername(name))[2] = 'grading' and academy_staff());

commit;
