# v2 배포 가이드 (CLI 설치 없이, 대시보드에서 전부 진행)

이 순서대로 하면 됩니다. 전부 웹 브라우저에서 [supabase.com](https://supabase.com)
대시보드로 진행하고, 별도 프로그램 설치가 필요 없습니다.

## 0. 준비

- 이미 실제로 쓰던 학생 데이터가 있다면, 관리자 화면의 "데이터 백업" 버튼으로 먼저
  JSON을 받아두세요. (테스트 계정만 있는 상태라면 건너뛰어도 됩니다.)

## 1. 데이터베이스 스키마 적용

1. Supabase 대시보드 → 해당 프로젝트 → 왼쪽 메뉴 **SQL Editor** → **New query**
2. 이 저장소의 [`supabase-schema-v2.sql`](./supabase-schema-v2.sql) 파일을 열어
   전체 내용을 복사(⌘+C) → SQL Editor에 붙여넣기(⌘+V)
3. **Run** 클릭
4. "Success. No rows returned" 비슷한 메시지가 뜨면 완료입니다.

⚠️ 이 스크립트는 기존 v1 테이블(`students`, `teachers`, `app_state` 등)을 전부
삭제하고 새로 만듭니다. 0번에서 백업하지 않았다면 지금이라도 백업하세요.

## 2. Edge Function 2개 배포 (대시보드에서, CLI 없이)

왼쪽 메뉴 **Edge Functions** 로 이동합니다.

**함수 1: admin-create-user**
1. **Deploy a new function** → **Via Editor** (코드 직접 입력) 선택
2. 함수 이름(Name)에 정확히 `admin-create-user` 입력
3. 코드 에디터 내용을 전부 지우고, 이 저장소의
   [`supabase/functions/admin-create-user/index.ts`](./supabase/functions/admin-create-user/index.ts)
   파일 전체를 복사해서 붙여넣기
4. **Deploy function** 클릭

**함수 2: admin-reset-password**
1. 다시 **Deploy a new function** → **Via Editor**
2. 함수 이름에 정확히 `admin-reset-password` 입력
3. [`supabase/functions/admin-reset-password/index.ts`](./supabase/functions/admin-reset-password/index.ts)
   전체 내용을 붙여넣기
4. **Deploy function** 클릭

두 함수 모두 "Verify JWT"(또는 "Enforce JWT verification") 옵션이 있다면
**꺼주세요(off)** — 함수 안에서 자체적으로 호출자를 검증하고, 로그인 자체는
service_role 없이 진행되므로 이 옵션이 켜져 있으면 정상 동작을 막을 수 있습니다.
(기본값이 꺼짐이면 그대로 두면 됩니다.)

## 3. 첫 관리자 계정 만들기 (부트스트랩)

Edge Function으로 계정을 만들려면 "이미 관리자인 사람"이 있어야 하는데, 맨 처음엔
아무도 없으니 이번 한 번만 직접 만듭니다.

1. 왼쪽 메뉴 **Authentication** → **Users** → **Add user** → **Create new user**
2. Email: `u61646d696e@eaglemath.local` (이 값을 정확히 그대로 입력 — "admin"이라는
   로그인 아이디를 앱과 같은 규칙으로 미리 변환해둔 값입니다)
3. Password: 원하는 비밀번호 입력 (예: 임시로 `changeme1234`, 나중에 앱에서 바꾸세요)
4. **Auto Confirm User** 체크 (있다면 반드시 체크)
5. 생성한 유저를 클릭해서 **User UID**(uuid 형식 문자열)를 복사해둡니다.
6. 다시 **SQL Editor** → **New query**로 이동해서 아래 SQL의 `<복사한 UID>` 자리에
   방금 복사한 값을 붙여넣고 실행합니다.

```sql
insert into profiles (id, role, name, login_id, phone, active, must_change_password)
values ('<복사한 UID>', 'admin', '관리자', 'admin', null, true, false);
```

이제 앱에서 아이디 `admin`, 비밀번호는 5번에서 정한 값으로 로그인할 수 있습니다.
로그인 후 첫 화면에서 강사/학생 계정을 추가로 등록하면 됩니다 (이후 계정은
Edge Function이 자동으로 만들어주므로 이런 수동 작업이 필요 없습니다).

## 4. 로컬에서 확인

```bash
cd eaglemath-app
python3 -m http.server 4173
```

`http://localhost:4173` 접속 → `admin` / (3번에서 정한 비밀번호)로 로그인 →
관리자 화면에서 강사·학생 등록 테스트.

## 5. GitHub에 반영 + GitHub Pages 배포

로컬에서 확인이 끝나면:

```bash
git add -A
git commit -m "v2: Supabase Auth + RLS로 전환"
git push
```

GitHub 저장소 Settings → Pages에서 배포 브랜치를 켜두면 자동으로 반영됩니다.
(이미 켜져 있다면 push만으로 자동 재배포됩니다.)

## 문제가 생기면

- 로그인이 안 되면: 브라우저 개발자도구(F12) → Console 탭에서 에러 메시지 확인.
  대부분 이메일 변환값 오타이거나, Edge Function의 "Verify JWT" 옵션이 켜져있는
  경우입니다.
- RLS 때문에 "관리자인데도 데이터가 안 보인다"면: 3번의 `profiles` insert가
  제대로 됐는지, role이 정확히 `admin`인지 SQL Editor에서
  `select * from profiles;` 로 확인하세요.
