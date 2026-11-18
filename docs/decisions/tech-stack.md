# MySQL과 Spring Boot로 만든다

- 상태: DB는 확정, 서버·프론트는 잠정 (2026-11-13). 서버의 DB 접근 방식과 모듈 구성은 2026-11-18에 확정했다
- 관련: [local-only.md](./local-only.md), [data-model.md](./data-model.md), [과제 요구사항](../requirements/course-requirements.md)

## 결정

| 층 | 선택 | 상태 |
|---|---|---|
| DB | MySQL 8.x. Docker 컨테이너로 띄운다([mysql-docker.md](./mysql-docker.md)) | 확정 |
| 서버 | Spring Boot (Java). 학생용과 관리자용 서버 둘([admin-server-split.md](./admin-server-split.md)) | 잠정. 처음부터 "Spring이 아니어도 된다"는 조건이었다. 서버를 둘로 나누는 것은 확정 |
| 프론트 | grad42의 `web/`, `admin-web/`(React)을 가져와 데이터 계층만 REST 호출로 바꾼다 | 잠정 |

## 이유

- **MySQL**: 슬라이드가 예시로 드는 DB이고, 설치와 연결 방법도 슬라이드에 있다.
- **Spring Boot**: 실제 이전 계획과 같은 방향이라 여기서 해 본 것이 그대로 참고가 된다.
- **프론트 재사용**: 화면을 새로 만들 필요가 없다. 같은 화면에서 데이터 계층만 바뀌므로 Firebase 버전과 비교하기도 쉽다.

과제는 스택을 따지지 않는다("I do not care about Programming model or DB"). 그래서 스택 선택보다 DB 설계와 SQL이 보고서에 드러나는 것이 중요하다.

## 지켜야 할 것

- **DDL은 직접 쓴다.** 스키마를 자동 생성에 맡기지 않는다. 테이블과 제약이 보고서의 핵심 내용이다.
- **핵심 쿼리는 SQL이 보이게 둔다.** 보고서에 "DB와 상호작용하는 코드"로 실을 수 있어야 한다.

## 서버의 DB 접근 방식 (확정, 2026-11-18)

**Spring JDBC의 `JdbcClient`를 쓴다.** 저장소 클래스에 SQL을 문자열로 직접 쓴다. JPA와 MyBatis는 쓰지 않는다.

- "핵심 쿼리는 SQL이 보이게 둔다"는 조건에 그대로 맞는다. 보고서에 실을 "DB와 상호작용하는 코드"가 곧 저장소 클래스다.
- UNIQUE 위반(1062)이나 권한 거부(1142) 같은 MySQL 오류를 서비스가 직접 받아서 API 오류로 바꾼다. 스키마가 규칙을 지킨다는 것이 코드에 드러난다.
- 생성 컬럼과 복합 FK를 엔티티에 맞추는 일이 없다.

grad42의 `feat/spring-migration` 브랜치는 JPA와 Querydsl을 쓴다. 이 프로젝트는 그와 다른 방식이 된다. 실제 이전에 참고가 되는 것은 스키마와 SQL이고, 접근 계층의 코드는 아니다.

## 모듈 구성 (확정, 2026-11-18)

| 모듈 | 내용 | 의존 |
|---|---|---|
| `db` | SQL 파일과 스키마·권한 테스트 | — |
| `core` | 두 서버가 함께 쓰는 코드. 도메인 규칙(기간 판정, 입력 검증), 응답 타입, 오류 형식. 웹 프레임워크와 DB에 기대지 않는다 | — |
| `student-server` | 학생용 서버. 학생 DB 계정의 설정과 SQL | `core` |
| `admin-server` | 관리자용 서버. 조회·마스터 DB 계정의 설정과 SQL | `core` |

SQL과 DB 계정 설정은 `core`에 두지 않고 서버마다 따로 가진다. 그래서 학생용 서버가 마스터 계정의 설정을 참조할 수 없다는 것이 모듈 경계로 지켜진다([정적 계열](../testing/static.md)의 구조 규칙). 네 모듈 모두 만들었다(2026-11-18).

## 빌드 구성 (2026-11-16)

DB 테스트를 JUnit으로 쓰기로 하면서([동적 계열](../testing/dynamic.md)) 빌드 구성이 먼저 생겼다.

| 항목 | 선택 | 상태 |
|---|---|---|
| 스키마 관리 | 초기화 SQL 파일만 쓴다. 마이그레이션 도구는 쓰지 않는다([mysql-docker.md](./mysql-docker.md)) | 확정 |
| 빌드 도구 | Gradle. 저장소 루트가 다중 모듈 빌드다 | 잠정 |
| Java | 21 | 잠정 |
| Spring Boot | 4.1.2. 2026-11-18 기준 최신 안정 버전이다. 두 서버가 이 버전으로 돈다 | 제안 |

Gradle은 wrapper(`./gradlew`)로 실행한다. 버전은 9.9.1이고, 따로 설치할 필요가 없다.

```sh
./gradlew test                      # 전체 테스트. Docker가 켜져 있어야 한다
./gradlew :student-server:bootRun   # 학생용 서버, 127.0.0.1:8080
./gradlew :admin-server:bootRun     # 관리자용 서버, 127.0.0.1:8081
```

서버를 띄우려면 개발용 MySQL이 먼저 떠 있어야 한다([mysql-docker.md](./mysql-docker.md)).

## 미정

- 프론트를 어느 범위까지 가져올지. 학생 웹과 관리자 앱 둘 다인지, 일부 화면만인지
