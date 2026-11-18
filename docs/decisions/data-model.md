# Firestore 구조를 테이블 11개로 옮긴다

- 상태: 잠정 (2026-11-18). 테이블 구성은 DDL로 쓰고 검토하는 동안 이견이 없었다. DDL의 세부(아래 "DDL에서 정한 것")는 2026-11-18에 확정했다. DDL은 [`db/init/01-schema.sql`](../../db/init/01-schema.sql)에 있고, MySQL 8.4.13에서 제약이 동작하는 것을 테스트로 확인했다
- 관련: [scope.md](./scope.md), [tech-stack.md](./tech-stack.md), [db-privileges.md](./db-privileges.md), [evaluation.md](./evaluation.md)
- 근거: grad42 main의 `firebase/docs/data-model.md`, `docs/requirements/gown-reservation.md`, `docs/requirements/mentoring.md`, `docs/contracts/*.md`

## 결정

Firestore의 문서, 하위 컬렉션, 중첩 map을 **테이블 11개**로 정규화한다. Cloud Functions 코드가 검사하던 규칙 중 스키마로 표현할 수 있는 것은 DB 제약으로 옮긴다.

## 두 서비스의 공통 구조

학위복 대여와 St:talk은 "회차 → 선택 단위 → 신청"이라는 같은 뼈대를 가진다. 사용자와 감사 로그는 공유한다.

| 층 | 학위복 대여 | St:talk |
|---|---|---|
| 회차 | `gown_periods` | `mentoring_events` |
| 선택 단위 | `gown_slots` (시간대) | `mentoring_options` (멘토 1~7), `mentoring_sessions` (1·2차시) |
| 신청 | `gown_reservations` | `mentoring_registrations` |

## Firestore → MySQL 매핑

| Firestore | MySQL 테이블 | 바뀌는 점 |
|---|---|---|
| `users/{uid}`, `settings_private/console_members` | `users` | 등급(학생, 관리자, 마스터)을 `role` 컬럼 하나로 둔다 |
| `settings/reservation` (현재 회차 문서 하나) | `gown_periods` | 회차마다 한 행이라 지난 회차 설정도 남는다 |
| `settings/reservation.slotsByDate` (중첩 map) | `gown_slots` | 슬롯 하나가 한 행 |
| `users/{uid}/gown_reservations/*` | `gown_reservations` | 대여·반납 슬롯을 각각 FK로 참조한다. 표시용 시각 문자열은 저장하지 않는다 |
| `settings/mentoring` | `mentoring_events` | 안내 문구와 EPIC Folio 링크를 포함한다 |
| `settings/mentoring.event.sessions[]` | `mentoring_sessions` | 차시 하나가 한 행 |
| `settings/mentoring.options[]` | `mentoring_options` | 선택지 하나가 한 행. 번호는 1~7 |
| `users/{uid}/mentoring_registrations/*` | `mentoring_registrations` | 1·2차시 선택을 선택지 FK로 참조한다. "선택 안함"(원본의 0)은 `NULL`이다. 원본이 신청마다 복사해 두던 이메일은 저장하지 않고 `users`에서 읽는다 |
| `information/announcements` (문서 하나의 map) | `announcements` | 공지 하나가 한 행 |
| `information/faq` (문서 하나의 map) | `faqs` | FAQ 하나가 한 행 |
| `adminAuditLogs/{operationId}` | `audit_logs` | PK가 `operation_id`다 |

## 테이블

| 테이블 | 키 | 주요 컬럼 |
|---|---|---|
| `users` | PK `id`, UNIQUE `email` | `role`, `created_at`, `last_login_at` |
| `gown_periods` | PK `id` (`YYYY-MM`) | `is_open`, 신청 기간 시작·끝, 수정 기간 시작·끝, 현재 회차 표시 |
| `gown_slots` | PK `id`, UNIQUE `(period_id, starts_at)`, FK `period_id` | `starts_at`, `ends_at`, `enabled` |
| `gown_reservations` | PK `id`, FK `user_id`, `period_id`, 대여 슬롯, 반납 슬롯, `created_by` | `status`, 이름, 학번, 학과, 전화, `size`, 대리 수령 여부·이름·전화, `version`, 생성·수정 시각 |
| `mentoring_events` | PK `id` (`YYYY-MM`) | `is_open`, 신청 기간 시작·끝, 행사 날짜, 장소, 소개, 유의사항, EPIC Folio URL과 노출 여부, 현재 행사 표시 |
| `mentoring_sessions` | PK `(event_id, session_no)` | `label`, `starts_at`, `ends_at` |
| `mentoring_options` | PK `(event_id, option_no)` | `name` |
| `mentoring_registrations` | PK `id`, FK `user_id`, `event_id`, 1차시 선택지, 2차시 선택지, `created_by` | `status`, 이름, 학과, 학번, 학년, 전화, `version`, 생성·수정 시각 |
| `announcements` | PK `id`, FK `author_id` | 제목, 본문, 분류, 고정·노출·팝업·홈 노출 여부, 팝업 순서, 생성·수정 시각 |
| `faqs` | PK `id` | 질문, 답변, 분류, 태그, 순서, 노출 여부 |
| `audit_logs` | PK `operation_id`, FK 행위자 | 업무 영역, 작업, 대상, 결과, 실패 분류, 오류 코드, 시작·완료 시각 |

## 관계

- `users` 1—N `gown_reservations` N—1 `gown_periods` 1—N `gown_slots`
- `gown_reservations` N—1 `gown_slots` (대여), N—1 `gown_slots` (반납)
- `users` 1—N `mentoring_registrations` N—1 `mentoring_events`
- `mentoring_events` 1—N `mentoring_options`, 1—N `mentoring_sessions`
- `mentoring_registrations` N—0..1 `mentoring_options` (1차시), N—0..1 `mentoring_options` (2차시)
- `users` 1—N `announcements` (작성자), `users` 1—N `audit_logs` (행위자)

## 코드에서 DB 제약으로 옮기는 규칙

| 원본 규칙 | 원본에서 검사하는 곳 | MySQL에서 |
|---|---|---|
| 한 사용자는 현재 회차에 유효 예약 하나만 (RES-22) | Functions 트랜잭션 안의 조회 | 상태가 `reserved`일 때만 값이 있는 생성 컬럼을 두고 `UNIQUE(user_id, period_id, 생성 컬럼)`. 취소한 행은 `NULL`이라 재신청을 막지 않는다 |
| 한 사용자는 현재 행사에 유효 신청 하나만 (MNT-22) | 같음 | 같은 방식 |
| 슬롯은 같은 회차의 것이어야 한다 | Functions | `(슬롯 id, period_id)` 복합 FK |
| 고른 선택지는 그 행사의 것이어야 한다 | Functions | `(event_id, option_no)` 복합 FK |
| 두 차시에 같은 선택지를 고를 수 없다 (MNT-25) | Functions | `CHECK` |
| 두 차시 모두 "선택 안함"일 수 없다 (MNT-25) | Functions | `CHECK` |
| 대리 수령이면 대리인 이름과 전화가 있어야 한다 | Functions | `CHECK` |
| 학년은 1~4, 선택지 번호는 1~7, 사이즈는 s/m/l | Functions | `CHECK` 또는 `ENUM` |
| 같은 요청을 두 번 처리하지 않는다 (RES-25, MNT-24) | `adminAuditLogs/{operationId}` 문서 존재 여부 | `audit_logs` PK 중복 |
| 변경 충돌 감지 (RES-24, MNT-23) | `modifiedAt`을 문자열로 만든 `version` 비교 | 정수 `version` 컬럼 |

## 서비스 코드에 남는 규칙

다른 행이나 현재 시각을 봐야 해서 스키마만으로 표현할 수 없는 것이다. 서버 트랜잭션에서 검사한다.

- 반납 시각은 대여 시각과 같거나 이후여야 한다(RES-13).
- 비활성 슬롯은 고를 수 없다(RES-14).
- 신청·변경·취소는 접수가 열려 있고 기간 안일 때만 된다(RES-21, MNT-21).
- 변경·취소는 현재 회차의 `reserved` 건만 된다(RES-23, MNT-23).
- 접수를 열려면 선택지 7개 모두 이름이 있어야 한다(MNT-51).

## 뷰와 접속 계정

등급별 접근 제어를 DB 권한으로 하기로 했다([db-privileges.md](./db-privileges.md)). 그래서 스키마에 다음이 더해진다.

- **노출 중인 공지만 보이는 뷰.** 학생 계정은 `announcements` 테이블 대신 이 뷰만 읽는다.
- **DB 계정 셋**(학생, 관리자, 마스터)과 계정별 `GRANT`. 권한 표는 [db-privileges.md](./db-privileges.md)에 있다.

## 일부러 정규화하지 않은 것

- FAQ 태그와 St:talk 유의사항 목록은 JSON 컬럼으로 둔다. 화면에 그대로 보여 주기만 하고 조건으로 쓰지 않는다.

## 초안에서 뺀 것

- 테스터 권한(`settings_private/reservation_testing`, `mentoring_testing`). 넣지 않기로 확정했다(2026-11-18, [scope.md](./scope.md)).
- 필드 암호화([project-positioning.md](./project-positioning.md)).
- 원본의 v1(Flutter) 호환 필드와 변환 규칙.

## DDL에서 정한 것 (확정, 2026-11-18)

위 표를 DDL로 쓰면서 정해야 했던 세부다. 2026-11-16에 초안으로 쓰고, 2026-11-18에 항목마다 검토해서 확정했다. 신청의 이메일 컬럼만 초안과 달라졌다.

| 항목 | DDL의 선택 | 이유 |
|---|---|---|
| ID | `users`, `gown_slots`, `gown_reservations`, `mentoring_registrations`, `announcements`, `faqs`는 `BIGINT AUTO_INCREMENT`. 회차와 행사는 `YYYY-MM` 문자열(`CHECK`로 형식 검사) | 원본은 `operationId`가 곧 예약 문서 ID였다. 여기서는 `audit_logs`의 PK가 중복 요청을 막으므로 예약 ID는 DB가 만든다. API는 ID를 문자열로 준다 |
| 시각 | 모두 `TIMESTAMP`. 서버 시간대는 `+09:00`([`db/conf/gradgown.cnf`](../../db/conf/gradgown.cnf)). 행사 날짜만 `DATE` | 시점을 나타내는 값이라 Firestore `Timestamp`와 뜻이 같다. 접속 시간대가 달라도 같은 시점을 가리킨다. 2038년까지만 표현할 수 있다 |
| 현재 회차 하나 | `is_current`와, 그 값이 참일 때만 1인 생성 컬럼 `current_marker`에 `UNIQUE` | 유효 예약 하나(RES-22)와 같은 기법이다. 행사도 같다 |
| 상태 | `ENUM('reserved', 'cancelled')` | `completed`, `attended`는 범위 밖이다([scope.md](./scope.md)) |
| 슬롯의 `UNIQUE (id, period_id)` | PK와 별도로 둔다 | 예약의 복합 FK가 참조할 대상이다. MySQL 8.4는 FK가 유일 키를 참조해야 한다 |
| 대리 수령 `CHECK` | 대리 수령이면 이름·전화가 둘 다 있고, **아니면 둘 다 `NULL`** | 위 표의 규칙보다 좁다. 대리 수령이 아닌데 대리인 정보가 남는 행을 막는다 |
| FK의 삭제·갱신 동작 | 전부 기본값(`RESTRICT`) | 참조되는 행은 지울 수 없다. MySQL은 `CHECK`에 쓰인 컬럼에 `CASCADE`나 `SET NULL`을 허용하지 않기도 한다 |
| `audit_logs.operation_id` | `ascii_bin` 정렬 | 기본 정렬은 대소문자를 구분하지 않는다. 대소문자만 다른 ID는 다른 요청이다 |
| `audit_logs.target_id` | FK를 걸지 않는다 | 마스터가 예약을 영구 삭제해도 로그는 남아야 한다 |
| `audit_logs`의 컬럼 | 원본의 `stage`, `severity`, `retryable`, `resolved*`, `origin`, `targetUserId`는 뺐다 | 학생 명령만 기록하는 범위에서는 쓰이지 않는다 |
| 신청의 이메일 | `mentoring_registrations`에 컬럼을 두지 않는다. 명단을 만들 때 `users`와 조인한다 | 원본은 서버가 로그인 계정의 이메일을 신청마다 복사했다. 그 값은 항상 `users.email`과 같으므로 같은 사실을 두 곳에 두지 않는다. 초안에는 컬럼이 있었다 |
| `announcements.show_on_home` | 추가했다 | 화면 타입 `Announcement.showOnHome`(원본의 `showOnToggle`)이 쓴다 |
| 보조 인덱스 | 제약(PK, UNIQUE, FK)이 만드는 인덱스만 있다 | 조회 쿼리를 쓰고 실행 계획을 본 뒤에 더한다([evaluation.md](./evaluation.md)) |

### 남겨 둔 중복

- `gown_reservations.period_id`는 대여 슬롯의 회차와 항상 같다. 중복이지만 `UNIQUE (user_id, period_id, …)`에 필요해서 두었고, 복합 FK가 두 값이 어긋나지 않게 한다.

## 실행해서 확인한 것 (2026-11-16)

[`SchemaConstraintTest`](../../db/src/test/java/gradgown/db/SchemaConstraintTest.java) 42개가 MySQL 8.4.13 컨테이너에서 모두 통과했다([동적 계열](../testing/dynamic.md) 1층). 초안이 "확인할 것"으로 남겼던 항목은 모두 의도대로 동작한다.

| 확인한 것 | 결과 |
|---|---|
| 생성 컬럼을 포함한 UNIQUE | `reserved` 두 건은 오류 1062로 거부된다. 취소한 행은 몇 건이든 함께 있을 수 있고, 취소한 행을 다시 `reserved`로 바꾸는 `UPDATE`도 다른 유효 건이 있으면 거부된다 |
| `NULL`이 낀 복합 FK | 선택지가 `NULL`이면 검사하지 않는다. 값이 있으면 그 행사에 없는 번호를 오류 1452로 거부한다 |
| `NULL`이 낀 `CHECK` | `first_option_no <> second_option_no`는 한쪽이 `NULL`이면 통과한다. 둘 다 `NULL`인 경우는 따로 둔 `CHECK`가 거부한다 |
| `CHECK`에 쓰인 컬럼이 복합 FK에도 들어가는 것 | 된다. 참조 동작(`CASCADE` 등)을 주지 않았다 |
| `CHECK`의 정규식과 `TIMESTAMP` 비교 | 된다 |
| FK가 유일 키를 참조해야 하는 것 | 유일하지 않은 인덱스를 참조하는 FK는 오류 6125로 만들어지지 않는다(`restrict_fk_on_non_standard_key`가 기본으로 켜져 있다). 그래서 `gown_slots`에 `UNIQUE (id, period_id)`가 필요하다 |
| `ENUM`과 대소문자 | `size`에 `'L'`을 넣으면 `'l'`로 저장된다(RES-29가 따로 코드 없이 지켜진다). `'xl'`은 오류 1265로 거부된다 |
| 서버 시간대 | 설정 파일의 `+09:00`이 적용된다 |

## 구현하면서 알게 된 것

- **`TIMESTAMP`는 2038-01-19까지만 담는다.** 테스트용 행의 날짜를 2099년으로 썼다가 초기화가 오류 1292로 멈췄다. 테스트용 행은 2037년을 쓴다. 이 프로젝트의 날짜는 모두 가까운 미래라 영향이 없지만, 타입을 고른 대가로 보고서에 적을 수 있다.
- **초기화 스크립트는 서버 설정의 시간대로 실행되지 않는다.** MySQL 이미지의 진입 스크립트는 초기화용 임시 서버를 `--default-time-zone=SYSTEM`으로 띄운다. 그래서 시드 데이터의 시각 문자열이 서울 시각이 아니라 UTC로 읽혀 9시간 어긋나게 저장됐다. "같은 시작 시각의 슬롯 둘" 테스트가 통과해 버려서(거부되어야 하는데 들어갔다) 드러났다. 시각을 넣는 SQL 파일은 맨 위에서 `SET time_zone = '+09:00'`을 한다. `TIMESTAMP`에 오프셋 없는 문자열을 넣으면 그 뜻이 접속의 시간대에 달려 있다는 점은 서버 코드에서도 주의해야 한다.
- **원본의 규칙 하나가 타입으로 흡수됐다.** 사이즈를 소문자로 저장하는 규칙(RES-29)은 원본에서 검증 코드가 했다. 대소문자를 구분하지 않는 정렬의 `ENUM`은 이것을 저절로 한다.
