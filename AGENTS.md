# AGENTS.md

AI 코딩 에이전트가 이 저장소에서 따르는 지침이다. 모든 세션이 읽으므로 짧게 유지한다. 규칙과 찾아갈 곳만 두고, 내용은 `docs/`에 둔다.

## 프로젝트

데이터베이스 과목 텀 프로젝트다. 운영 중인 grad42(Firebase)의 학위복 대여와 St:talk 신청을 MySQL 기반으로 옮기고 6쪽 보고서로 설명한다. **과제 제출용이고 실제 운영에는 쓰지 않는다.**

현재 진행 상태는 `docs/README.md`의 결정 목록과 "아직 정하지 않은 것"에 있다.

## 문서 지도

| 하려는 일 | 먼저 읽을 문서 |
|---|---|
| 무엇이든 | `docs/README.md` — 전체 문서 목록, 결정의 상태, 미정 항목 |
| 범위 판단 | `docs/decisions/scope.md`, `project-positioning.md` |
| 테이블, 제약, DDL | `docs/decisions/data-model.md` |
| DB 계정, `GRANT`, 뷰 | `docs/decisions/db-privileges.md` |
| 서버와 API | `docs/decisions/admin-server-split.md`, `docs/contracts/web-api.md` |
| 실행 환경 | `docs/decisions/mysql-docker.md`, `local-only.md`, `tech-stack.md` |
| 테스트와 CI | `docs/testing/README.md`, `docs/decisions/ci.md` |
| 보고서 | `docs/requirements/report-requirements.md`, `docs/decisions/evaluation.md` |
| 과제 조건 | `docs/requirements/course-requirements.md` |
| 원본 서비스의 규칙 | `~/dev/projects/grad42`. 근거 문서 목록은 `docs/README.md` "원본 서비스" |

## 반드시 지킬 것

1. **범위를 넘기지 않는다.** 운영 수준의 보안 요소(암호화, 속도 제한, 메일 발송)를 만들지 않는다. 범위 밖 기능이 필요하면 먼저 `scope.md`를 고친다.
2. **실제 개인정보를 넣지 않는다.** 시드 데이터, 테스트, 문서, 화면 자료에는 만들어 낸 값만 쓴다.
3. **공개 저장소다.** 강의 슬라이드(`docs/course-materials/`)와 실제 비밀 값을 커밋하지 않는다.
4. **배포하지 않는다.** 로컬과 CI에서만 실행한다.
5. **grad42 저장소는 읽기만 한다.** 고치거나 커밋하지 않는다.
6. **MySQL은 Docker로 띄우고, DB에 닿는 테스트는 실제 MySQL에서 돌린다.** H2 같은 대체 DB를 쓰지 않는다.
7. **DDL은 직접 쓴다.** 스키마를 자동 생성에 맡기지 않는다. 핵심 쿼리는 SQL이 보이게 둔다.
8. **사용자 간 경계는 서버 코드가 지킨다.** 학생용 서버에서 예약·신청을 다루는 쿼리에는 항상 사용자 ID 조건을 건다. DB 권한은 역할 간 경계만 막는다.
9. **확인하지 않은 것을 확인된 것처럼 쓰지 않는다.** 실행해 보지 않은 설계는 문서에 초안으로 적고 "확인할 것"에 남긴다.

## 결정을 다루는 방법

- 결정 하나에 문서 하나를 `docs/decisions/`에 둔다. 문서 첫머리에 상태와 날짜를 적는다.
- 상태는 **확정**(사용자가 직접 정함), **잠정**(제안에 이견이 없어 진행), **초안·제안**(확인 전)이다. 사용자가 정하지 않은 것을 확정으로 적지 않는다.
- 미정 항목을 임의로 정하지 않는다. 제안과 이유를 내고 확인받는다.
- 결정이 생기거나 바뀌면 그 문서, 영향받는 문서, `docs/README.md`의 결정 목록과 미정 표를 함께 고친다.
- 구현하다 알게 된 것(예상과 다른 동작, 원본과의 차이)은 관련 문서에 적는다. 보고서의 회고에 쓴다.
- 문서는 한국어 평서문으로 쓴다. 상대 링크가 깨지지 않았는지 확인한다.

## 커밋

- 문서 작업은 `docs` 브랜치에서 커밋하고, 끝나면 `main`에 병합한다.
- 코드 작업의 브랜치 방식은 정해지지 않았다. 시작하기 전에 묻는다.
- 푸시는 요청받았을 때만 한다.
- 메시지는 `docs: 테스트 계획을 추가한다`처럼 접두사와 한국어 한 문장으로 쓴다.
- 코드가 생기면 커밋 전에 정적 검사를 돌린다(`docs/testing/static.md`).
