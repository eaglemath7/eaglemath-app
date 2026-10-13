import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {latestByStudentNo,rangeOptions,cropRect,fitScale,summarize,parseAnswerFile} from '../grading/grading-lib.js';

// ---------------------------------------------------------------- 1. 판정 규칙 (Edge Function의 JUDGE 블록을 그대로 실행)
const src=fs.readFileSync(new URL('../supabase/functions/grading-check/index.ts',import.meta.url),'utf8');
const block=src.slice(src.indexOf('// JUDGE-START'),src.indexOf('// JUDGE-END'));
const {judge,combine}=new Function(block+';return {judge,combine};')();
const K=(no,answer,type,spec={})=>({no,answer,type,spec});
const loose={unit_optional:true,fraction_equivalent:false};
const cases=[
 // 객관식: 숫자로 써도, 동그라미 번호로 써도, '번'을 붙여도 정답
 [K(1,'⑤','choice',{plain:'5'}),'5','O'],[K(1,'⑤','choice',{plain:'5'}),'⑤','O'],[K(1,'⑤','choice',{plain:'5'}),'5번','O'],[K(1,'⑤','choice',{plain:'5'}),'3','X'],
 // 기호
 [K(49,'㉠','symbol',{plain:'ㄱ'}),'ㄱ','O'],[K(49,'㉠','symbol',{plain:'ㄱ'}),'㉠','O'],[K(110,'㉯','symbol',{plain:'나'}),'나','O'],[K(110,'㉯','symbol',{plain:'나'}),'(나)','O'],[K(110,'㉯','symbol',{plain:'나'}),'다','X'],
 // 복수 정답: 순서·구분자 무관
 [K(195,'③, ⑤','multi_choice',{items:['③','⑤'],items_plain:['3','5']}),'5,3','O'],[K(195,'③, ⑤','multi_choice',{items:['③','⑤'],items_plain:['3','5']}),'3 5','O'],[K(195,'③, ⑤','multi_choice',{items:['③','⑤'],items_plain:['3','5']}),'3','X'],
 // 정수
 [K(4,'40','integer',{value:40}),'40','O'],[K(4,'40','integer',{value:40}),'4 0','O'],[K(3,'1116','integer',{value:1116}),'1,116','O'],[K(4,'40','integer',{value:40}),'41','X'],[K(4,'40','integer',{value:40}),'사십?','null'],
 // 수+단위: 단위 생략 허용 규칙
 [K(20,'20권','number_unit',{value:20,unit:'권'}),'20권','O'],[K(20,'20권','number_unit',{value:20,unit:'권'}),'20','O'],[K(20,'20권','number_unit',{value:20,unit:'권'}),'20개','X'],[K(20,'20권','number_unit',{value:20,unit:'권'}),'21권','X'],
 [K(3,'1116cm','number_unit',{value:1116,unit:'cm'}),'1116㎝','O'],[K(665,'600mL','number_unit',{value:600,unit:'mL'}),'600 ml','O'],[K(750,'약 145g','number_unit',{value:145,unit:'g',prefix:'약'}),'145g','O'],
 // 분수: 기본은 형태까지 같아야 정답
 [K(429,'13/6','fraction',{num:13,den:6}),'13/6','O'],[K(429,'13/6','fraction',{num:13,den:6}),'6분의 13','O'],[K(432,'14/7','fraction',{num:14,den:7}),'2','X'],[K(429,'13/6','fraction',{num:13,den:6}),'2 1/6','X'],
 // 대분수: 띄어쓰기가 있어야 대분수로 읽음("13/5"는 가분수)
 [K(437,'1 3/5','mixed_fraction',{whole:1,num:3,den:5}),'1 3/5','O'],[K(437,'1 3/5','mixed_fraction',{whole:1,num:3,den:5}),'1과 5분의 3','O'],[K(437,'1 3/5','mixed_fraction',{whole:1,num:3,den:5}),'13/5','X'],[K(437,'1 3/5','mixed_fraction',{whole:1,num:3,den:5}),'8/5','X'],
 // 낱말·이름
 [K(99,'하윤','text'),'하윤','O'],[K(874,'개나리 마을','text'),'개나리마을','O'],[K(99,'하윤','text'),'하은','X'],
 [K(576,'㉯ 그릇','symbol_text',{plain:'나 그릇'}),'나','O'],[K(576,'㉯ 그릇','symbol_text',{plain:'나 그릇'}),'나 그릇','O'],[K(576,'㉯ 그릇','symbol_text',{plain:'나 그릇'}),'가','X'],
 [K(423,'(위에서부터)13, 8','multi_blank',{values:[13,8]}),'13, 8','O'],[K(423,'(위에서부터)13, 8','multi_blank',{values:[13,8]}),'8, 13','X'],
 [K(757,'g','unit_text'),'g','O'],[K(757,'g','unit_text'),'kg','X'],
 [K(1,'⑤','choice',{plain:'5'}),'','null'],
];
for(const [key,read,want] of cases){
 const got=judge(key,read,loose);
 assert.equal(String(got),want,`${key.no}번 정답 ${key.answer} / 읽음 "${read}" → ${got}, 기대 ${want}`);
}
// 규칙 바꾸기
assert.equal(judge(K(20,'20권','number_unit',{value:20,unit:'권'}),'20',{unit_optional:false}),'X');
assert.equal(judge(K(432,'14/7','fraction',{num:14,den:7}),'2',{fraction_equivalent:true}),'O');
assert.equal(judge(K(436,'11/11','fraction',{num:11,den:11}),'1',{fraction_equivalent:true}),'O');
assert.equal(judge(K(429,'13/6','fraction',{num:13,den:6}),'2 1/6',{fraction_equivalent:true}),'O');
// 두 판독 합치기: 일치할 때만 확정
const key=K(20,'20권','number_unit',{value:20,unit:'권'});
const A=(final,status='answered',candidates=[])=>({final,status,candidates});
assert.equal(combine(key,A('20권'),A('20'),loose).verdict,'O');           // 표기는 달라도 판정이 같으면 확정
assert.equal(combine(key,A('21권'),A('21'),loose).verdict,'X');
assert.equal(combine(key,A('20권'),A('28권'),loose).verdict,'pending');  // 판정이 갈리면 보류
assert.equal(combine(key,A('20','unclear',['20','28']),A('20'),loose).verdict,'pending');
assert.equal(combine(key,A('20'),A('','blank'),loose).verdict,'pending');  // 한쪽만 답을 봄
assert.equal(combine(key,A('','blank'),A('','blank'),loose),null);         // 안 푼 문제는 결과 없음
assert.equal(combine(key,A('20',undefined,['20','28']),A('20'),loose).verdict,'pending');

// ---------------------------------------------------------------- 2. 화면 보조 함수
assert.deepEqual(rangeOptions(120),[[1,50],[51,100],[101,120]]);
assert.deepEqual(rangeOptions(0),[]);
assert.deepEqual(cropRect([100,200,500,400],1000,2000,0),{x:100,y:400,w:400,h:400});
assert.deepEqual(cropRect([0,0,1000,1000],800,600,0.05),{x:0,y:0,w:800,h:600});
assert.deepEqual(cropRect([500,500,400,400],800,600,0),{x:0,y:0,w:800,h:600});
assert.equal(fitScale(4000,3000,2000),0.5);assert.equal(fitScale(800,600,2000),1);
const latest=latestByStudentNo([{student_id:'s',no:1,attempt:1,verdict:'X',created_at:'1'},{student_id:'s',no:1,attempt:2,verdict:'O',created_at:'2'},{student_id:'t',no:1,attempt:1,verdict:'pending',created_at:'1'}]);
assert.equal(latest.get('s:1').verdict,'O');assert.equal(latest.get('t:1').verdict,'pending');
assert.deepEqual(summarize([{verdict:'O'},{verdict:'O'},{verdict:'X'},{verdict:'pending'}]),{O:2,X:1,pending:1});
assert.equal(parseAnswerFile(JSON.stringify({book:'책',answers:[{no:1,answer:'⑤',type:'choice'}]})).title,'책');
assert.throws(()=>parseAnswerFile(JSON.stringify({answers:[{no:1,answer:'1',type:'integer'},{no:1,answer:'2',type:'integer'}]})),/중복/);

// ---------------------------------------------------------------- 3. DB 권한 (정답 비공개, 본인 결과만, 직원 확정)
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
grant usage on schema public,auth,storage to authenticated,service_role;
grant select,insert on storage.objects to authenticated;`);
await db.exec(fs.readFileSync(new URL('../supabase/migrations/202609180001_academy_workflow.sql',import.meta.url),'utf8'));
await db.exec(fs.readFileSync(new URL('../supabase/migrations/202610140001_auto_grading.sql',import.meta.url),'utf8'));
const ADM='00000000-0000-4000-8000-000000000001',S1='00000000-0000-4000-8000-000000000002',S2='00000000-0000-4000-8000-000000000003',PAR='00000000-0000-4000-8000-000000000004',T='00000000-0000-4000-8000-000000000005';
await db.query(`insert into profiles(id,role,name) values($1,'admin','원장'),($2,'student','학생1'),($3,'student','학생2'),($4,'parent','학부모'),($5,'teacher','강사')`,[ADM,S1,S2,PAR,T]);
await db.query(`insert into students(id,school_year) values($1,'초3'),($2,'초3')`,[S1,S2]);
async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
const answers=[{no:1,answer:'⑤',type:'choice',plain:'5'},{no:20,answer:'20권',type:'number_unit',value:20,unit:'권'}];
await as(T);await assert.rejects(()=>db.query('select grading_import_key($1,$2::jsonb)',['책',JSON.stringify(answers)]),/원장/);
await as(S1);await assert.rejects(()=>db.query('select grading_import_key($1,$2::jsonb)',['책',JSON.stringify(answers)]),/원장/);
await as(ADM);
await assert.rejects(()=>db.query('select grading_import_key($1,$2::jsonb)',['책',JSON.stringify([{no:1,answer:'',type:'choice'}])]),/빠진/);
const book=(await db.query('select grading_import_key($1,$2::jsonb) id',['독수리유형 - 초등수학3-2',JSON.stringify(answers)])).rows[0].id;
assert.equal((await db.query('select spec from grading_keys where no=20')).rows[0].spec.unit,'권');
// 같은 이름으로 다시 올리면 교체
await db.query('select grading_import_key($1,$2::jsonb)',['독수리유형 - 초등수학3-2',JSON.stringify(answers.slice(0,1))]);
assert.equal((await db.query('select count(*)::int n from grading_keys')).rows[0].n,1);
await db.query('select grading_import_key($1,$2::jsonb)',['독수리유형 - 초등수학3-2',JSON.stringify(answers)]);
// 학생·학부모는 정답을 못 봄, 교재 이름은 학생이 봄
await as(S1);assert.equal((await db.query('select * from grading_keys')).rows.length,0);assert.equal((await db.query('select * from grading_books')).rows.length,1);
await as(PAR);assert.equal((await db.query('select * from grading_keys')).rows.length,0);
await as(T);assert.equal((await db.query('select * from grading_keys')).rows.length,2);
// 학생은 결과를 직접 쓰거나 남의 결과를 볼 수 없음
await db.exec('reset role');
const sub=(await db.query(`insert into grading_submissions(student_id,book_id,submitted_by,photo_path) values($1,$2,$1,$3) returning id`,[S1,book,S1+'/grading/a.jpg'])).rows[0].id;
const sub2=(await db.query(`insert into grading_submissions(student_id,book_id,submitted_by,photo_path) values($1,$2,$1,$3) returning id`,[S2,book,S2+'/grading/b.jpg'])).rows[0].id;
await db.query(`insert into grading_results(submission_id,student_id,book_id,no,attempt,recognized,verdict,auto_verdict) values($1,$2,$3,1,1,'3','X','X'),($1,$2,$3,20,1,'2O','pending','pending')`,[sub,S1,book]);
await db.query(`insert into grading_results(submission_id,student_id,book_id,no,attempt,recognized,verdict,auto_verdict) values($1,$2,$3,1,1,'5','O','O')`,[sub2,S2,book]);
const sub3=(await db.query(`insert into grading_submissions(student_id,book_id,submitted_by,photo_path) values($1,$2,$1,$3) returning id`,[S1,book,S1+'/grading/c.jpg'])).rows[0].id;
await db.query(`insert into grading_results(submission_id,student_id,book_id,no,attempt,recognized,verdict,auto_verdict) values($1,$2,$3,1,2,'5','O','O')`,[sub3,S1,book]);
await as(S1);
assert.equal((await db.query('select * from grading_results')).rows.length,0);
await assert.rejects(()=>db.query(`insert into grading_results(submission_id,student_id,book_id,no,verdict) values($1,$2,$3,5,'O')`,[sub,S1,book]));
let mine=(await db.query('select * from grading_my_results($1)',[book])).rows;
assert.deepEqual(mine.map(r=>[r.no,r.verdict,r.attempt]),[[1,'O',2],[20,'pending',1]]);   // 최신 시도만
assert(!JSON.stringify(mine).includes('⑤')&&!JSON.stringify(mine).includes('20권'));        // 정답 미포함
mine=(await db.query('select * from grading_my_results($1,$2)',[book,S2])).rows;                  // 남의 학생 id를 넣어도 본인 것만
assert.deepEqual(mine.map(r=>r.no),[1,20]);
await db.exec('reset role');const anyResult=(await db.query('select id from grading_results limit 1')).rows[0].id;await as(S1);
await assert.rejects(()=>db.query("select grading_confirm($1,'O')",[anyResult]),/직원/);
await as(PAR);assert.equal((await db.query('select * from grading_my_results($1)',[book])).rows.length,0);
// 직원: 전체 결과 조회, 특정 학생 결과 조회, 보류 확정
await as(T);
assert.equal((await db.query('select * from grading_results')).rows.length,4);
assert.deepEqual((await db.query('select no,verdict from grading_my_results($1,$2)',[book,S2])).rows,[{no:1,verdict:'O'}]);
const pend=(await db.query("select id from grading_results where verdict='pending'")).rows[0].id;
await assert.rejects(()=>db.query("select grading_confirm($1,'pending')",[pend]),/O 또는 X/);
await db.query("select grading_confirm($1,'O')",[pend]);
const fixed=(await db.query('select verdict,auto_verdict,confirmed_by from grading_results where id=$1',[pend])).rows[0];
assert.deepEqual([fixed.verdict,fixed.auto_verdict,fixed.confirmed_by],['O','pending',T]);
// 교재 규칙은 원장만 수정
await assert.rejects(async()=>{const r=await db.query(`update grading_books set rules='{"unit_optional":false}' returning id`);if(!r.rows.length)throw new Error('no rows');});
await as(ADM);assert.equal((await db.query(`update grading_books set rules='{"unit_optional":false}' returning id`)).rows.length,1);
console.log('PASS: judge rules for every answer type, two-reader agreement, crop math, answer keys hidden from students/parents, own latest results only, staff confirmation, admin-only key import and rules');
