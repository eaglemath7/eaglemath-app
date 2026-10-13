# 자동채점 — 설치와 사용

학생이 문제집 페이지를 찍으면 문항별 O/X가 나오고, 선생님은 학생×문항 결과표와 확인 대기함으로 관리합니다.
알림장 상단의 **자동채점** 버튼 → `/grading/` 페이지 (알림장 로그인을 그대로 사용, 학부모에게는 버튼이 보이지 않음).

## 동작 방식

1. 학생이 교재를 고르고 페이지 사진을 찍음 → 사진은 `academy-private/<본인 id>/grading/` 에 저장
2. `grading-check` 함수(locate): AI가 **인쇄된 문제 번호**와 문제 영역을 찾음 (정답지에 있는 번호만 남김)
3. 브라우저가 문제별로 사진을 잘라 크게 만든 뒤 전송
4. `grading-check` 함수(grade): 문항 사진 + 전체 페이지를 **두 번 독립적으로** 읽음
   - AI에게 정답은 보여주지 않고 "답의 형식"(객관식 번호, 수+단위, 분수 등)만 알려줌
   - 네모가 없어도 '답:' 칸·밑줄·동그라미·풀이 마지막 값 순서로 최종 답을 찾도록 지시
   - 정답 비교는 AI가 아니라 코드(`judge`)가 함
5. 두 판독의 O/X 판정이 같으면 확정, 다르거나 흐리면 **확인 중**(선생님 확인 대기)
6. 학생 화면에는 O / X / 확인 중과 "읽은 답"만 보이고, 정답은 보이지 않음

## 설치 순서 (Supabase 대시보드에서)

1. **SQL Editor** → `supabase/migrations/202610140001_auto_grading.sql` 전체를 붙여넣고 Run
2. **Edge Functions** → Deploy a new function → Via Editor → 이름 `grading-check`
   → `supabase/functions/grading-check/index.ts` 전체 붙여넣기 → Deploy
   → "Verify JWT"는 **끄기** (함수 안에서 직접 로그인을 확인함)
   → 현재 운영 주소(slug)는 대시보드가 자동으로 정한 `rapid-action`이고(표시 이름 grading-check),
     `grading/grading.js`의 `GRADING_FUNCTION`이 이 주소를 부릅니다. 함수를 새 주소로 다시 배포하면 이 값도 바꾸세요.
3. **Edge Functions → Secrets**: `ANTHROPIC_API_KEY`는 알림장 AI용으로 이미 등록되어 있으면 그대로 사용
   - 선택: `GRADING_MODEL` (채점에 쓸 모델 이름. 없으면 `ANTHROPIC_MODEL` 값을 씀)
   - 선택: `GEMINI_API_KEY` + `GEMINI_MODEL` 둘 다 넣으면 두 번째 판독을 Gemini가 맡음 (서로 다른 AI가 교차 확인)
4. 이 브랜치를 main에 합치면 GitHub Pages에 버튼과 채점 페이지가 올라감
   (1·2번보다 먼저 합치면 채점 페이지가 열리기만 하고 동작하지 않으니 순서를 지켜주세요)
5. 원장 계정으로 자동채점 → **정답지** 탭 → 교재 이름 입력, 정답 JSON 파일 선택 → 정답지 올리기

## 정답지 파일 주의

- **이 저장소는 공개(public) 저장소입니다. 정답 JSON 파일은 저장소에 올리지 마세요.**
  정답지는 4-5번처럼 화면에서 올리면 DB에만 저장되고, DB에서는 직원만 읽을 수 있습니다.
- 파일 형식: `{"book": "교재 이름", "answers": [{"no": 1, "answer": "⑤", "type": "choice", "plain": "5"}, ...]}`
- 유형(type): choice, multi_choice, symbol, integer, number_unit, fraction, mixed_fraction, text, symbol_text, multi_blank, unit_text

## 채점 기준 (교재별, 정답지 탭에서 변경)

- 단위를 빠뜨려도 정답 (기본: 켬) — `20권`에 `20`
- 크기가 같은 분수도 정답 (기본: 끔) — `14/7`에 `2`. 가분수·대분수 단원은 형태를 묻는 문제가 많아 기본은 꺼둠
- 객관식은 `3`과 `③`, 기호는 `나`와 `㉯`를 같게 봄. 띄어쓰기는 무시
- 안 푼 문제(두 판독 모두 빈칸)는 결과를 만들지 않음

## 처음 운영할 때

- 처음 몇 주는 **확인 대기**와 결과표의 X를 자주 열어 실제 판독이 맞는지 확인하세요.
  확정할 때마다 `auto_verdict`(AI 판정)와 `verdict`(최종)가 함께 남아, 나중에 유형별 AI 정확도를 계산할 수 있습니다.
- 인식률은 실제 학생 사진으로 재봐야 알 수 있습니다. 실제 페이지 사진 수십 장으로 먼저 시험해 보길 권합니다.

## 테스트

`node tests/grading.test.mjs` — 모든 답 유형의 판정 규칙, 두 판독 합치기, 학생이 정답을 못 읽는지, 본인 최신 결과만 보이는지, 직원 확정과 원장 전용 정답지 올리기.
