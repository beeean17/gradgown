# 역할 간 경계는 DB 권한으로, 사용자 간 경계는 서버 코드로 지킨다

- 상태: 확정 (2026-11-14). 아래 권한 표는 초안이고 MySQL에서 실행해 확인하지 않았다
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
| `gown_reservations` | `SELECT`, `INSERT`, `UPDATE` | `SELECT` | 전체 |
| `mentoring_events`, `mentoring_sessions`, `mentoring_options` | `SELECT` | `SELECT` | 전체 |
| `mentoring_registrations` | `SELECT`, `INSERT`, `UPDATE` | `SELECT` | 전체 |
| `announcements` | 없음. 노출 중인 공지만 보이는 뷰에 `SELECT` | `SELECT` | 전체 |
| `faqs` | 없음 | `SELECT` | 전체 |
| `audit_logs` | `SELECT`, `INSERT`, `UPDATE` | `SELECT` | 전체 |

"전체"는 `SELECT`, `INSERT`, `UPDATE`, `DELETE`다. 테이블 구조를 바꾸는 권한은 어느 계정에도 주지 않는다.

- 학생 계정에 `DELETE`가 없다. 원본에서도 학생은 삭제할 수 없고 취소는 상태를 바꾸는 것이다(RES-20, MNT-20).
- 학생 계정은 회차, 슬롯, 선택지를 읽기만 한다. 설정은 관리자 쪽만 바꾼다.
- 학생 계정이 `audit_logs`를 읽고 쓰는 것은 같은 요청을 두 번 처리하지 않기 위해서다. 요청을 받으면 기록을 넣고, 끝나면 결과를 갱신한다.
- 관리자 계정은 전부 읽기만 한다. 원본의 등록 관리자가 "조회와 명단 내보내기"만 할 수 있는 것과 같다.
- 영구 삭제는 마스터만 한다. 원본도 그렇다(`reservation.delete`, `mentoring.delete`).

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

## 미정

- 계정 대신 MySQL role을 만들어 계정에 붙일지.
- 테이블을 만드는 계정을 서버가 쓰는 계정과 따로 둘지. 제안은 따로 두는 것이다.
- 학생 계정의 `UPDATE`를 컬럼 단위로 더 좁힐지. 예를 들어 `user_id`, `period_id`, `created_at`은 고칠 수 없게 할 수 있다.
- 관리자용 서버가 조회 계정과 마스터 계정을 골라 쓰는 방식([admin-server-split.md](./admin-server-split.md)).

## 확인할 것

- 뷰에만 `SELECT`를 주고 원본 테이블 권한이 없을 때 조회가 되는지.
- 컬럼 단위 `UPDATE` 권한이 의도대로 동작하는지.
- 권한이 없는 작업을 시도했을 때의 오류를 서버가 어떻게 받는지.
