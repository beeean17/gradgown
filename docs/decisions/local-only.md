# localhost에서만 실행한다

- 상태: 확정 (2026-11-13)
- 관련: [project-positioning.md](./project-positioning.md), [tech-stack.md](./tech-stack.md), [evaluation.md](./evaluation.md)

## 결정

프론트, 서버, DB를 모두 **개발 머신의 localhost에서** 실행한다. 어디에도 배포하지 않는다. 보고서의 실행 증빙은 로컬에서 띄운 화면과 쿼리 실행 결과로 한다.

## 이유

- 과제에 실제 웹에서 동작해야 한다는 조건이 없다. 슬라이드 어디에도 배포 요구가 없다.
- 실제 운영에 쓰지 않는다([project-positioning.md](./project-positioning.md)).

## 검토한 대안

| 대안 | 채택하지 않은 이유 |
|---|---|
| 프론트를 GitHub Pages에 배포해 동작을 보고서에 싣는다 | GitHub Pages는 정적 호스팅이라 Spring과 MySQL을 돌릴 수 없다. 프론트만 올리면 백엔드 호스팅, HTTPS, CORS, 하위 경로와 SPA 새로고침 처리가 따로 필요하다. 과제에 필요한 것보다 일이 많다 |

## 영향

- **성능 비교의 조건이 달라진다.** 운영 중인 Firebase 사이트와 로컬 서버를 같은 조건으로 잴 수 없다. 응답 시간보다 구조적인 지표를 본다([evaluation.md](./evaluation.md)).
- CORS, HTTPS, 도메인 설정을 다루지 않는다.

## 미정

- MySQL을 띄우는 방법. 2026-11-13 현재 개발 머신에는 로컬 MySQL이 설치돼 있지 않고 Docker 데몬은 꺼져 있다.
