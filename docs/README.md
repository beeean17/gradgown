# gradgown 문서

데이터베이스 과목 텀 프로젝트 문서다. 운영 중인 grad42(Firebase)를 MySQL 기반으로 옮기는 과제용 구현을 다룬다.

작업 규칙(지킬 것, 결정을 다루는 방법, 커밋 방식)은 저장소 루트의 [AGENTS.md](../AGENTS.md)에 있다.

| 폴더 | 내용 |
|---|---|
| [requirements/](./requirements/) | [과제 요구사항](./requirements/course-requirements.md)과 [보고서 요구사항·충족 현황](./requirements/report-requirements.md) |
| [decisions/](./decisions/) | 결정 기록. 결정 하나에 문서 하나 |
| [contracts/](./contracts/) | 웹과 서버 사이의 계약. [web-api.md](./contracts/web-api.md)는 초안이다 |
| [testing/](./testing/) | 테스트 계획. [개요](./testing/README.md), [정적 계열](./testing/static.md), [동적 계열](./testing/dynamic.md). 스키마·권한 테스트의 도구만 확정이고 나머지는 제안이다 |

## 구현 현황 (2026-11-18)

DB, 서버 둘, 웹 둘을 만들었다. 실행 방법은 저장소 루트의 [README.md](../README.md)에 있다.

| 무엇 | 어디 | 상태 |
|---|---|---|
| 테이블 11개, 공지 뷰, 계정 셋과 `GRANT`, 시드 데이터 | `db/init/*.sql` | MySQL 8.4.13에서 적용됨 |
| 개발용 MySQL | `compose.yaml`, `db/conf/gradgown.cnf` | 띄워서 확인함 |
| 도메인 규칙, 입력 검증, 응답 타입 | `core/` | 단위 테스트 통과 |
| 학생용 서버: 로그인, 조회, 예약·신청 명령 | `student-server/` | 통합·동시성·계약 테스트 통과 |
| 관리자용 서버: 로그인, 명단 검색, 집계, 접수 열기·닫기 | `admin-server/` | 통합 테스트 통과 |
| 학생 웹 | `web/` | 원본을 가져와 데이터 계층을 학생용 서버로 바꿈. 타입·린트·빌드 통과. 브라우저에서 흐름 확인 |
| 관리자 앱 | `admin-web/` | 원본을 가져와 관리자용 서버로 바꾸고 범위 밖 화면을 없앰. 타입·린트·빌드 통과. 브라우저에서 조회 흐름 확인 |
| 평가용 측정 | `eval/` | MySQL과 Firestore 에뮬레이터에 같은 데이터를 넣고 측정함. 결과는 `eval/results/` |
| CI | `.github/workflows/` | GitHub에서 통과함(2026-11-19). 컴파일, 웹 검사 둘, MySQL 테스트 |

테스트는 로컬에서 `./gradlew test`로 돈다(257개). 층별 개수와 방법, 테스트를 쓰지 않은 쪽의 검증에서 나온 결함과 알고도 고치지 않은 것은 [testing/dynamic.md](./testing/dynamic.md)에 있다.

## 결정 기록

상태는 세 가지다. **확정**은 직접 정한 것, **잠정**은 제안에 이견이 없어 그대로 진행하는 것, **초안·제안**은 아직 확인하지 않은 것이다.

| 결정 | 상태 | 문서 |
|---|---|---|
| 주제는 grad42의 Firebase → MySQL 이전이다 | 확정 | [topic.md](./decisions/topic.md) |
| 과제용 구현이고 실제 운영에는 쓰지 않는다 | 확정 | [project-positioning.md](./decisions/project-positioning.md) |
| 학위복 대여와 St:talk 두 서비스를 모두 구현한다 | 확정 | [scope.md](./decisions/scope.md) |
| MySQL과 Spring Boot로 만든다 | DB 확정, 나머지 잠정 | [tech-stack.md](./decisions/tech-stack.md) |
| 서버는 Spring JDBC(`JdbcClient`)로 DB에 접근한다. SQL을 직접 쓴다 | 확정 | [tech-stack.md](./decisions/tech-stack.md) |
| 학생 웹과 관리자 앱을 둘 다 가져온다. 단체의 이름·문의 채널·약관 문구는 원본 그대로 둔다 | 확정 | [tech-stack.md](./decisions/tech-stack.md) |
| 모듈은 `db`, `core`, `student-server`, `admin-server`로 둔다 | 확정 | [tech-stack.md](./decisions/tech-stack.md) |
| localhost에서만 실행한다 | 확정 | [local-only.md](./decisions/local-only.md) |
| MySQL은 Docker 컨테이너로 띄운다 | 확정 (구성은 제안) | [mysql-docker.md](./decisions/mysql-docker.md) |
| MySQL 이미지는 `mysql:8.4`다 | 확정 | [mysql-docker.md](./decisions/mysql-docker.md) |
| 스키마는 초기화 SQL 파일로만 관리한다 | 확정 | [mysql-docker.md](./decisions/mysql-docker.md) |
| 스키마·권한 테스트는 JUnit과 Testcontainers로 쓴다 | 확정 | [testing/dynamic.md](./testing/dynamic.md) |
| DB 계정에 `GRANT`를 직접 준다. role은 쓰지 않고, 테이블은 초기화 때 root가 만든다 | 확정 | [db-privileges.md](./decisions/db-privileges.md) |
| Google 로그인 대신 테스트 계정으로 로그인한다. 계정 목록에서 고르고 비밀번호는 없다 | 확정 | [test-login.md](./decisions/test-login.md) |
| 학생용과 관리자용 서버를 나눈다 | 확정 | [admin-server-split.md](./decisions/admin-server-split.md) |
| 관리자용 서버는 로그인한 사람의 등급으로 DB 계정을 고른다. 관리자의 쓰기는 MySQL이 거부한다 | 확정 | [admin-server-split.md](./decisions/admin-server-split.md) |
| 관리자 쪽의 쓰기는 마스터의 접수 열기·닫기 하나다 | 확정 | [scope.md](./decisions/scope.md) |
| 테스터 권한은 넣지 않는다 | 확정 | [scope.md](./decisions/scope.md) |
| 학생 DB 계정의 `UPDATE`를 컬럼 단위로 좁힌다 | 확정 | [db-privileges.md](./decisions/db-privileges.md) |
| 역할 간 경계는 DB 권한으로, 사용자 간 경계는 서버 코드로 지킨다 | 확정 (권한 표는 초안) | [db-privileges.md](./decisions/db-privileges.md) |
| CI는 GitHub Actions로 돌린다 | 확정 (작업 구성은 제안) | [ci.md](./decisions/ci.md) |
| Firestore 구조를 테이블 11개로 옮긴다 | 잠정 (DDL의 세부는 확정) | [data-model.md](./decisions/data-model.md) |
| 시드 데이터의 날짜는 고정한다 | 확정 | [mysql-docker.md](./decisions/mysql-docker.md) |
| 평가는 DB 수준 비교를 중심으로 한다 | 제안 | [evaluation.md](./decisions/evaluation.md) |
| 조회 구조 넷과 프론트 번들을 측정한다. 실제 규모와 100배 규모에서, Firebase 쪽은 로컬 에뮬레이터로 잰다 | 확정 | [evaluation.md](./decisions/evaluation.md) |

## 아직 정하지 않은 것

| 항목 | 어디에 영향을 주나 |
|---|---|
| 개발용 DB의 데이터를 남길지, 이미지 태그를 패치 버전까지 고정할지 | [mysql-docker.md](./decisions/mysql-docker.md) |
| 보고서의 분량 기준·언어, 개요, ER 다이어그램, 참고 문헌 | [requirements/report-requirements.md](./requirements/report-requirements.md) |
| Spring Boot 버전 | [tech-stack.md](./decisions/tech-stack.md) |
| API의 경로 이름과 응답 모양, 관리자 앱을 가져올 범위 | [contracts/web-api.md](./contracts/web-api.md) |
| 두 서버의 포트 | [admin-server-split.md](./decisions/admin-server-split.md) |
| 정적 검사 도구, 서버를 띄우는 테스트에서 DB를 되돌리는 방법, 브라우저 테스트 자동화 | [testing/README.md](./testing/README.md) |
| CI를 언제 돌릴지, 실패한 채 병합되는 것을 막을지 | [ci.md](./decisions/ci.md) |
| 과제 쪽 미확인 사항 (제출 기한, 배점, 개인/팀, 제출 형식, 보고서 언어) | [requirements/course-requirements.md](./requirements/course-requirements.md) |

## 원본 서비스

grad42 저장소는 `~/dev/projects/grad42`에 있다. 이 문서들이 근거로 삼은 것은 2026-11-13 기준 main의 다음 문서다.

- `firebase/docs/data-model.md` — 현재 Firestore 구조
- `docs/requirements/gown-reservation.md`, `docs/requirements/mentoring.md` — 두 서비스의 요구사항
- `docs/contracts/reservation-command.md`, `mentoring-command.md`, `audit-log.md` — 서버 명령 계약
- `docs/perf/2026-11-04-baseline.md` — 학생 웹 성능 기준값
