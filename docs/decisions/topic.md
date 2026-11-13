# 주제는 grad42의 Firebase → MySQL 이전이다

- 상태: 확정 (2026-11-13)
- 관련: [project-positioning.md](./project-positioning.md), [scope.md](./scope.md), [과제 요구사항](../requirements/course-requirements.md)

## 결정

텀 프로젝트 주제는 **grad42를 NoSQL(Firebase Firestore)에서 MySQL 기반으로 옮기는 것**이다.

grad42는 학위복 대여 예약과 St:talk 멘토링 신청을 운영하는 서비스다. 현재는 Firestore, Firebase Auth, Cloud Functions 위에서 돌아간다.

## 동기

- 내년 운영을 위해 백엔드를 관계형 DB 기반으로 옮기려 한다.
- 성능을 개선하려 한다.

이 저장소의 구현을 실제 운영에 쓰지는 않는다([project-positioning.md](./project-positioning.md)). 동기는 실제 이전 계획에서 오고, 이 프로젝트는 그 이전을 과제 규모로 해 보는 것이다.

## 이유

- **실제 문제다.** 슬라이드가 권장하는 "real issue"이고, 운영 중인 서비스라 배경과 세부 내용이 충분하다.
- **비교 기준이 이미 있다.** 보고서 양식이 요구하는 "기존 방식과 비교"에 Firebase 버전을 기준으로 쓸 수 있다.
- **구조 변환이 곧 설계 설명이다.** Firestore의 문서·하위 컬렉션·중첩 map을 테이블과 제약으로 옮기는 과정이 ER 모델 설명이 된다([data-model.md](./data-model.md)).

## 영향

- 성능 개선을 보고서에 쓰려면 측정할 항목을 구체적으로 정해야 한다([evaluation.md](./evaluation.md)).
- 원본 서비스의 규칙은 grad42 main의 요구사항·계약 문서를 따른다([docs/README.md](../README.md) "원본 서비스").
