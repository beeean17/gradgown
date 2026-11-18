# 웹과 서버 사이의 API 계약

- 상태: 구현됨 (2026-11-18). 두 서버가 아래 경로를 제공하고 테스트가 응답 모양을 확인한다. 학생 웹과 관리자 앱이 이 API를 쓴다. 경로 이름과 응답 형식은 확인받지 않은 제안이다
- 관련: [admin-server-split.md](../decisions/admin-server-split.md), [db-privileges.md](../decisions/db-privileges.md), [tech-stack.md](../decisions/tech-stack.md), [scope.md](../decisions/scope.md), [test-login.md](../decisions/test-login.md), [data-model.md](../decisions/data-model.md)
- 근거: grad42 main의 `web/src`, `admin-web/src`, `web/docs/data-and-auth.md`, `docs/contracts/reservation-command.md`, `mentoring-command.md`

## 지금은 API 계약이 없다

기존 웹은 서버 API를 부르지 않는다. **브라우저가 Firebase SDK로 Firestore를 직접 읽고**, 쓰기만 callable 함수로 보낸다. 그래서 옮길 때 REST 계약을 새로 정해야 한다.

지금 문서로 남아 있는 계약은 쓰기 명령 세 개뿐이다(`reservationCommand`, `mentoringCommand`, `adminCommand`). 읽기 쪽은 Firestore 문서 구조가 곧 계약이다.

## 학생 웹이 Firebase에 닿는 지점

| 종류 | 대상 | 방식 | 쓰는 곳 |
|---|---|---|---|
| 읽기 | `settings/reservation` | 실시간 구독 | `features/reservation/reservationData.ts` |
| 읽기 | `users/{uid}/gown_reservations` (`periodId` 조건) | 실시간 구독 | 같음 |
| 읽기 | `settings/mentoring` | 실시간 구독 | `features/mentoring/mentoringData.ts` |
| 읽기 | `users/{uid}/mentoring_registrations` (전체) | 실시간 구독 | 같음 |
| 읽기 | `information/announcements` | 실시간 구독 | `features/announcements/useAnnouncements.ts` |
| 읽기 | `settings_private/reservation_testing`, `mentoring_testing` | 실시간 구독 | `shared/data/testing.ts` |
| 읽기 | `/api/schedule` (Cloudflare Pages Function) | 첫 화면용 엣지 캐시 | `features/reservation/periodPrefetch.ts` |
| 쓰기 | `users/{uid}` 생성과 `lastLogin` 갱신 | Firestore 직접 쓰기 | `shared/auth/profile.ts` |
| 쓰기 | `reservationCommand` (create, update, cancel) | callable | `features/reservation/reservationCommands.ts` |
| 쓰기 | `mentoringCommand` (create, update, cancel) | callable | `features/mentoring/mentoringCommands.ts` |
| 인증 | Firebase Auth Google 로그인 | SDK | `shared/auth/*` |

학생 웹은 FAQ를 읽지 않는다. FAQ 화면은 공지로 합쳐졌고 `/faq`는 공지 목록으로 보낸다(`app/router.tsx`). FAQ는 관리자 앱만 다룬다.

## 관리자 앱이 Firebase에 닿는 지점

관리자 앱은 데이터 접근을 `AdminApi` 타입 하나(`admin-web/src/contracts/admin-view.ts`)로 묶어 두었고, 구현은 `data/admin-api.ts`에 있다.

| `AdminApi` 메서드 | 지금 하는 일 |
|---|---|
| `getSettings()` | `settings/reservation` 읽기 |
| `getMentoringSettings()` | `settings/mentoring` 읽기 |
| `getTesting(kind)` | `settings_private/{kind}_testing` 읽기 |
| `listReservations(periodId, cursor)` | 컬렉션 그룹 `gown_reservations`를 `periodId`로 걸러 최신순 51건 |
| `listMentoring(eventId)` | 컬렉션 그룹 `mentoring_registrations`를 `eventId`로 걸러 전부 |
| `getUser(uid)` | callable `getAdminUser` |
| `getContent(kind)` | `information/{announcements,faq}` 읽기 |
| `listAudit()` | `adminAuditLogs` 최근 200건 |
| `listFunctionLogs(filter)` | callable `getReservationFunctionLogs` (Cloud Logging 조회) |
| `getMembers()` | `settings_private/console_members` 읽기 |
| `command(input)` | callable `adminCommand`. 예약·신청 추가/수정/취소/삭제, 회차·행사·테스터 설정 저장, 공지·FAQ 저장/삭제, 관리자 등록/해제 |
| `uploadImage(file)` | Storage 업로드 |

로그인 뒤 권한은 callable `getAdminContext`로 받는다(`auth/useAdminSession.ts`).

## 바꿔 끼울 지점

두 앱 모두 데이터 접근이 몇 군데에 모여 있어서 화면 코드는 건드리지 않아도 된다. 학생 웹은 2026-11-18에 아래 표대로 바꿨다([tech-stack.md](../decisions/tech-stack.md)의 "학생 웹에서 바뀐 것").

| 앱 | 경계 | 바꾸는 방법 |
|---|---|---|
| 학생 웹 | `shared/data/snapshots.ts`의 `docSource`, `querySource` | `fetch`로 한 번 읽는 `LiveSource`로 바꾼다. `useLive`와 화면은 그대로 쓴다 |
| 학생 웹 | `shared/firebase/command.ts`의 `sendCommand` | callable 호출을 `fetch`로 바꾼다. 오류 분류(`classify`)는 유지한다 |
| 학생 웹 | `shared/auth/*` | 테스트 로그인으로 바꾼다. `ensureProfile`은 없앤다 |
| 학생 웹 | `*Data.ts`의 매퍼(`toPeriod`, `toReservation` 등) | 서버가 화면 타입 그대로 응답하므로 없앤다 |
| 관리자 앱 | `data/admin-api.ts`의 `createAdminApi` | 같은 `AdminApi` 타입을 REST로 구현한 것으로 바꾼다 |
| 관리자 앱 | `auth/useAdminSession.ts` | 테스트 로그인으로 바꾼다 |

## 공통 규칙

| 항목 | 규칙 |
|---|---|
| 서버 | 학생 API와 관리자 API는 서로 다른 서버가 제공한다([admin-server-split.md](../decisions/admin-server-split.md)). 학생용 8080, 관리자용 8081 |
| 경로 | 모두 `/api` 아래. 관리자용 서버의 경로는 `/api/admin` 아래 |
| 형식 | JSON |
| 응답 모양 | 학생 웹의 화면 타입(`web/src/shared/types/index.ts`)을 그대로 쓴다. `ReservationPeriod`, `Reservation`, `MentoringEvent`, `MentoringRegistration`, `Announcement` |
| 시각 | 서울 오프셋 ISO 문자열(`2026-10-20T13:00:00+09:00`). 지금 웹의 `iso()`가 만드는 형식과 같다 |
| ID | 문자열로 준다. 웹은 ID를 불투명한 값으로 다룬다 |
| `version` | 불투명 문자열. 지금은 `modifiedAt`의 `seconds:nanoseconds`이고, 새 서버는 정수 `version` 컬럼 값을 문자열로 준다 |
| 인증 | 세션 쿠키. 로그인하지 않은 요청은 401 |

## 학생 API (구현됨, 2026-11-18)

학생용 서버(`student-server`)가 제공한다. 회차·행사·공지 읽기와 계정 목록은 로그인 없이 되고, "내" 데이터와 명령은 로그인이 필요하다.

### 읽기

| 메서드와 경로 | 응답 | 대체하는 것 |
|---|---|---|
| `GET /api/gown/periods/current` | `ReservationPeriod` 또는 `null` | `settings/reservation` 구독, `/api/schedule` 엣지 캐시 |
| `GET /api/gown/reservations/me?periodId=` | `Reservation[]`. `periodId`를 빼면 모든 회차 | `users/{uid}/gown_reservations` 구독 |
| `GET /api/mentoring/events/current` | `MentoringEvent` 또는 `null` | `settings/mentoring` 구독 |
| `GET /api/mentoring/registrations/me` | `MentoringRegistration[]` | `users/{uid}/mentoring_registrations` 구독 |
| `GET /api/announcements` | `Announcement[]`. 노출 중인 것만 | `information/announcements` 구독 |
| `GET /api/announcements/{id}` | `Announcement` | 같은 문서에서 항목 찾기 |

지금은 숨김 공지도 브라우저까지 내려와 화면에서 걸러진다. 새 API는 서버에서 거른다.

### 쓰기

기존 callable은 함수 하나가 여러 작업을 받고, 본문의 `action` 값(`reservation.create` 등)으로 어떤 작업인지 구분했다. REST에서는 경로와 메서드가 그 역할을 하므로 `action` 필드를 없애고 작업마다 경로를 둔다. 나머지 요청·응답 필드는 기존 명령 계약을 그대로 쓴다.

| 메서드와 경로 | 기존 action | 본문 |
|---|---|---|
| `POST /api/gown/reservations` | `reservation.create` | `{ operationId, input }` |
| `PUT /api/gown/reservations/{id}` | `reservation.update` | `{ operationId, version, input }` |
| `POST /api/gown/reservations/{id}/cancel` | `reservation.cancel` | `{ operationId, version }` |
| `POST /api/mentoring/registrations` | `mentoring.create` | `{ operationId, input }` |
| `PUT /api/mentoring/registrations/{id}` | `mentoring.update` | `{ operationId, version, input }` |
| `POST /api/mentoring/registrations/{id}/cancel` | `mentoring.cancel` | `{ operationId, version }` |

- `input`의 필드와 검증 규칙은 `ReservationInput`, `MentoringInput` 그대로다. 예약은 `slotId`, `rentAt`, `returnAt`을 받고, 서버가 반납 시각으로 반납 슬롯을 찾는다.
- 예약은 대여·반납 슬롯의 ID를 저장한다. 응답의 `rentAt`, `returnAt`은 두 슬롯의 시작 시각이다. 슬롯 안의 다른 시각을 보내도 시작 시각으로 읽힌다.
- `slotId`와 예약·신청 ID는 DB가 만든 숫자를 문자열로 쓴 것이다. 원본의 `2026-08-10_1000-1030` 같은 형식이 아니다.
- 형식이 틀린 `operationId`는 감사 로그를 남기지 않고 `invalid-argument`로 거부한다. 원본은 `rejected` 로그를 남겼지만, 여기서는 `operationId`가 감사 로그의 키라서 틀린 값으로는 행을 만들 수 없다. JSON으로 읽을 수 없는 본문도 `operationId`를 알 수 없어서 로그 없이 거부한다.

### 원본의 입력 규칙과 다른 점

| 항목 | 원본 | 이 서버 | 이유 |
|---|---|---|---|
| 예약의 `department` | 선택. 보내지 않으면 저장된 값을 유지한다 | 필수(1~60자). 없으면 `invalid-argument` | 원본의 규칙은 학과가 없던 v1(Flutter) 예약을 위한 것이다. 여기에는 그런 예약이 없고 화면은 항상 보낸다 |
| 숫자와 불리언의 타입 | 타입이 다르면 거부 | `grade`, `firstOption`, `secondOption`은 JSON 정수만, `isProxy`는 JSON 불리언만 받는다. `2.9`나 `"2"`는 거부한다 | 원본과 같다. JSON 라이브러리가 `2.9`를 `2`로 바꿔 받던 것을 막았다 |
| 문자열 자리에 온 숫자 | 거부 | 받는다. `"name": 123`은 `"123"`으로 저장된다 | 막지 않았다. 화면은 문자열만 보낸다 |
| 시각의 범위 | 제한 없음 | 1971~2037년 밖이면 `invalid-argument` | `TIMESTAMP`가 담을 수 있는 범위다 |
| 요청 크기 2만 자 제한 | 있음 | 없음 | 로컬에서만 실행한다 |
| 이름의 HTML 정리 (RES-31) | 저장할 때 정리 | 하지 않는다 | 화면(React)이 출력할 때 이스케이프한다 |
| 거부된 변경·취소의 감사 로그 | 대상 예약 ID를 남긴다 | `target_id`가 비어 있다 | 성공한 명령만 대상을 남긴다 |

끝나지 않은 채 남은 `operationId`의 처리는 원본과 같다. 결과가 기록되지 않은 채 2분이 지나면 실패한 것으로 본다.
- St:talk의 "선택 안함"은 API에서는 기존처럼 `0`이다. DB에 넣을 때 `NULL`로 바꾼다.
- 성공 응답은 기존과 같다: `{ success: true, operationId, reservationId 또는 registrationId, status, replayed }`.
- `operationId`의 규칙과 수명은 기존과 같다. 같은 ID로 다시 보내면 이전 성공을 `replayed: true`로 돌려준다.

### 오류

오류 본문에 기존 callable 코드를 `code`로 그대로 담는다. 그러면 웹의 오류 분류(`rejected`, `unknown`, `failed`)를 고치지 않아도 된다.

```json
{ "code": "already-exists", "message": "현재 회차에 이미 예약이 있습니다.", "operationId": "…" }
```

| `code` | HTTP 상태 | 뜻 |
|---|---|---|
| `invalid-argument` | 400 | 입력 형식 오류 |
| `unauthenticated` | 401 | 로그인 필요 |
| `permission-denied` | 403 | 권한 없음, 다른 사용자의 `operationId` |
| `not-found` | 404 | 대상 없음 |
| `already-exists` | 409 | 이미 유효한 신청이 있음 |
| `aborted` | 409 | `version` 불일치, 또는 같은 요청을 처리 중 |
| `failed-precondition` | 422 | 기간 밖, 접수 닫힘, 비활성 슬롯, 취소된 건 |
| `internal` | 500 | 서버 실패 |

없는 경로는 `not-found`, 받지 않는 메서드나 JSON이 아닌 본문, 타입이 틀린 쿼리 값은 `invalid-argument`(400)로 답한다. 요청의 `Accept`가 무엇이든 오류 본문은 JSON이다. 주소 자체가 잘못된 요청(`%zz` 등)은 서버 코드에 닿기 전에 Tomcat이 HTML 400으로 거부하며, 이것은 위 형식을 따르지 않는다.

### 인증

| 메서드와 경로 | 내용 |
|---|---|
| `GET /api/auth/accounts` | 로그인 화면에 보여 줄 계정 목록 `[{ email, role }]`. 로그인 없이 부른다. 그 서버에 로그인할 수 있는 계정만 준다 |
| `POST /api/auth/login` | 본문 `{ email }`. 비밀번호는 없다([test-login.md](../decisions/test-login.md)). 없는 계정은 `not-found`, 그 서버에 맞지 않는 등급은 `permission-denied` |
| `POST /api/auth/logout` | 로그아웃 |
| `GET /api/me` | `{ uid, email, role }`. 로그인하지 않았으면 401 |

네 경로는 두 서버에 각각 있다. 학생용 서버는 학생 계정만, 관리자용 서버는 관리자·마스터 계정만 로그인시킨다.

## 관리자 API (구현됨, 2026-11-18)

관리자용 서버(`admin-server`)가 제공한다. 모든 경로는 로그인이 필요하다. 요청은 로그인한 사람의 등급에 맞는 DB 계정으로 실행된다([admin-server-split.md](../decisions/admin-server-split.md)).

응답 모양은 원본 관리자 앱의 타입이 아니라 이 서버가 정한 것이다. 관리자 앱을 가져오면서 앱 쪽을 이 모양에 맞췄고, 화면에 필요한 것 두 가지(슬롯 목록, 행사의 차시·안내 문구)를 서버에 더했다.

### 조회

| 메서드와 경로 | 응답 | 대체하는 것과 달라지는 점 |
|---|---|---|
| `GET /api/admin/gown/periods` | 회차 목록. 회차마다 접수 상태, 기간, 슬롯 수, 유효 예약 수 | 원본에는 현재 회차 하나만 있었다. 지난 회차도 나온다 |
| `GET /api/admin/gown/periods/current` | 현재 회차 하나 또는 `null` | `getSettings()` |
| `GET /api/admin/gown/slots?periodId=` | `[{ slotId, periodId, startsAt, endsAt, enabled }]`. 시간순이고 꺼진 슬롯도 나온다. `periodId`를 빼면 현재 회차다 | `getSettings()`의 `slotsByDate` |
| `GET /api/admin/gown/reservations?periodId=&q=&status=&cursor=&limit=` | `{ items, nextCursor }` | `listReservations()`. 검색(이름·학번·전화)과 상태 필터를 서버가 페이지를 자르기 전에 적용한다. `periodId`를 빼면 현재 회차다 |
| `GET /api/admin/mentoring/events` | 행사 목록. 행사마다 접수 상태, 기간, 날짜와 장소, 차시, 선택지 이름 7개, 소개와 유의사항, EPIC Folio 링크, 유효 신청 수 | 원본에는 현재 행사 하나만 있었다 |
| `GET /api/admin/mentoring/events/current` | 현재 행사 하나 또는 `null` | `getMentoringSettings()` |
| `GET /api/admin/mentoring/registrations?eventId=&q=&status=&first=&second=` | 신청 배열 | `listMentoring()`. 필터를 서버가 적용한다. `first`·`second`는 0~7이고 0은 "선택 안함"이다 |
| `GET /api/admin/mentoring/counts?eventId=` | `[{ option, name, first, second }]` 8행 (선택지 1~7, 그리고 0 = 선택 안함) | 브라우저의 집계. 서버가 `GROUP BY` 한 번으로 센다. 취소 건은 세지 않는다 |
| `GET /api/admin/announcements` | `Announcement[]`. 숨김 항목 포함 | `getContent('announcements')` |
| `GET /api/admin/faqs` | FAQ 배열. 태그 포함 | `getContent('faq')` |
| `GET /api/admin/audit-logs?domain=&outcome=&cursor=&limit=` | `{ items, nextCursor }` | `listAudit()`. 최근 200건 제한 없이 서버가 거르고 나눈다 |

- **페이지 나누기.** `limit`은 기본 50, 최대 200이다. 응답의 `nextCursor`를 다음 요청의 `cursor`로 보낸다. 마지막 페이지에서는 `null`이다. 커서는 마지막 행의 키라서, 페이지를 넘기는 사이에 새 행이 생겨도 겹치거나 빠지지 않는다.
- 예약과 신청의 행에는 신청자의 `userId`와 `email`이 함께 온다. 이메일은 `users`와 조인해서 읽는다.

### 쓰기

관리자 쪽의 쓰기는 접수 열기·닫기뿐이다([scope.md](../decisions/scope.md)).

| 메서드와 경로 | 본문 | 내용 |
|---|---|---|
| `PUT /api/admin/gown/periods/{periodId}/open` | `{ isOpen }` | 회차의 접수를 켜거나 끈다. 응답 `{ success, periodId, isOpen }` |
| `PUT /api/admin/mentoring/events/{eventId}/open` | `{ isOpen }` | 행사의 접수를 켜거나 끈다. 켜려면 선택지 7개 모두 이름이 있어야 한다(MNT-51). 아니면 `failed-precondition`이고 값은 바뀌지 않는다 |

- 마스터로 로그인했을 때만 된다. 관리자로 로그인하면 `permission-denied`(403)다.
- 이 거부는 서버 코드가 아니라 MySQL이 한다. 관리자의 요청은 읽기 권한만 있는 DB 계정으로 실행되고, MySQL의 오류 1142를 서버가 `permission-denied`로 바꾼다.
- 없는 회차나 행사는 `not-found`다.
- 접수 열기·닫기는 감사 로그에 남지 않는다. `audit_logs`는 학생 명령을 기록하도록 만든 표다([data-model.md](../decisions/data-model.md)).

## 계약에서 빠지는 것

| 기존 접점 | 처리 |
|---|---|
| 실시간 구독 | 없앴다. 화면에 들어올 때, 30초마다, 탭이 다시 보일 때, 명령이 끝난 뒤에 다시 읽는다(`fetchSource`, `refreshLive`). 관리자가 접수를 닫으면 열려 있는 화면에는 길게는 30초 뒤에 반영된다 |
| `/api/schedule` 엣지 캐시 | 없앤다. 서버를 바로 읽는다 |
| App Check(reCAPTCHA) | 없앤다 |
| `users/{uid}` 프로필 생성 | 없앤다. 계정은 시드 데이터에 있다 |
| 테스터 권한 읽기 | 뺀다([scope.md](../decisions/scope.md)). 웹의 테스터 판정은 항상 거짓이다 |
| `adminCommand`의 쓰기 | 접수 열기·닫기만 남긴다(위 "쓰기"). 나머지는 뺀다([scope.md](../decisions/scope.md)) |
| `getUser`, `getMembers` | 뺀다. 관리자 등록과 사용자 조회는 범위 밖이다 |
| `listFunctionLogs` (Cloud Logging) | 뺀다 |
| `uploadImage` (Storage) | 뺀다 |

## 확인할 것

- 응답은 화면 타입 그대로 준다(구현함). 웹을 가져올 때 실제 화면에서 맞는지 확인해야 한다.
- `failed-precondition`의 HTTP 상태는 422로 구현했다. 확인받지 않았다.
- 관리자 API의 응답 모양. 관리자 앱이 쓰고 있지만 확인받지 않았다.

DB가 권한 오류로 거부한 요청은 `permission-denied`로 돌려주기로 확정했다(2026-11-18).
