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
grant usage on schema public,auth,storage to authenticated,service_role;grant select,insert on storage.objects to authenticated;`);
for(const f of ['202609180001_academy_workflow','202610080001_past_reflections','202610140003_lock_published_reflections'])
  await db.exec(fs.readFileSync(new URL(`../supabase/migrations/${f}.sql`,import.meta.url),'utf8'));
const A='00000000-0000-4000-8000-000000000001',S='00000000-0000-4000-8000-000000000002';
await db.query(`insert into profiles(id,role,name) values($1,'admin','원장'),($2,'student','학생')`,[A,S]);
await db.query(`insert into students(id,school_year) values($1,'초3')`,[S]);
async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function save(i){return (await db.query('select * from academy_save($1::jsonb,$2::timestamptz)',[JSON.stringify(i),i.updated_at||null])).rows[0];}
const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
await as(S);
let r=await save({kind:'reflection',student_id:S,status:'submitted',day:today,body:{period:'오늘 수업',learned:'배움',assignment:'숙제'}});
let r2=await save({kind:'reflection',student_id:S,status:'submitted',day:today,body:{period:'보충 수업',learned:'배움2',assignment:'숙제2'}});
r=await save({...r,body:{...r.body,learned:'고친 배움'}});                    // 발행 전에는 학생이 고칠 수 있음
await db.exec('reset role');
await db.query(`insert into academy_items(kind,student_id,owner_id,title,status,day,audience,body) values('lesson',$1,$2,'오늘 수업','published',$3,'student',$4::jsonb)`,[S,A,today,JSON.stringify({reflection_id:r.id})]);
await as(S);
await assert.rejects(()=>save({...r,body:{...r.body,learned:'또 고침'}}),/더 이상 고칠 수 없어요/);   // 발행 후 학생은 못 고침
await save({...r2,body:{...r2.body,learned:'다른 기록은 가능'}});                 // 발행 안 된 다른 기록은 가능
await as(A);
const fresh=(await db.query('select * from academy_items where id=$1',[r.id])).rows[0];
await save({...fresh,updated_at:fresh.updated_at.toISOString(),body:{...fresh.body,feedback:'잘했어요'}});  // 선생님은 수정 가능
console.log('PASS: published student records are locked for the student, other records stay editable, staff can still edit');
