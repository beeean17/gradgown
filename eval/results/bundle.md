# 프론트 번들과 첫 화면 요청

2026-11-19에 잰 값이다. 방법은 [eval/README.md](../README.md)의 "번들 크기"에 있다.

## 번들 크기

"가져온 그대로"는 grad42의 웹을 손대지 않고 가져온 커밋 `9b4a26a`를, "지금"은 Firebase를 걷어낸 뒤의 커밋을 `vite build`로 빌드한 것이다. 첫 화면 JS는 `index.html`이 직접 요구하는 스크립트와 `modulepreload`의 합이다.

| 빌드 | 첫 화면 JS | 첫 화면 JS (gzip) | 전체 JS | 전체 JS (gzip) | JS 파일 | CSS (gzip) |
|---|---|---|---|---|---|---|
| 학생 웹, 가져온 그대로 | 1155.1 KB | 358.3 KB | 1443.9 KB | 453.0 KB | 33 | 61.6 KB |
| 학생 웹, 지금 | 597.5 KB | 193.6 KB | 889.9 KB | 289.5 KB | 33 | 61.6 KB |
| 관리자 앱, 가져온 그대로 | 1403.7 KB | 423.2 KB | 1403.7 KB | 423.2 KB | 1 | 28.3 KB |
| 관리자 앱, 지금 | 712.0 KB | 215.3 KB | 712.0 KB | 215.3 KB | 1 | 28.3 KB |

- 학생 웹은 화면이 그대로이고 데이터 계층만 바뀌었다. 줄어든 것은 Firebase SDK다. 전체 JS가 38% 줄고, 첫 화면 JS가 48% 줄었다.
- 관리자 앱은 Firebase SDK와 함께 범위 밖 화면(설정 저장, 편집, 내보내기 등)도 없앴다. 줄어든 양이 SDK만의 몫은 아니다.
- grad42의 성능 기록(`docs/perf/2026-11-04-baseline.md` 5절)은 같은 방식으로 센 첫 화면 JS를 1,135 KB(gzip 345 KB)로 적었다. 위의 "가져온 그대로" 1,155 KB(gzip 358 KB)와 같은 수준이다.

## 첫 화면이 보내는 요청

비로그인 상태로 학생 웹의 홈을 열었을 때 브라우저가 보낸 요청이다.

- **지금**은 이 프로젝트의 운영 빌드를 `vite preview`로 띄우고 헤드리스 Chrome(390×844)으로 4초 동안 기록했다.
- **원본**은 직접 재지 않았다. 원본을 띄우면 운영 Firebase에 닿기 때문이다. grad42의 성능 기록에서, 가져온 버전에 가장 가까운 단계의 값을 옮겼다(5절 "N3 Auth iframe 지연". 로컬에 띄운 운영 빌드를 잰 것이다).

| | 원본 (grad42의 기록) | 지금 (로컬 측정) |
|---|---|---|
| 요청 수 | 45 | 38 |
| 요청이 가는 곳 | 자체 도메인, reCAPTCHA Enterprise(`www.google.com`, `www.gstatic.com`), Firestore | 자체 도메인 한 곳 |
| 데이터 요청 | Firestore Listen 채널. App Check 토큰을 기다린 뒤에 시작한다 | REST 4개: `/api/me`, `/api/gown/periods/current`, `/api/mentoring/events/current`, `/api/announcements` |
| 첫 화면 전에 받는 외부 스크립트 | reCAPTCHA Enterprise 356 KB | 없음 |

읽을 때 조심할 점:

- 두 열은 같은 조건이 아니다. 요청 수 45와 38을 나란히 놓고 "7개 줄었다"고 말할 수는 없다. 원본의 45는 글꼴을 자체 호스팅으로 바꾸기 전에 잰 값이고, 그 뒤로는 다시 재지 않았다.
- **이전으로 없어진 것은 reCAPTCHA Enterprise(App Check)와 Firestore Listen 채널이다.** Firebase Auth의 iframe과 gapi(135 KB), Google Fonts로 가던 연결은 grad42가 가져온 버전 이전에 스스로 없앴다(기록의 N3, N5). 이전의 효과로 셀 수 없다.
- 말할 수 있는 것은 환경과 무관한 구조다. 첫 화면이 기다리던 사슬(JS 실행 → reCAPTCHA → App Check 토큰 → Firestore 응답)이 없어지고, 같은 출처로 가는 REST 요청 넷으로 바뀌었다.
