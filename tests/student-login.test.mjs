import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table profiles(id uuid primary key,role text,name text,login_id text unique);
create table students(id uuid primary key,school_year text,status text);
create table auth.users(id uuid primary key,email text unique,encrypted_password text,raw_user_meta_data jsonb,updated_at timestamptz);
create table auth.identities(user_id uuid,provider text,identity_data jsonb,updated_at timestamptz);
`);
const rows=[['김민준','초3','김민준-2','재원'],['김민준','초4','김민준','재원'],['백선우','중1','백선우0901','재원'],['삭제학생','초3','삭제학생0101','삭제']];
for(let i=0;i<rows.length;i++){
 const [name,grade,login,status]=rows[i], id=`00000000-0000-4000-8000-00000000000${i+1}`,email=`u${Buffer.from(login).toString('hex')}@eaglemath.local`;
 await db.query('insert into profiles values($1,$2,$3,$4)',[id,'student',name,login]);
 await db.query('insert into students values($1,$2,$3)',[id,grade,status]);
 await db.query('insert into auth.users(id,email,encrypted_password) values($1,$2,$3)',[id,email,'unchanged']);
 await db.query('insert into auth.identities(user_id,provider,identity_data) values($1,$2,$3)',[id,'email',JSON.stringify({email})]);
}
await db.exec(fs.readFileSync('supabase/migrations/202609180005_student_login_names.sql','utf8'));
const result=(await db.query('select p.login_id,u.email,u.encrypted_password,i.identity_data from profiles p join auth.users u using(id) join auth.identities i on i.user_id=p.id order by p.id')).rows;
assert.deepEqual(result.map(r=>r.login_id),['김민준3','김민준4','백선우','삭제학생0101']);
for(const r of result){assert.equal(r.encrypted_password,'unchanged');assert.equal(r.email,r.identity_data.email);assert.equal(r.email,`u${Buffer.from(r.login_id).toString('hex')}@eaglemath.local`);}
await db.exec("update profiles set login_id='백선우7' where name='백선우'");
assert.equal((await db.query("select email from auth.users where id='00000000-0000-4000-8000-000000000003'")).rows[0].email,`u${Buffer.from('백선우7').toString('hex')}@eaglemath.local`);
await assert.rejects(()=>db.exec("update profiles set login_id='김민준3' where name='백선우'"));
const source=fs.readFileSync('app.js','utf8');
const helper=source.slice(source.indexOf('function studentLoginIdBase('),source.indexOf('\nfunction validateStudentPhones'));
const base=new Function(helper+';return studentLoginIdBase;')();
for(const [name,grade,expected] of [['김민준','초5','김민준5'],['이다연','중1','이다연7'],['이다연','중3','이다연9'],['김하준','초3','김하준3'],['김하준','초4','김하준4'],['백선우','중1','백선우']]) assert.equal(base(name,grade),expected);
console.log('PASS: name IDs, duplicate-name grades, auth/identity sync, unchanged passwords and deleted accounts, future edits and collision rollback');
await db.close();
