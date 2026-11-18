# gradgown

데이터베이스 과목 텀 프로젝트다. 운영 중인 grad42(Firebase)의 학위복 대여와 St:talk 신청을 MySQL 기반으로 옮긴다. 과제용 구현이고 배포하지 않는다.

설계와 결정은 [docs/README.md](./docs/README.md)에, 작업 규칙은 [AGENTS.md](./AGENTS.md)에 있다.

## 구성

| 디렉터리 | 내용 |
|---|---|
| `db/` | 스키마, 뷰, DB 계정과 권한, 시드 데이터(`db/init/*.sql`). 그것을 실제 MySQL에서 검사하는 테스트 |
| `core/` | 두 서버가 함께 쓰는 도메인 규칙과 응답 타입 |
| `student-server/` | 학생용 서버. 학생 DB 계정으로 접속한다 |
| `admin-server/` | 관리자용 서버. 로그인한 사람의 등급에 따라 조회 계정이나 마스터 계정으로 접속한다 |
| `web/` | 학생 웹. grad42의 화면을 그대로 가져와 데이터 계층만 학생용 서버로 바꿨다 |
| `admin-web/` | 관리자 앱. grad42의 화면에서 이 프로젝트의 범위(명단 검색, 집계, 접수 열기·닫기)만 남겼다 |

## 실행

Docker, JDK 21, Node 22가 필요하다. Gradle은 wrapper가 받아 온다. 명령마다 터미널을 하나씩 쓴다.

```sh
docker compose up -d --wait               # MySQL 8.4, 127.0.0.1:3306. 처음 뜰 때 db/init이 실행된다
./gradlew :student-server:bootRun         # 학생용 서버, 127.0.0.1:8080
./gradlew :admin-server:bootRun           # 관리자용 서버, 127.0.0.1:8081
(cd web && npm ci && npm run dev)         # 학생 웹, http://127.0.0.1:5173
(cd admin-web && npm ci && npm run dev)   # 관리자 앱, http://127.0.0.1:5174
```

로그인은 시드 계정 가운데 하나를 고르는 방식이고 비밀번호가 없다. 웹의 로그인 화면에 계정 목록이 나온다. 서버만 써 보려면 다음과 같이 한다.

```sh
curl -c cookies.txt -H 'Content-Type: application/json' \
     -d '{"email":"student05@example.com"}' http://127.0.0.1:8080/api/auth/login
curl -b cookies.txt http://127.0.0.1:8080/api/gown/reservations/me
```

| 서버 | 계정 |
|---|---|
| 학생용 | `student01@example.com` ~ `student05@example.com` |
| 관리자용 | `admin01@example.com`(조회), `master01@example.com`(조회와 접수 열기·닫기) |

경로와 응답은 [docs/contracts/web-api.md](./docs/contracts/web-api.md)에 있다. `db/init`을 고친 뒤에는 `docker compose down -v`로 데이터를 지우고 다시 띄운다.

## 테스트

```sh
./gradlew test    # Docker가 켜져 있어야 한다
```

테스트는 개발용 DB를 쓰지 않고 임시 MySQL 컨테이너를 직접 띄운다. 무엇을 검사하는지는 [docs/testing/dynamic.md](./docs/testing/dynamic.md)에 있다.

DB 계정의 비밀번호는 저장소에 적혀 있다. 로컬 개발과 테스트에만 쓰는 값이다.
