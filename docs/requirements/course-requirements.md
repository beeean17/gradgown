# 과제 요구사항

> 2026-11-13 분석, 2026-11-14 슬라이드 전체와 대조해 보완. 근거는 과제 안내 슬라이드 4개(총 106쪽)다.

과제는 **DB를 활용하는 서비스를 구현하고 6쪽 보고서로 설명하는 텀 프로젝트**다. 채점 무게는 구현 스택이 아니라 ER 모델, DB 연동 코드, 실행 결과, 회고에 있다.

보고서에 대한 요구사항은 분량이 많아 [report-requirements.md](./report-requirements.md)에 따로 적었다. 이 문서는 구현 요구사항, 슬라이드와의 대조, 슬라이드의 참고 내용을 다룬다.

## 슬라이드 원본

슬라이드 PDF는 저장소에 넣지 않는다. 강의 자료이고 저장소가 공개 저장소이기 때문이다. 로컬의 `docs/course-materials/`에 두고 `.gitignore`로 제외한다.

| 번호 | 파일 | 쪽수 | 내용 |
|---|---|---|---|
| 1 | `1. Project Introduction.pdf` | 44 | 퀴즈 안내, 텀 프로젝트 정의, 보고서 작성법, MySQL 설치와 JDBC 연결 |
| 2 | `2. Project Introduction2.pdf` | 28 | SQLite 소개와 C 연동 |
| 3 | `3. Executing SQL.pdf` | 11 | MySQL Workbench에서 SQL 실행 예 |
| 4 | `4. Project Examples.pdf` | 23 | 예시 보고서 3개와 General Advice |

아래에서 "1번 3쪽"은 1번 파일의 3쪽을 뜻한다.

## 구현 요구사항

| ID | 요구 | 강도 | 근거 |
|---|---|---|---|
| IMP-1 | DB를 활용하는 서비스를 만든다 | 필수 | 1번 3쪽 |
| IMP-2 | CLI 또는 GUI 프로그램이다 | 필수 | 1번 3쪽 |
| IMP-3 | DB는 MySQL, SQLite가 예시다 | 예시 | 1번 3쪽 |
| IMP-4 | 언어는 제한이 없다. C, Java, Python이 예시다 | 자유 | 1번 3쪽 |
| IMP-5 | 프로그램이 DB에 접속해 SQL을 실행한다 | 필수 | 1번 36~44쪽, 2번 15쪽, 4번 8쪽 |
| IMP-6 | 실제 문제를 주제로 고른다. 일반적인 문제도 되지만 실제 문제에서 더 많이 배우고 쓸 내용도 많다 | 권장 | 4번 23쪽 |
| IMP-7 | 프로그래밍 모델과 DB 종류는 따지지 않는다 | 참고 | 4번 23쪽 |

주제의 예시는 PoS, 수강신청, 고객 서비스다(1번 3쪽).

### 구현 요구사항 충족 현황

2026-11-14 기준이다. 코드는 아직 없으므로 "결정이 요구를 만족하는가"를 본 것이다.

| ID | 판정 | 근거 |
|---|---|---|
| IMP-1 | 만족 | 학위복 대여와 St:talk 두 서비스를 MySQL 위에 구현한다([scope.md](../decisions/scope.md)) |
| IMP-2 | 만족 | 웹 화면(GUI)이다. grad42의 학생 웹과 관리자 앱을 가져온다([tech-stack.md](../decisions/tech-stack.md)) |
| IMP-3 | 만족 | MySQL 8.x([tech-stack.md](../decisions/tech-stack.md)) |
| IMP-4 | 만족 | 서버는 Java(Spring Boot), 웹은 TypeScript. Spring Boot는 잠정이다 |
| IMP-5 | 만족 예정 | 서버가 MySQL에 접속한다. 접속 계정을 등급별로 나눈다([db-privileges.md](../decisions/db-privileges.md)) |
| IMP-6 | 만족 | 운영 중인 grad42의 이전이다([topic.md](../decisions/topic.md)) |
| IMP-7 | 해당 없음 | 스택 선택이 감점 요인이 아니라는 뜻이다 |

어긋나는 결정은 없다. 슬라이드의 예시는 모두 프로그램 하나가 DB에 직접 접속하는 구조이고, 이 프로젝트는 웹과 서버가 나뉜 구조다. 요구에는 어긋나지 않지만 보고서에서 구조를 설명해야 한다.

## 퀴즈

텀 프로젝트와 별개의 과제다(1번 2쪽).

- 시험 준비를 돕는 간단한 SQL 문제다. 1~2시간 안에 끝나는 분량이다.
- DB를 내려받아 설치하고, 설치한 DB에서 답을 확인한다.
- 풀이를 2쪽으로 설명한다.

3번 슬라이드가 그 실행 방법을 보여 주는 예로 보인다.

## 슬라이드와의 대조

슬라이드 106쪽을 모두 확인하고, 각 쪽의 내용이 어디에 반영됐는지 적었다. 요구사항이 아닌 쪽은 "참고"로 표시했다.

### 1번: Project Introduction

| 쪽 | 내용 | 반영 |
|---|---|---|
| 1 | 표지 | — |
| 2 | 퀴즈 | 위 "퀴즈" |
| 3 | 텀 프로젝트 정의, 소프트웨어 조건 | IMP-1~4 |
| 4 | 보고서 분량과 구성 | RPT-1~3 |
| 5 | Abstract, Introduction의 여섯 단계 | RPT-10, RPT-20~26 |
| 6~7 | Introduction 예시, Contribution | RPT-20~26 |
| 8~10 | Design and Implementation의 세 부분 | RPT-40~41, RPT-45~46 |
| 11 | 단점, 안정성, 견고성 | RPT-47 |
| 12~13 | Evaluation의 세 부분 | RPT-50~53 |
| 14 | DB 프로젝트용 예시 구성 | RPT-30, RPT-42, RPT-44, RPT-50 |
| 15~25 | MySQL 소개, 소스에서 빌드해 설치 | 참고. 아래 "참고 내용" |
| 26~27 | APT로 설치 | 참고 |
| 28~35 | Windows 설치 프로그램, Workbench, 서비스 시작과 중지 | 참고 |
| 36~38 | 애플리케이션과 MySQL의 연결, JDBC, Connector/J | IMP-5, 참고 |
| 39~43 | Eclipse에서 프로젝트 생성과 Connector 추가 | 참고 |
| 44 | JDBC 연결 코드 예 | IMP-5, 참고 |

### 2번: Project Introduction2

| 쪽 | 내용 | 반영 |
|---|---|---|
| 1 | 표지 | — |
| 2~7 | SQLite의 특징 | 참고 |
| 8~9 | SQLite 내려받기 | 참고 |
| 10~16 | Ubuntu(WSL)에서 C로 연동 | IMP-5, 참고 |
| 17~26 | Visual Studio에서 C로 연동 | 참고 |
| 27~28 | DB Browser for SQLite | 참고 |

### 3번: Executing SQL

| 쪽 | 내용 | 반영 |
|---|---|---|
| 1 | 표지 | — |
| 2 | 예시 테이블 | 참고 |
| 3~4 | `CREATE DATABASE`, `USE` | 참고 |
| 5~8 | `Orders`, `Dispatch` 테이블 생성과 데이터 입력 | 참고 |
| 9~11 | `ALL`을 쓴 집합 비교 쿼리와 실행 결과 | 참고. 퀴즈와 관련 |

### 4번: Project Examples

| 쪽 | 내용 | 반영 |
|---|---|---|
| 1 | 표지 | — |
| 2~10 | 예시 1: 수강 장바구니 (MySQL, Java) | RPT-10, RPT-30, RPT-40, RPT-42, RPT-44, RPT-45, RPT-50, RPT-54, RPT-60. 아래 "예시 보고서" |
| 11~16 | 예시 2: 항공 예약 (Python) | RPT-20, RPT-31, RPT-40, RPT-42, RPT-43, RPT-45. 아래 "예시 보고서" |
| 17~22 | 예시 3: 비교과 신청 (MySQL, Python) | RPT-10, RPT-22, RPT-30, RPT-43, RPT-50, RPT-70. 아래 "예시 보고서" |
| 23 | General Advice | IMP-6, IMP-7, RPT-42, RPT-45, RPT-50, RPT-70 |

## 예시 보고서

| 예시 | 스택 | 규모 | 눈에 띄는 점 |
|---|---|---|---|
| 수강 장바구니 | MySQL, Java | ER 모델의 엔티티 4개, CLI 메뉴 3개(담기, 조회, 삭제) | 입력 검증과 중복 방지. DB 연결 코드와 기능별 코드를 실행 결과와 함께 실었다. 장점과 한계를 따로 적었다 |
| 항공 예약 | Python | 릴레이션 10개, 고객·항공사 역할별 메뉴 | 기능 범위를 메뉴 → 기능 영역 → 동작의 그림으로 보였다. ER 모델은 부록에 두었다. 기능 영역 두 개만 골라 동작마다 SQL과 설명을 표로 실었다 |
| 비교과 신청 | MySQL, Python | 테이블 7개 | 실제 학교 사이트의 불편을 문제로 삼았다. 스키마에 타입과 PK, FK를 표시했다. 사용자별 권한(`GRANT`)과 뷰를 썼다. 문제마다 해결을 대응시켰다 |

## 참고 내용

요구사항은 아니지만 슬라이드에만 있는 내용이다. PDF 없이도 알 수 있도록 요점을 적는다.

- **MySQL 설치**: 소스에서 빌드, Linux 패키지 관리자(APT), Windows 설치 프로그램의 세 가지를 안내한다. 슬라이드의 버전은 8.0.31이다. 이 프로젝트는 Docker로 띄우므로 따르지 않는다([mysql-docker.md](../decisions/mysql-docker.md)).
- **포트**: MySQL의 기본 포트는 3306이다.
- **JDBC**: Java 프로그램은 Connector/J로 접속한다. 연결 주소는 `jdbc:mysql://<호스트>:<포트>/<DB 이름>` 형식이다. 예시 코드는 `DriverManager.getConnection`으로 연결하고 `Statement`로 SQL을 실행한다.
- **SQLite**: 서버 프로세스가 없고 설치와 설정이 필요 없는 라이브러리다. C에서는 `sqlite3_open`으로 파일을 열고 `sqlite3_exec`로 SQL을 실행한다. DB 파일은 DB Browser for SQLite로 볼 수 있다.
- **SQL 실행 예**: `Orders`와 `Dispatch` 테이블을 만들고, 서브쿼리 결과 전체보다 큰 값을 찾는 `> ALL` 쿼리를 Workbench에서 실행한다.

## 슬라이드에 없는 것

다음은 네 슬라이드 어디에도 없다. 강의 공지에서 확인해야 한다.

- 제출 기한
- 배점과 채점 기준
- 개인 과제인지 팀 과제인지
- 제출 형식(코드를 함께 내는지, 보고서만 내는지)
- 보고서 언어. 예시 보고서 세 개는 모두 영어다
- 발표나 시연이 있는지
- 6쪽이 상한인지 정확한 분량인지. 부록이 분량에 들어가는지
