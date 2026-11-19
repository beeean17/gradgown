# 측정 결과: actual

`./gradlew :eval:measure`가 쓴 파일이다. 손으로 고치지 않는다. 방법과 읽는 법은 [eval/README.md](../README.md)에 있다.

| 항목 | 값 |
|---|---|
| 회차의 예약 | 1,000건 |
| 행사의 신청 | 300건 |
| 감사 로그 | 5,000건 |
| 공지 | 30건 |
| MySQL | 8.4.13 (Docker, `mysql:8.4`) |
| Firestore | 로컬 에뮬레이터, 문서 7,301개 |

## 1. 예약 명단의 첫 페이지

회차의 예약을 최신순으로 50건 보인다. 다음 페이지가 있는지 알려고 둘 다 51건을 읽는다.

| 저장소 | 방법 | 요청 | 읽은 것 | 돌려받은 것 | 응답 크기 | 결과 |
|---|---|---|---|---|---|---|
| Firestore | 컬렉션 그룹 쿼리 `limit(51)` | 1 | 51 문서 | 51건 | 51.3 KB |  |
| MySQL | `WHERE period_id = ? ORDER BY id DESC LIMIT 51` | 1 | 190 행 | 51건 | 22.6 KB | 1.3 ms |

## 2. 회차에서 한 사람 찾기

찾는 사람은 회차의 예약을 최신순으로 늘어놓았을 때 한가운데(501번째)에 있다. 원본은 검색어를 브라우저가 가진 페이지 안에서만 적용한다.

| 저장소 | 방법 | 요청 | 읽은 것 | 돌려받은 것 | 응답 크기 | 결과 |
|---|---|---|---|---|---|---|
| Firestore | 첫 페이지에서 검색 | 1 | 51 문서 | 0건 | — | **못 찾음.** 화면은 "결과 없음"을 보인다 |
| Firestore | 찾을 때까지 "다음 페이지" | 10 | 510 문서 | 1건 | 512.9 KB | 찾음. 어느 페이지에 있는지 알 방법은 없다 |
| MySQL | `WHERE … name LIKE ? OR student_id LIKE ? OR phone LIKE ?` | 1 | 1,004 행 | 1건 | 470 B | 찾음. 2.5 ms |

## 3. St:talk 신청 인원 집계

선택지(1~7과 선택 안함) × 차시의 신청 완료 인원 16칸을 구한다. 실제 인원의 합은 차시마다 270명이다.

| 저장소 | 방법 | 요청 | 읽은 것 | 돌려받은 것 | 응답 크기 | 결과 |
|---|---|---|---|---|---|---|
| Firestore | 행사의 신청을 모두 읽어 브라우저에서 센다 (`limit(1001)`) | 1 | 300 문서 | 300건 | 236.2 KB | 맞음 |
| MySQL | `GROUP BY` 한 번 | 1 | 1,696 행 | 8건 | 457 B | 맞음. 0.6 ms |

## 4. 감사 로그에서 거부된 요청 보기

전체 5,000건 가운데 5분의 1이 거부된 요청이다. 찾는 것은 그중 오래된 한 건이고, 그보다 새 거부 건이 499건 있다.

| 저장소 | 방법 | 요청 | 읽은 것 | 돌려받은 것 | 응답 크기 | 결과 |
|---|---|---|---|---|---|---|
| Firestore | 최신 200건을 읽어 브라우저에서 거른다 | 1 | 200 문서 | 200건 | 274.0 KB | **못 찾음.** 200건 밖의 기록은 화면에서 볼 방법이 없다 |
| MySQL | `WHERE outcome = ?` 첫 페이지, 보조 인덱스 없음 | 1 | 5,054 행 | 51건 | 16.9 KB | 1.4 ms |
| MySQL | 같은 문장, `(created_at, operation_id)` 인덱스 | 1 | 303 행 | 51건 | 16.9 KB | 0.6 ms. 페이지를 넘기면 찾는 건에 닿는다 |

## 5. 학생에게 내려가는 공지

공지 30건 가운데 5건이 숨김이다.

| 저장소 | 방법 | 요청 | 읽은 것 | 돌려받은 것 | 응답 크기 | 결과 |
|---|---|---|---|---|---|---|
| Firestore | 문서 하나를 통째로 읽고 브라우저가 숨김 항목을 뺀다 | 1 | 1 문서 | 30건 | 33.5 KB | **숨김 5건이 브라우저까지 내려온다** |
| MySQL | 학생 계정은 뷰 `visible_announcements`만 읽는다 | 1 | 49 행 | 25건 | 22.1 KB | 숨김 0건. 0.5 ms |

## 실행 계획

`EXPLAIN ANALYZE`의 출력이다. 시간은 이 컨테이너에서의 값이다.

### 예약 명단 첫 페이지

```
-> Limit: 51 row(s)  (cost=1153 rows=51) (actual time=0.208..0.405 rows=51 loops=1)
    -> Nested loop inner join  (cost=1153 rows=1000) (actual time=0.206..0.399 rows=51 loops=1)
        -> Nested loop inner join  (cost=803 rows=1000) (actual time=0.203..0.327 rows=51 loops=1)
            -> Nested loop inner join  (cost=453 rows=1000) (actual time=0.202..0.277 rows=51 loops=1)
                -> Index range scan on r using fk_gown_reservations_period over (period_id = '2027-02') (reverse), with index condition: (r.period_id = '2027-02')  (cost=103 rows=1000) (actual time=0.192..0.216 rows=51 loops=1)
                -> Single-row index lookup on rent_slot using PRIMARY (id=r.rent_slot_id)  (cost=0.25 rows=1) (actual time=819e-6..851e-6 rows=1 loops=51)
            -> Single-row index lookup on return_slot using PRIMARY (id=r.return_slot_id)  (cost=0.25 rows=1) (actual time=739e-6..775e-6 rows=1 loops=51)
        -> Single-row index lookup on u using PRIMARY (id=r.user_id)  (cost=0.25 rows=1) (actual time=0.0012..0.00123 rows=1 loops=51)
```

### 이름으로 한 사람 찾기

```
-> Limit: 51 row(s)  (cost=415 rows=51) (actual time=0.818..1.47 rows=1 loops=1)
    -> Nested loop inner join  (cost=415 rows=298) (actual time=0.817..1.47 rows=1 loops=1)
        -> Nested loop inner join  (cost=311 rows=298) (actual time=0.815..1.47 rows=1 loops=1)
            -> Nested loop inner join  (cost=207 rows=298) (actual time=0.813..1.46 rows=1 loops=1)
                -> Filter: ((r.`name` like '%측정대상%') or (r.student_id like '%측정대상%') or (r.phone like '%측정대상%'))  (cost=103 rows=298) (actual time=0.81..1.46 rows=1 loops=1)
                    -> Index range scan on r using fk_gown_reservations_period over (period_id = '2027-02') (reverse), with index condition: (r.period_id = '2027-02')  (cost=103 rows=1000) (actual time=0.118..1.25 rows=1000 loops=1)
                -> Single-row index lookup on rent_slot using PRIMARY (id=r.rent_slot_id)  (cost=0.25 rows=1) (actual time=0.00242..0.00246 rows=1 loops=1)
            -> Single-row index lookup on return_slot using PRIMARY (id=r.return_slot_id)  (cost=0.25 rows=1) (actual time=0.00133..0.00138 rows=1 loops=1)
        -> Single-row index lookup on u using PRIMARY (id=r.user_id)  (cost=0.25 rows=1) (actual time=0.00213..0.00217 rows=1 loops=1)
```

### 선택지 × 차시 인원 집계

```
-> Table scan on <temporary>  (actual time=0.22..0.22 rows=8 loops=1)
    -> Aggregate using temporary table  (actual time=0.219..0.219 rows=8 loops=1)
        -> Table scan on choice  (cost=92..98.2 rows=300) (actual time=0.126..0.15 rows=540 loops=1)
            -> Union all materialize  (cost=92..92 rows=300) (actual time=0.125..0.125 rows=540 loops=1)
                -> Filter: ((mentoring_registrations.`status` = 'reserved') and (mentoring_registrations.event_id = '2027-01'))  (cost=31 rows=150) (actual time=0.00875..0.052 rows=270 loops=1)
                    -> Table scan on mentoring_registrations  (cost=31 rows=300) (actual time=0.00792..0.0263 rows=300 loops=1)
                -> Filter: ((mentoring_registrations.`status` = 'reserved') and (mentoring_registrations.event_id = '2027-01'))  (cost=31 rows=150) (actual time=0.00504..0.047 rows=270 loops=1)
                    -> Table scan on mentoring_registrations  (cost=31 rows=300) (actual time=0.00479..0.0221 rows=300 loops=1)
```

### 거부된 요청의 첫 페이지 (보조 인덱스 없음)

```
-> Limit: 51 row(s)  (cost=1294 rows=51) (actual time=0.913..0.936 rows=51 loops=1)
    -> Nested loop inner join  (cost=1294 rows=4836) (actual time=0.912..0.934 rows=51 loops=1)
        -> Sort: a.created_at DESC, a.operation_id DESC  (cost=508 rows=4836) (actual time=0.911..0.913 rows=51 loops=1)
            -> Filter: (a.outcome = 'rejected')  (cost=508 rows=4836) (actual time=0.0264..0.816 rows=1000 loops=1)
                -> Table scan on a  (cost=508 rows=4836) (actual time=0.0251..0.648 rows=5000 loops=1)
        -> Single-row index lookup on u using PRIMARY (id=a.actor_id)  (cost=0.25 rows=1) (actual time=317e-6..328e-6 rows=1 loops=51)
```

### 거부된 요청의 첫 페이지 (인덱스 있음)

```
-> Limit: 51 row(s)  (cost=317 rows=12.8) (actual time=0.0101..0.209 rows=51 loops=1)
    -> Nested loop inner join  (cost=317 rows=12.8) (actual time=0.00983..0.207 rows=51 loops=1)
        -> Filter: (a.outcome = 'rejected')  (cost=4.09 rows=12.8) (actual time=0.00833..0.182 rows=51 loops=1)
            -> Index scan on a using ix_audit_logs_created (reverse)  (cost=4.09 rows=51) (actual time=0.00783..0.171 rows=251 loops=1)
        -> Single-row index lookup on u using PRIMARY (id=a.actor_id)  (cost=0.25 rows=1) (actual time=382e-6..392e-6 rows=1 loops=51)
```

### 노출 중인 공지

```
-> Sort: is_pinned DESC, created_at DESC, id DESC  (cost=3.75 rows=30) (actual time=0.0137..0.0212 rows=25 loops=1)
    -> Filter: (announcements.is_visible = true)  (cost=3.75 rows=30) (actual time=0.00183..0.00875 rows=25 loops=1)
        -> Table scan on announcements  (cost=3.75 rows=30) (actual time=0.0015..0.007 rows=30 loops=1)
```

