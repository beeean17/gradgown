# 테스트

- 상태: 제안 (2026-11-14). 코드가 아직 없어서 도구와 명령은 정해지지 않았다
- 관련: [data-model.md](../decisions/data-model.md), [db-privileges.md](../decisions/db-privileges.md), [evaluation.md](../decisions/evaluation.md), [API 계약](../contracts/web-api.md)

검사를 두 계열로 나눈다.

| 계열 | 뜻 | 필요한 것 | 문서 |
|---|---|---|---|
| 정적 | 코드를 실행하지 않고 검사한다 | 소스만 있으면 된다. DB가 없어도 돈다 | [static.md](./static.md) |
| 동적 | 실제로 실행해서 결과를 본다 | MySQL이 떠 있어야 한다 | [dynamic.md](./dynamic.md) |

## 원칙

1. **DB에 닿는 테스트는 실제 MySQL에서 돌린다.** 생성 컬럼, `CHECK`, 복합 FK, `GRANT`, 뷰가 이 프로젝트의 핵심인데 H2 같은 대체 DB는 이것들을 MySQL과 똑같이 처리하지 않는다.
2. **테스트가 보고서의 증빙을 겸한다.** 제약과 권한이 동작한다는 것은 [evaluation.md](../decisions/evaluation.md)의 평가 항목이다. 그 항목마다 테스트를 하나씩 두고, 실행 결과를 보고서에 싣는다.
3. **규칙마다 출처를 적는다.** 테스트 이름이나 주석에 원본 요구사항 ID(RES-22, MNT-25 등)를 남긴다. 어떤 규칙이 어디서 검사되는지 추적할 수 있어야 한다.
4. **DB가 지켜 주지 않는 것을 먼저 테스트한다.** "본인 예약만 본다"는 서버 코드만 지킨다([db-privileges.md](../decisions/db-privileges.md)). 이런 규칙은 테스트가 유일한 안전망이다.
5. **과제 규모에 맞춘다.** 커버리지 목표를 두지 않는다. 도구는 설명할 수 있는 만큼만 넣는다.

## 무엇을 어디서 검사하나

| 검사 대상 | 정적 | 동적 |
|---|---|---|
| 서버 코드가 컴파일되고 형식이 맞는가 | ● | |
| 서버 코드의 구조 규칙 (SQL의 위치, 사용자 ID 전달) | ● | |
| 웹의 타입과 린트 | ● | |
| 웹에 Firebase 의존이 남아 있지 않은가 | ● | |
| DDL이 빈 DB에 적용되는가 | | ● |
| 제약이 잘못된 데이터를 거부하는가 | | ● |
| 계정별 권한이 표대로인가 | | ● |
| 도메인 규칙 (기간 판정, 선택지 검증) | | ● |
| 명령 흐름 (생성, 변경, 취소, 재요청, 충돌) | | ● |
| 다른 사용자의 데이터에 닿지 못하는가 | ● 구조 규칙 | ● |
| 응답 모양이 계약과 같은가 | | ● |
| 화면에서 흐름이 끝까지 되는가 | | ● |

## 원본에서 가져올 것

grad42에는 같은 규칙을 검사하는 테스트가 이미 있다. 테스트 코드를 옮길 수는 없지만 **무엇을 검사하는지**는 그대로 가져온다.

| 원본 | 내용 |
|---|---|
| `firebase/functions/test/*.test.js` | 관리자 명령, St:talk 규칙 |
| `admin-web/tests/emulator.integration.mjs` | 권한 차단, 학생 요청의 거부·성공·재요청, 관리자 수정·취소·충돌 |
| `admin-web/tests/emulator.mentoring.integration.mjs` | St:talk 신청의 권한과 규칙 |
| `admin-web/docs/testing-and-qa.md` | 위 테스트가 지키는 것을 글로 정리한 목록 |
| `web/package.json`, `admin-web/package.json` | 웹의 정적 검사 (`tsc`, `oxlint`) |

## 미정

| 항목 | 영향 |
|---|---|
| 테스트용 MySQL을 어떻게 띄울지 | 동적 계열 전체. [local-only.md](../decisions/local-only.md)의 미정 항목과 같다 |
| 서버의 정적 검사 도구 | [static.md](./static.md) |
| 브라우저 테스트를 자동화할지 | [dynamic.md](./dynamic.md) |
| 자동 실행(CI)을 둘지 | 저장소가 GitHub에 있어 GitHub Actions를 쓸 수 있다. 두지 않으면 커밋 전에 손으로 돌린다 |
