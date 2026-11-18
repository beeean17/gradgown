# 역할 간 경계는 DB 권한으로, 사용자 간 경계는 서버 코드로 지킨다

- 상태: 확정 (2026-11-14). 권한을 주는 방식은 2026-11-16에 확정했다. 학생 계정의 `UPDATE`를 컬럼 단위로 좁히는 것은 2026-11-18에 확정하고 반영했다. 아래 권한 표는 초안이다. `GRANT` 문을 [`db/init/03-accounts.sql`](../../db/init/03-accounts.sql)에 썼고, MySQL 8.4.13에서 표대로 동작하는 것을 테스트로 확인했다(2026-11-16, 좁힌 뒤 2026-11-18에 다시 확인)
- 관련: [admin-server-split.md](./admin-server-split.md), [data-model.md](./data-model.md), [test-login.md](./test-login.md), [evaluation.md](./evaluation.md)

## 결정

grad42의 세 등급(학생, 관리자, 마스터)을 **MySQL 계정 셋**으로 옮긴다. 등급마다 할 수 있는 일은 `GRANT`와 뷰로 제한한다.

"본인 예약만 본다"처럼 **같은 등급 안에서 사용자를 구분하는 일은 서버 코드**가 맡는다.

## 왜 둘로 나누나

MySQL 권한은 DB 계정 단위다. 테이블과 컬럼 단위로는 제한할 수 있지만 행 단위로는 제한할 수 없다. 학생 수백 명이 학생용 서버를 거쳐 같은 DB 계정 하나로 접속하므로, DB는 그들을 서로 구분하지 못한다.

| 경계 | 예 | 지키는 곳 |
|---|---|---|
| 역할 간 | 학생은 예약을 지울 수 없다. 관리자는 조회만 한다 | DB 권한 (`GRANT`, 뷰) |
| 사용자 간 | 학생 A는 학생 B의 예약을 볼 수 없다 | 서버 코드 (`WHERE user_id = ?`) |

## 계정별 권한 (초안)

| 테이블 | 학생 계정 | 관리자 계정 | 마스터 계정 |
|---|---|---|---|
| `users` | `SELECT`, 마지막 로그인 시각 컬럼만 `UPDATE` | `SELECT` | 전체 |
| `gown_periods`, `gown_slots` | `SELECT` | `SELECT` | 전체 |
| `gown_reservations` | `SELECT`, `INSERT`, 일부 컬럼만 `UPDATE` | `SELECT` | 전체 |
| `mentoring_events`, `mentoring_sessions`, `mentoring_options` | `SELECT` | `SELECT` | 전체 |
| `mentoring_registrations` | `SELECT`, `INSERT`, 일부 컬럼만 `UPDATE` | `SELECT` | 전체 |
| `announcements` | 없음. 노출 중인 공지만 보이는 뷰에 `SELECT` | `SELECT` | 전체 |
| `faqs` | 없음 | `SELECT` | 전체 |
| `audit_logs` | `SELECT`, `INSERT`, 일부 컬럼만 `UPDATE` | `SELECT` | 전체 |

"전체"는 `SELECT`, `INSERT`, `UPDATE`, `DELETE`다. 테이블 구조를 바꾸는 권한은 어느 계정에도 주지 않는다.

- 학생 계정에 `DELETE`가 없다. 원본에서도 학생은 삭제할 수 없고 취소는 상태를 바꾸는 것이다(RES-20, MNT-20).
- 학생 계정은 회차, 슬롯, 선택지를 읽기만 한다. 설정은 관리자 쪽만 바꾼다.
- 학생 계정이 `audit_logs`를 읽고 쓰는 것은 같은 요청을 두 번 처리하지 않기 위해서다. 요청을 받으면 기록을 넣고, 끝나면 결과를 갱신한다.
- 관리자 계정은 전부 읽기만 한다. 원본의 등록 관리자가 "조회와 명단 내보내기"만 할 수 있는 것과 같다.
- 영구 삭제는 마스터만 한다. 원본도 그렇다(`reservation.delete`, `mentoring.delete`).

## 권한을 주는 방식 (확정, 2026-11-16)

- **계정에 `GRANT`를 직접 준다. MySQL role은 쓰지 않는다.** 등급과 계정이 일대일이라 role이 줄여 줄 중복이 없고, 권한 표와 `GRANT` 문이 그대로 대응한다.
- **테이블은 서버가 쓰는 계정이 만들지 않는다.** 컨테이너가 처음 뜰 때 초기화 스크립트가 root로 테이블, 뷰, 계정을 만든다([mysql-docker.md](./mysql-docker.md)). 세 계정에는 구조를 바꾸는 권한이 없다.

| 등급 | DB 계정 | `GRANT`의 범위 |
|---|---|---|
| 학생 | `gradgown_student` | 테이블마다 따로 준다. `users`의 `UPDATE`만 컬럼 단위(`last_login_at`)다 |
| 관리자 | `gradgown_admin` | `gradgown.*`에 `SELECT` |
| 마스터 | `gradgown_master` | `gradgown.*`에 `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

공지 뷰 `visible_announcements`는 `SQL SECURITY DEFINER`다([`db/init/02-views.sql`](../../db/init/02-views.sql)). 뷰를 만든 계정(root)의 권한으로 `announcements`를 읽으므로, 학생 계정은 원본 테이블 권한 없이 뷰만 읽는다. 뷰는 `is_visible` 컬럼을 내보내지 않는다.

계정의 비밀번호는 SQL 파일에 적혀 있다. 로컬 개발과 테스트에만 쓰는 값이다([ci.md](./ci.md)).

## Firestore Security Rules와의 대응

| 원본 (Rules, Functions) | 이 프로젝트 |
|---|---|
| 설정과 공지는 누구나 읽는다 | 학생 계정에 `SELECT` |
| 숨김 공지도 공개로 읽힌다. 화면이 걸러 낸다 | 노출 중인 공지만 보이는 뷰. 학생 계정은 원본 테이블에 접근하지 못한다 |
| 학생은 본인 예약·신청만 읽는다 (`request.auth.uid` 비교) | 서버 코드의 `WHERE user_id = ?` |
| 예약·신청은 클라이언트가 직접 쓸 수 없고 함수만 쓴다 | 브라우저는 DB에 접속하지 않는다. 학생용 서버만 쓴다 |
| 등록 관리자는 전체를 읽는다 | 관리자 계정에 `SELECT` |
| 쓰기는 마스터만 한다 (`admin-policy.js`의 권한 표) | 마스터 계정에만 쓰기 권한 |
| `settings_private`는 일반 사용자가 접근할 수 없다 | 테스터 권한을 넣을지 미정([scope.md](./scope.md)) |

## 이유

- **데이터베이스 과목의 내용이다.** 권한을 서버 코드로만 처리하면 DB는 저장소일 뿐이다. `GRANT`와 뷰를 쓰면 접근 제어가 설계의 일부가 된다. 슬라이드의 예시 보고서(비교과 신청)도 직원, 학생, 관리자 계정을 만들어 `GRANT`와 뷰로 권한을 나눴다.
- **이중 방어다.** 서버 코드의 권한 검사가 빠지거나 틀려도 DB가 한 번 더 막는다.
- **원본의 등급 구조와 맞는다.** 세 등급이 계정 셋에 그대로 대응한다.

## 한계

- 사용자 간 경계는 DB가 지켜 주지 않는다. Firestore Security Rules는 사용자 단위로 읽기를 막아 주었으므로, 이 부분은 이전하면서 서버 코드의 책임으로 넘어온다. 보고서의 한계에 적는다.
- 학생 계정은 예약 테이블의 모든 행을 읽고 고칠 권한을 가진다. 학생용 서버의 쿼리가 틀리면 다른 학생의 예약에 닿을 수 있다.

## 학생 계정의 `UPDATE`를 컬럼 단위로 좁힌다 (확정, 2026-11-18)

학생 계정은 학생용 서버가 실제로 바꾸는 컬럼만 `UPDATE`할 수 있다. [`db/init/03-accounts.sql`](../../db/init/03-accounts.sql)에 반영했다.

| 테이블 | `UPDATE`할 수 있는 컬럼 | 고칠 수 없는 컬럼 |
|---|---|---|
| `gown_reservations` | `status`, `rent_slot_id`, `return_slot_id`, `name`, `student_id`, `department`, `phone`, `size`, `is_proxy`, `proxy_name`, `proxy_phone`, `version` | `id`, `user_id`, `period_id`, `created_by`, `created_at`, `updated_at` |
| `mentoring_registrations` | `status`, `first_option_no`, `second_option_no`, `name`, `department`, `student_id`, `grade`, `phone`, `version` | `id`, `user_id`, `event_id`, `created_by`, `created_at`, `updated_at` |
| `audit_logs` | `outcome`, `failure_kind`, `error_code`, `target_id`, `completed_at` | `operation_id`, `domain`, `action`, `actor_id`, `created_at` |

- 학생용 서버에 버그가 있어도 예약의 주인이나 회차를 바꿀 수 없다는 것을 DB가 보장한다. "한계"에 적은 위험(학생용 서버의 쿼리가 틀리면 다른 학생의 예약에 닿는다) 가운데 고치는 쪽의 일부를 줄인다. 읽는 쪽은 그대로 서버 코드의 책임이다.
- 감사 로그는 넣은 뒤에 누가, 무엇을 요청했는지를 고칠 수 없게 된다.

반영하면서 확인한 것(권한 테스트에 15건을 더했다):

- 고칠 수 없는 컬럼을 `UPDATE`하면 오류 1143으로 거부된다.
- `updated_at`은 `ON UPDATE CURRENT_TIMESTAMP`로 저절로 바뀐다. **이 자동 갱신에는 컬럼 권한이 필요 없다.** 학생 계정은 `updated_at`을 직접 쓸 수 없지만(1143), 다른 컬럼을 고치면 값이 갱신된다. 그래서 수정 시각을 학생용 서버가 꾸며 낼 수 없다.
- `version = version + 1`처럼 컬럼을 읽어서 쓰는 문장은 그 컬럼의 `SELECT` 권한도 쓴다. 학생 계정은 테이블 `SELECT`가 있어서 된다.

관리자용 서버가 조회 계정과 마스터 계정을 골라 쓰는 방식도 2026-11-18에 정했다. 로그인한 사람의 등급으로 고른다([admin-server-split.md](./admin-server-split.md)).

## 실행해서 확인한 것 (2026-11-16)

[`PrivilegeTest`](../../db/src/test/java/gradgown/db/PrivilegeTest.java) 124개가 MySQL 8.4.13 컨테이너에서 모두 통과했다([동적 계열](../testing/dynamic.md) 2층). 계정별로 접속해서 권한 표의 칸을 하나씩 본다.

| 확인한 것 | 결과 |
|---|---|
| 뷰에만 `SELECT`가 있고 원본 테이블 권한이 없을 때 | 뷰는 읽힌다. `announcements`를 직접 읽으면 오류 1142로 거부된다. 숨김 공지는 뷰에 나오지 않는다 |
| 컬럼 단위 `UPDATE` | 학생 계정은 `users.last_login_at`만 고칠 수 있다. `role`이나 `email`을 고치면 오류 1143으로 거부된다 |
| 권한이 없는 작업의 오류 | 테이블 권한이 없으면 오류 번호 1142, 컬럼 권한이 없으면 1143이다. JDBC에서는 `SQLException.getErrorCode()`로 받는다. 서버가 이것을 `permission-denied`로 바꿀 수 있다([API 계약](../contracts/web-api.md)) |
| 권한 검사의 시점 | MySQL은 문장을 실행하기 전에 권한을 검사한다. 어떤 행도 바꾸지 않는 문장(`WHERE 1 = 0`)도 거부된다 |
| 구조 변경 | 세 계정 모두 `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `CREATE VIEW`, `DROP VIEW`가 오류 1142로 거부된다 |
