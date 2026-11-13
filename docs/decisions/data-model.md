# Firestore 구조를 테이블 11개로 옮긴다

- 상태: 초안 (2026-11-13). DDL을 아직 쓰지 않았고 MySQL에서 실행해 확인하지 않았다
- 관련: [scope.md](./scope.md), [tech-stack.md](./tech-stack.md), [evaluation.md](./evaluation.md)
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
| `users/{uid}/mentoring_registrations/*` | `mentoring_registrations` | 1·2차시 선택을 선택지 FK로 참조한다. "선택 안함"(원본의 0)은 `NULL`이다 |
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
| `mentoring_registrations` | PK `id`, FK `user_id`, `event_id`, 1차시 선택지, 2차시 선택지, `created_by` | `status`, 이름, 학과, 학번, 학년, 전화, 이메일, `version`, 생성·수정 시각 |
| `announcements` | PK `id`, FK `author_id` | 제목, 본문, 분류, 고정·노출·팝업 여부, 팝업 순서, 생성·수정 시각 |
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

## 일부러 정규화하지 않은 것

- FAQ 태그와 St:talk 유의사항 목록은 JSON 컬럼으로 둔다. 화면에 그대로 보여 주기만 하고 조건으로 쓰지 않는다.

## 초안에서 뺀 것

- 테스터 권한(`settings_private/reservation_testing`, `mentoring_testing`). 넣기로 하면 테이블 두 개가 는다([scope.md](./scope.md) 미정).
- 필드 암호화([project-positioning.md](./project-positioning.md)).
- 원본의 v1(Flutter) 호환 필드와 변환 규칙.

## 확인할 것

- 생성 컬럼을 포함한 UNIQUE와 `CHECK`가 MySQL 8에서 의도대로 동작하는지. `NULL`이 낀 복합 FK와 `CHECK`의 동작을 포함한다.
- "현재 회차 하나"를 어떻게 표시할지. 초안은 회차 테이블에 표시 컬럼을 두는 것이다.
- 시각 컬럼의 타입과 시간대 기준.
