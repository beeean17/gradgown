# gradgown 문서

데이터베이스 과목 텀 프로젝트 문서다. 운영 중인 grad42(Firebase)를 MySQL 기반으로 옮기는 과제용 구현을 다룬다.

| 폴더 | 내용 |
|---|---|
| [course-materials/](./course-materials/) | 과제 안내 슬라이드 PDF 원본 4개 |
| [requirements/](./requirements/) | 과제 요구사항 분석 |
| [decisions/](./decisions/) | 결정 기록. 결정 하나에 문서 하나 |
| [contracts/](./contracts/) | 웹과 서버 사이의 계약. [web-api.md](./contracts/web-api.md)는 초안이다 |

## 결정 기록

상태는 세 가지다. **확정**은 직접 정한 것, **잠정**은 제안에 이견이 없어 그대로 진행하는 것, **초안·제안**은 아직 확인하지 않은 것이다.

| 결정 | 상태 | 문서 |
|---|---|---|
| 주제는 grad42의 Firebase → MySQL 이전이다 | 확정 | [topic.md](./decisions/topic.md) |
| 과제용 구현이고 실제 운영에는 쓰지 않는다 | 확정 | [project-positioning.md](./decisions/project-positioning.md) |
| 학위복 대여와 St:talk 두 서비스를 모두 구현한다 | 확정 | [scope.md](./decisions/scope.md) |
| MySQL과 Spring Boot로 만든다 | DB 확정, 나머지 잠정 | [tech-stack.md](./decisions/tech-stack.md) |
| localhost에서만 실행한다 | 확정 | [local-only.md](./decisions/local-only.md) |
| Google 로그인 대신 테스트 계정으로 로그인한다 | 확정 | [test-login.md](./decisions/test-login.md) |
| Firestore 구조를 테이블 11개로 옮긴다 | 초안 | [data-model.md](./decisions/data-model.md) |
| 평가는 DB 수준 비교를 중심으로 한다 | 제안 | [evaluation.md](./decisions/evaluation.md) |

## 아직 정하지 않은 것

| 항목 | 어디에 영향을 주나 |
|---|---|
| MySQL을 어떻게 띄울지 (Docker, 직접 설치 등) | [local-only.md](./decisions/local-only.md) |
| Spring에서 DB에 접근하는 방식 (JPA, JDBC 등) | [tech-stack.md](./decisions/tech-stack.md) |
| 관리자 기능을 어디까지 넣을지 (설정 저장, 공지·FAQ 작성, 명단 내보내기) | [scope.md](./decisions/scope.md) |
| 테스터 권한을 넣을지 | [scope.md](./decisions/scope.md), [data-model.md](./decisions/data-model.md) |
| 테스트 로그인의 구체적인 방식 | [test-login.md](./decisions/test-login.md) |
| API 응답 모양, 쓰기 경로의 형태, 관리자 앱을 가져올 범위 | [contracts/web-api.md](./contracts/web-api.md) |
| 과제 쪽 미확인 사항 (제출 기한, 배점, 개인/팀, 제출 형식, 보고서 언어) | [requirements/course-requirements.md](./requirements/course-requirements.md) |

## 원본 서비스

grad42 저장소는 `~/dev/projects/grad42`에 있다. 이 문서들이 근거로 삼은 것은 2026-11-13 기준 main의 다음 문서다.

- `firebase/docs/data-model.md` — 현재 Firestore 구조
- `docs/requirements/gown-reservation.md`, `docs/requirements/mentoring.md` — 두 서비스의 요구사항
- `docs/contracts/reservation-command.md`, `mentoring-command.md`, `audit-log.md` — 서버 명령 계약
- `docs/perf/2026-11-04-baseline.md` — 학생 웹 성능 기준값
