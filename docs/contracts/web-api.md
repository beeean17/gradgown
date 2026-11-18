# 웹과 서버 사이의 API 계약

- 상태: 초안 (2026-11-14). 학생용과 관리자용 서버를 나누는 것은 확정이다. 경로 이름과 응답 형식은 제안이고, 구현하면서 확정한다
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

두 앱 모두 데이터 접근이 몇 군데에 모여 있어서 화면 코드는 건드리지 않아도 된다.

| 앱 | 경계 | 바꾸는 방법 |
|---|---|---|
| 학생 웹 | `shared/data/snapshots.ts`의 `docSource`, `querySource` | `fetch`로 한 번 읽는 `LiveSource`로 바꾼다. `useLive`와 화면은 그대로 쓴다 |
| 학생 웹 | `shared/firebase/command.ts`의 `sendCommand` | callable 호출을 `fetch`로 바꾼다. 오류 분류(`classify`)는 유지한다 |
| 학생 웹 | `shared/auth/*` | 테스트 로그인으로 바꾼다. `ensureProfile`은 없앤다 |
| 학생 웹 | `*Data.ts`의 매퍼(`toPeriod`, `toReservation` 등) | 서버가 화면 타입 그대로 응답하므로 없앤다 |
| 관리자 앱 | `data/admin-api.ts`의 `createAdminApi` | 같은 `AdminApi` 타입을 REST로 구현한 것으로 바꾼다 |
| 관리자 앱 | `auth/useAdminSession.ts` | 테스트 로그인으로 바꾼다 |

## 공통 규칙 (제안)

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

## 학생 API (제안)

### 읽기

| 메서드와 경로 | 응답 | 대체하는 것 |
|---|---|---|
| `GET /api/gown/periods/current` | `ReservationPeriod` 또는 `null` | `settings/reservation` 구독, `/api/schedule` 엣지 캐시 |
| `GET /api/gown/reservations/me?periodId=` | `Reservation[]` | `users/{uid}/gown_reservations` 구독 |
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

### 인증

| 메서드와 경로 | 내용 |
|---|---|
| `GET /api/auth/accounts` | 로그인 화면에 보여 줄 계정 목록 `[{ email, role }]`. 로그인 없이 부른다. 그 서버에 로그인할 수 있는 계정만 준다 |
| `POST /api/auth/login` | 본문 `{ email }`. 비밀번호는 없다([test-login.md](../decisions/test-login.md)). 없는 계정은 `not-found`, 그 서버에 맞지 않는 등급은 `permission-denied` |
| `POST /api/auth/logout` | 로그아웃 |
| `GET /api/me` | `{ uid, email, role }`. 로그인하지 않았으면 401 |

네 경로는 두 서버에 각각 있다. 학생용 서버는 학생 계정만, 관리자용 서버는 관리자·마스터 계정만 로그인시킨다.

## 관리자 API (제안)

관리자용 서버가 제공한다. [scope.md](../decisions/scope.md)에서 포함하기로 한 조회만 적는다. 조회는 읽기 권한만 있는 관리자 DB 계정으로 실행한다([db-privileges.md](../decisions/db-privileges.md)).

| 메서드와 경로 | 대체하는 것 | 달라지는 점 |
|---|---|---|
| `GET /api/admin/gown/periods/current` | `getSettings()` | — |
| `GET /api/admin/gown/reservations?periodId=&q=&status=&cursor=` | `listReservations()` | 검색과 상태 필터를 서버가 페이지네이션 전에 적용한다 |
| `GET /api/admin/mentoring/events/current` | `getMentoringSettings()` | — |
| `GET /api/admin/mentoring/registrations?eventId=&q=&status=&first=&second=` | `listMentoring()` | 필터를 서버가 적용한다 |
| `GET /api/admin/mentoring/counts?eventId=` | 브라우저의 집계 | 선택지 × 차시 인원을 서버가 `GROUP BY`로 센다 |
| `GET /api/admin/announcements`, `GET /api/admin/faqs` | `getContent(kind)` | 숨김 항목 포함 |
| `GET /api/admin/audit-logs?domain=&outcome=&cursor=` | `listAudit()` | 최근 200건 제한 없이 서버 필터 |

### 쓰기 (제안)

관리자 쪽의 쓰기는 접수 열기·닫기뿐이다([scope.md](../decisions/scope.md)).

| 메서드와 경로 | 본문 | 내용 |
|---|---|---|
| `PUT /api/admin/gown/periods/{periodId}/open` | `{ isOpen }` | 회차의 접수를 켜거나 끈다 |
| `PUT /api/admin/mentoring/events/{eventId}/open` | `{ isOpen }` | 행사의 접수를 켜거나 끈다. 켜려면 선택지 7개 모두 이름이 있어야 한다(MNT-51). 아니면 `failed-precondition` |

- 마스터로 로그인했을 때만 된다. 관리자로 로그인하면 `permission-denied`(403)다.
- 이 거부는 서버 코드가 아니라 MySQL이 한다. 관리자의 요청은 읽기 권한만 있는 DB 계정으로 실행되고, MySQL의 오류 1142를 서버가 `permission-denied`로 바꾼다([admin-server-split.md](../decisions/admin-server-split.md)).

## 계약에서 빠지는 것

| 기존 접점 | 처리 |
|---|---|
| 실시간 구독 | 없앤다. 화면에 들어올 때와 명령이 성공한 뒤에 다시 읽는다(`restartLive`) |
| `/api/schedule` 엣지 캐시 | 없앤다. 서버를 바로 읽는다 |
| App Check(reCAPTCHA) | 없앤다 |
| `users/{uid}` 프로필 생성 | 없앤다. 계정은 시드 데이터에 있다 |
| 테스터 권한 읽기 | 뺀다([scope.md](../decisions/scope.md)). 웹의 테스터 판정은 항상 거짓이다 |
| `adminCommand`의 쓰기 | 접수 열기·닫기만 남긴다(위 "쓰기"). 나머지는 뺀다([scope.md](../decisions/scope.md)) |
| `getUser`, `getMembers` | 뺀다. 관리자 등록과 사용자 조회는 범위 밖이다 |
| `listFunctionLogs` (Cloud Logging) | 뺀다 |
| `uploadImage` (Storage) | 뺀다 |

## 확인할 것

- 응답을 화면 타입 그대로 줄지, Firestore 문서 모양을 흉내 내 매퍼를 남길지. 초안은 앞쪽이다.
- `failed-precondition`의 HTTP 상태(409와 422 중).
- 관리자 앱의 어느 화면까지 가져올지.

DB가 권한 오류로 거부한 요청은 `permission-denied`로 돌려주기로 확정했다(2026-11-18).
