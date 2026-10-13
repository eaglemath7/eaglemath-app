import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;
create schema auth;create schema storage;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table profiles(id uuid primary key,role text,name text,login_id text,active boolean default true);
create table students(id uuid primary key references profiles(id),school_year text,school_name text);
create table lesson_records(id uuid primary key default gen_random_uuid(),student_id uuid,content text,parent_message text,student_message text,next_plan text,focus text,hidden boolean default false,is_draft boolean default false);alter table lesson_records enable row level security;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
grant usage on schema public,auth,storage to authenticated,service_role;`);
for(const f of ['202609180001_academy_workflow','202610140005_student_siblings'])await db.exec(fs.readFileSync(new URL(`../supabase/migrations/${f}.sql`,import.meta.url),'utf8'));
const id=n=>`00000000-0000-4000-8000-00000000000${n}`;const [A,B,C,P,Q]=[id(1),id(2),id(3),id(4),id(5)];
await db.query(`insert into profiles(id,role,name) values($1,'student','가언니'),($2,'student','나동생'),($3,'student','다남'),($4,'parent','엄마'),($5,'parent','다른엄마')`,[A,B,C,P,Q]);
await db.query(`insert into students(id,school_year) values($1,'초5'),($2,'초2'),($3,'초3')`,[A,B,C]);
await db.query(`insert into parent_students values($1,$2),($1,$3),($4,$5)`,[P,A,B,Q,C]);
async function as(u){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u]);await db.exec('set role authenticated');}
const sib=async u=>{await as(u);return (await db.query('select name from academy_siblings()')).rows.map(r=>r.name);};
assert.deepEqual(await sib(A),['가언니','나동생']);
assert.deepEqual(await sib(B),['가언니','나동생']);
assert.deepEqual(await sib(C),['다남']);          // 형제 없음 → 본인만 (고르기 화면 안 뜸)
assert.deepEqual(await sib(P),[]);                // 학부모 계정에는 해당 없음
console.log('PASS: siblings are students linked to the same parent; others and parents get no sibling list');
