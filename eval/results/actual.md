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
| MySQL | `WHERE period_id = ? ORDER BY id DESC LIMIT 51` | 1 | 190 행 | 51건 | 22.6 KB | 1.5 ms |

## 2. 회차에서 한 사람 찾기

찾는 사람은 회차의 예약을 최신순으로 늘어놓았을 때 한가운데(500번째)에 있다. 원본의 검색 상자는 브라우저가 받은 페이지 안에서만 찾고, 화면에도 "현재 페이지 검색"이라고 적혀 있다.

| 저장소 | 방법 | 요청 | 읽은 것 | 돌려받은 것 | 응답 크기 | 결과 |
|---|---|---|---|---|---|---|
| Firestore | 첫 페이지에서 검색 | 1 | 51 문서 | 51건 | 51.3 KB | **못 찾음.** 받은 51건 안에 없다. 화면은 "표시할 항목이 없습니다"를 보인다 |
| Firestore | 찾을 때까지 "다음 페이지" | 10 | 510 문서 | 510건 | 512.9 KB | 찾음. 몇 번째 페이지에 있는지는 미리 알 수 없다 |
| MySQL | `WHERE … name LIKE ? OR student_id LIKE ? OR phone LIKE ?` | 1 | 1,004 행 | 1건 | 470 B | 찾음. 2.4 ms |

## 3. St:talk 신청 인원 집계

선택지(1~7과 선택 안함) × 차시의 신청 완료 인원 16칸을 구한다. 실제 인원의 합은 차시마다 270명이다.

| 저장소 | 방법 | 요청 | 읽은 것 | 돌려받은 것 | 응답 크기 | 결과 |
|---|---|---|---|---|---|---|
| Firestore | 행사의 신청을 모두 읽어 브라우저에서 센다 (`limit(1001)`) | 1 | 300 문서 | 300건 | 236.2 KB | 맞음 |
| MySQL | `GROUP BY` 한 번 | 1 | 1,696 행 | 8건 | 457 B | 맞음. 1.0 ms |

## 4. 감사 로그에서 오래된 거부 요청 찾기

전체 5,000건 가운데 5분의 1이 거부된 요청이고, 실패(`failed`)는 한 건도 없다. 찾는 것은 오래된 거부 한 건이고, 그보다 새 거부 건이 499건 있다. 시각 인덱스는 `(created_at, operation_id)`, 결과별 인덱스는 `(outcome, created_at, operation_id)`다.

| 저장소 | 방법 | 요청 | 읽은 것 | 돌려받은 것 | 응답 크기 | 결과 |
|---|---|---|---|---|---|---|
| Firestore | 최신 200건을 읽어 브라우저에서 찾는다 | 1 | 200 문서 | 200건 | 274.0 KB | **못 찾음.** 200건 밖이다. 화면은 "최근 200건 안에서 검색"이라고 밝힌다 |
| MySQL | 요청 ID로 찾기 (`operation_id = ?`, PK) | 1 | 2 행 | 1건 | 340 B | 찾음. 0.4 ms |
| MySQL | 거부된 요청의 첫 페이지, 보조 인덱스 없음 | 1 | 5,054 행 | 51건 | 16.9 KB | 1.4 ms |
| MySQL | 같은 문장, 시각 인덱스 | 1 | 303 행 | 51건 | 16.9 KB | 0.7 ms |
| MySQL | 같은 문장, 결과별 인덱스 추가 | 1 | 102 행 | 51건 | 16.9 KB | 0.5 ms |
| MySQL | 거부된 요청을 페이지로 넘겨 찾는 건까지, 시각 인덱스 | 10 | 3,065 행 | 500건 | — | 찾음 |
| MySQL | 같은 넘김, 결과별 인덱스 추가 | 10 | 1,028 행 | 500건 | — | 찾음 |
| MySQL | 한 건도 없는 결과(`failed`)의 첫 페이지, 시각 인덱스 | 1 | 5,002 행 | 0건 | — | 3.9 ms |
| MySQL | 같은 문장, 결과별 인덱스 추가 | 1 | 1 행 | 0건 | — | 0.3 ms |

## 5. 학생에게 내려가는 공지

공지 30건 가운데 5건이 숨김이다.

| 저장소 | 방법 | 요청 | 읽은 것 | 돌려받은 것 | 응답 크기 | 결과 |
|---|---|---|---|---|---|---|
| Firestore | 문서 하나를 통째로 읽고 브라우저가 숨김 항목을 뺀다 | 1 | 1 문서 | 30건 | 33.5 KB | **숨김 5건이 브라우저까지 내려온다** |
| MySQL | 학생 계정은 뷰 `visible_announcements`만 읽는다 | 1 | 33 행 | 25건 | 22.1 KB | 숨김 0건. 0.5 ms |

## 실행 계획

`EXPLAIN ANALYZE`의 출력이다. 시간은 이 컨테이너에서의 값이다.

### 예약 명단 첫 페이지

```
-> Limit: 51 row(s)  (cost=1153 rows=51) (actual time=0.255..0.507 rows=51 loops=1)
    -> Nested loop inner join  (cost=1153 rows=1000) (actual time=0.252..0.499 rows=51 loops=1)
        -> Nested loop inner join  (cost=803 rows=1000) (actual time=0.248..0.405 rows=51 loops=1)
            -> Nested loop inner join  (cost=453 rows=1000) (actual time=0.246..0.343 rows=51 loops=1)
                -> Index range scan on r using fk_gown_reservations_period over (period_id = '2027-02') (reverse), with index condition: (r.period_id = '2027-02')  (cost=103 rows=1000) (actual time=0.235..0.267 rows=51 loops=1)
                -> Single-row index lookup on rent_slot using PRIMARY (id=r.rent_slot_id)  (cost=0.25 rows=1) (actual time=0.00103..0.00108 rows=1 loops=51)
            -> Single-row index lookup on return_slot using PRIMARY (id=r.return_slot_id)  (cost=0.25 rows=1) (actual time=919e-6..962e-6 rows=1 loops=51)
        -> Single-row index lookup on u using PRIMARY (id=r.user_id)  (cost=0.25 rows=1) (actual time=0.00154..0.00158 rows=1 loops=51)
```

### 이름으로 한 사람 찾기

```
-> Limit: 51 row(s)  (cost=415 rows=51) (actual time=0.346..0.667 rows=1 loops=1)
    -> Nested loop inner join  (cost=415 rows=298) (actual time=0.345..0.667 rows=1 loops=1)
        -> Nested loop inner join  (cost=311 rows=298) (actual time=0.344..0.665 rows=1 loops=1)
            -> Nested loop inner join  (cost=207 rows=298) (actual time=0.343..0.664 rows=1 loops=1)
                -> Filter: ((r.`name` like '%측정대상%') or (r.student_id like '%측정대상%') or (r.phone like '%측정대상%'))  (cost=103 rows=298) (actual time=0.34..0.661 rows=1 loops=1)
                    -> Index range scan on r using fk_gown_reservations_period over (period_id = '2027-02') (reverse), with index condition: (r.period_id = '2027-02')  (cost=103 rows=1000) (actual time=0.0542..0.567 rows=1000 loops=1)
                -> Single-row index lookup on rent_slot using PRIMARY (id=r.rent_slot_id)  (cost=0.25 rows=1) (actual time=0.00212..0.00212 rows=1 loops=1)
            -> Single-row index lookup on return_slot using PRIMARY (id=r.return_slot_id)  (cost=0.25 rows=1) (actual time=792e-6..834e-6 rows=1 loops=1)
        -> Single-row index lookup on u using PRIMARY (id=r.user_id)  (cost=0.25 rows=1) (actual time=0.00133..0.00133 rows=1 loops=1)
```

### 선택지 × 차시 인원 집계

```
-> Table scan on <temporary>  (actual time=0.215..0.216 rows=8 loops=1)
    -> Aggregate using temporary table  (actual time=0.215..0.215 rows=8 loops=1)
        -> Table scan on choice  (cost=92..98.2 rows=300) (actual time=0.122..0.146 rows=540 loops=1)
            -> Union all materialize  (cost=92..92 rows=300) (actual time=0.122..0.122 rows=540 loops=1)
                -> Filter: ((mentoring_registrations.`status` = 'reserved') and (mentoring_registrations.event_id = '2027-01'))  (cost=31 rows=150) (actual time=0.006..0.0505 rows=270 loops=1)
                    -> Table scan on mentoring_registrations  (cost=31 rows=300) (actual time=0.00546..0.0239 rows=300 loops=1)
                -> Filter: ((mentoring_registrations.`status` = 'reserved') and (mentoring_registrations.event_id = '2027-01'))  (cost=31 rows=150) (actual time=0.00471..0.0482 rows=270 loops=1)
                    -> Table scan on mentoring_registrations  (cost=31 rows=300) (actual time=0.0045..0.0222 rows=300 loops=1)
```

### 요청 ID로 한 건 찾기

```
-> Limit: 51 row(s)  (cost=0..0 rows=1) (actual time=417e-6..458e-6 rows=1 loops=1)
    -> Rows fetched before execution  (cost=0..0 rows=1) (actual time=167e-6..208e-6 rows=1 loops=1)
```

### 거부된 요청의 첫 페이지 (보조 인덱스 없음)

```
-> Limit: 51 row(s)  (cost=1336 rows=51) (actual time=1.41..1.43 rows=51 loops=1)
    -> Nested loop inner join  (cost=1336 rows=4996) (actual time=1.41..1.43 rows=51 loops=1)
        -> Sort: a.created_at DESC, a.operation_id DESC  (cost=524 rows=4996) (actual time=1.41..1.41 rows=51 loops=1)
            -> Filter: (a.outcome = 'rejected')  (cost=524 rows=4996) (actual time=0.0244..1.26 rows=1000 loops=1)
                -> Table scan on a  (cost=524 rows=4996) (actual time=0.0235..1.01 rows=5000 loops=1)
        -> Single-row index lookup on u using PRIMARY (id=a.actor_id)  (cost=0.25 rows=1) (actual time=321e-6..336e-6 rows=1 loops=51)
```

### 거부된 요청의 첫 페이지 (시각 인덱스)

```
-> Limit: 51 row(s)  (cost=317 rows=12.8) (actual time=0.0121..0.214 rows=51 loops=1)
    -> Nested loop inner join  (cost=317 rows=12.8) (actual time=0.0117..0.212 rows=51 loops=1)
        -> Filter: (a.outcome = 'rejected')  (cost=4.09 rows=12.8) (actual time=0.00992..0.186 rows=51 loops=1)
            -> Index scan on a using ix_audit_logs_created (reverse)  (cost=4.09 rows=51) (actual time=0.00933..0.176 rows=251 loops=1)
        -> Single-row index lookup on u using PRIMARY (id=a.actor_id)  (cost=0.25 rows=1) (actual time=395e-6..408e-6 rows=1 loops=51)
```

### 한 건도 없는 결과의 첫 페이지 (시각 인덱스)

```
-> Limit: 51 row(s)  (cost=317 rows=12.8) (actual time=3.32..3.32 rows=0 loops=1)
    -> Nested loop inner join  (cost=317 rows=12.8) (actual time=3.32..3.32 rows=0 loops=1)
        -> Filter: (a.outcome = 'failed')  (cost=4.09 rows=12.8) (actual time=3.32..3.32 rows=0 loops=1)
            -> Index scan on a using ix_audit_logs_created (reverse)  (cost=4.09 rows=51) (actual time=0.00779..3.16 rows=5000 loops=1)
        -> Single-row index lookup on u using PRIMARY (id=a.actor_id)  (cost=0.25 rows=1) (never executed)
```

### 거부된 요청의 첫 페이지 (결과별 인덱스 추가)

```
-> Limit: 51 row(s)  (cost=523 rows=51) (actual time=0.071..0.1 rows=51 loops=1)
    -> Nested loop inner join  (cost=523 rows=1000) (actual time=0.0708..0.0988 rows=51 loops=1)
        -> Filter: (a.outcome = 'rejected')  (cost=173 rows=1000) (actual time=0.069..0.0755 rows=51 loops=1)
            -> Index lookup on a using ix_audit_logs_outcome (outcome='rejected') (reverse)  (cost=173 rows=1000) (actual time=0.0642..0.0673 rows=51 loops=1)
        -> Single-row index lookup on u using PRIMARY (id=a.actor_id)  (cost=0.25 rows=1) (actual time=349e-6..367e-6 rows=1 loops=51)
```

### 한 건도 없는 결과의 첫 페이지 (결과별 인덱스 추가)

```
-> Limit: 51 row(s)  (cost=0.7 rows=1) (actual time=0.00254..0.00254 rows=0 loops=1)
    -> Nested loop inner join  (cost=0.7 rows=1) (actual time=0.00237..0.00237 rows=0 loops=1)
        -> Filter: (a.outcome = 'failed')  (cost=0.35 rows=1) (actual time=0.00213..0.00213 rows=0 loops=1)
            -> Index lookup on a using ix_audit_logs_outcome (outcome='failed') (reverse)  (cost=0.35 rows=1) (actual time=0.00188..0.00188 rows=0 loops=1)
        -> Single-row index lookup on u using PRIMARY (id=a.actor_id)  (cost=0.35 rows=1) (never executed)
```

### 노출 중인 공지

```
-> Sort: is_pinned DESC, created_at DESC, id DESC  (cost=3.75 rows=30) (actual time=0.0137..0.0212 rows=25 loops=1)
    -> Filter: (announcements.is_visible = true)  (cost=3.75 rows=30) (actual time=0.00213..0.00879 rows=25 loops=1)
        -> Table scan on announcements  (cost=3.75 rows=30) (actual time=0.00188..0.00729 rows=30 loops=1)
```

