# 독수리수학 학습 알림장

독수리수학 학원에서 강사가 수업 기록을 작성하고, 학생/학부모가 날짜별 알림장을 확인하는 웹앱입니다.

## v2 — 실사용 가능한 구조로 전환

이전 버전(정적 데모)은 Supabase anon key만으로 전체 데이터에 인증 없이 접근 가능한
심각한 보안 문제가 있었습니다. v2는 **Supabase Auth + Row Level Security + Edge
Functions** 구조로 전면 재구성되어, 역할별 접근 제어가 데이터베이스 단에서
강제됩니다. 자세한 배포 절차는 [DEPLOY_V2.md](./DEPLOY_V2.md)를 참고하세요.

## 주요 기능

- 관리자/부원장/강사/학생 로그인 (Supabase Auth 기반)
- 학생, 강사, 교시, 시간표 관리
- 학생별·교재별로 학년/학기를 따로 지정하는 개별진도 관리
- 오늘 수업 학생 선택 후 학습기록 작성 (정규반 일괄 작성 + 개별 수정)
- 보충/개별 학생 검색 작성
- 출결, 과제수행도, 진도, 수업내용, 과제, 테스트 기록
- 학생 알림장 확인, 키워드 확인, 과제 확인
- 관리자용 기록 숨김/복구
- 브라우저 저장 데이터 JSON 백업(내보내기)

## 실행 방법

별도 설치 없이 `index.html`을 열면 실행됩니다 (모듈 스크립트라 `file://`로 직접
열면 CORS 문제가 날 수 있어, 로컬 서버 사용을 권장합니다).

```bash
python3 -m http.server 4173
```

그다음 `http://localhost:4173`으로 접속합니다.

## GitHub Pages 배포

저장소 루트에 아래 파일을 올린 뒤 GitHub Pages를 켜면 됩니다.

- `index.html`
- `styles.css`
- `app.js`
- `logo.png`

## 데이터 저장 방식 (v2)

모든 데이터는 Supabase Postgres에 저장되며, 브라우저는 로그인한 사용자의 권한
범위 안에서만 데이터를 읽고 씁니다(Row Level Security). 계정 생성과 비밀번호
재설정처럼 비밀키가 필요한 작업만 Supabase Edge Functions가 서버에서 처리합니다.

- `supabase-schema-v2.sql` — 데이터베이스 스키마 + RLS 정책
- `supabase/functions/admin-create-user` — 계정 생성 Edge Function
- `supabase/functions/admin-reset-password` — 비밀번호 재설정 Edge Function

## 보안

- 비밀번호는 Supabase Auth가 해시로 저장하며, 앱 코드에는 어떤 형태로도 남지 않습니다.
- 관리자만 계정 생성/비밀번호 재설정이 가능하며, 이 작업은 반드시 Edge Function을 거칩니다.
- 학생은 본인 기록만, 강사/관리자는 역할에 맞는 범위만 조회·수정할 수 있도록 DB
  Row Level Security로 강제됩니다.
