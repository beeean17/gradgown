# MySQL과 Spring Boot로 만든다

- 상태: DB는 확정, 서버·프론트는 잠정 (2026-11-13)
- 관련: [local-only.md](./local-only.md), [data-model.md](./data-model.md), [과제 요구사항](../requirements/course-requirements.md)

## 결정

| 층 | 선택 | 상태 |
|---|---|---|
| DB | MySQL 8.x | 확정 |
| 서버 | Spring Boot (Java) | 잠정. 처음부터 "Spring이 아니어도 된다"는 조건이었다 |
| 프론트 | grad42의 `web/`, `admin-web/`(React)을 가져와 데이터 계층만 REST 호출로 바꾼다 | 잠정 |

## 이유

- **MySQL**: 슬라이드가 예시로 드는 DB이고, 설치와 연결 방법도 슬라이드에 있다.
- **Spring Boot**: 실제 이전 계획과 같은 방향이라 여기서 해 본 것이 그대로 참고가 된다.
- **프론트 재사용**: 화면을 새로 만들 필요가 없다. 같은 화면에서 데이터 계층만 바뀌므로 Firebase 버전과 비교하기도 쉽다.

과제는 스택을 따지지 않는다("I do not care about Programming model or DB"). 그래서 스택 선택보다 DB 설계와 SQL이 보고서에 드러나는 것이 중요하다.

## 지켜야 할 것

- **DDL은 직접 쓴다.** 스키마를 자동 생성에 맡기지 않는다. 테이블과 제약이 보고서의 핵심 내용이다.
- **핵심 쿼리는 SQL이 보이게 둔다.** 보고서에 "DB와 상호작용하는 코드"로 실을 수 있어야 한다.

## 미정

- Spring에서 DB에 접근하는 방식(JPA, JDBC 등)
- Java와 Spring Boot 버전
- 마이그레이션 도구(Flyway 등)를 쓸지, SQL 파일을 직접 실행할지
- 프론트를 어느 범위까지 가져올지. 학생 웹과 관리자 앱 둘 다인지, 일부 화면만인지
