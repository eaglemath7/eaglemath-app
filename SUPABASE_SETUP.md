# Supabase 연결 안내

현재 앱은 GitHub Pages에서 바로 실행되는 정적 버전이며, 데이터는 브라우저 `localStorage`에 저장됩니다. 여러 기기에서 같은 데이터를 공유하려면 Supabase 또는 별도 서버 API 연결이 필요합니다.

## 1. Supabase 프로젝트 만들기

1. [Supabase](https://supabase.com)에 접속합니다.
2. `New project`를 선택합니다.
3. 프로젝트 이름 예시: `eagle-math-app`
4. 가까운 Region을 선택합니다.
5. Database password를 안전하게 보관합니다.

## 2. 테이블 만들기

Supabase Dashboard에서:

1. `SQL Editor`를 엽니다.
2. `New query`를 선택합니다.
3. `supabase-schema.sql` 내용을 붙여넣습니다.
4. `Run`을 실행합니다.

## 3. API 키 확인

`Project Settings` > `API`에서 아래 값을 확인합니다.

- Project URL
- anon public key
- service_role key

주의:

- `anon public key`는 브라우저에 들어갈 수 있습니다.
- `service_role key`는 절대 `app.js`, GitHub 저장소, GitHub Pages에 넣으면 안 됩니다.
- `service_role key`는 Vercel, Netlify Functions, Cloudflare Workers 같은 서버 환경 변수에만 넣어야 합니다.

## 4. 권장 배포 구조

```text
브라우저 앱
  -> 서버 API
  -> Supabase DB
```

GitHub Pages만으로는 비밀키를 안전하게 숨길 수 없습니다. 실제 운영에서는 서버 API를 한 단계 두고 로그인, 권한, 기록 저장을 처리하는 구조를 권장합니다.

## 5. 다음 개발 작업

- `localStorage` 저장 코드를 Supabase API 호출로 교체
- 서버 로그인 API 추가
- 관리자/부원장/강사/학생 권한 검증을 서버에서 처리
- 학습기록 저장/조회 API 추가
- 학생 확인, 과제 확인 API 추가
- 운영 데이터 마이그레이션 도구 추가
