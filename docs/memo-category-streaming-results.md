# 카테고리 대기 분리 검증 결과

2026-10-29. [승인 설계와 시안](memo-category-streaming-design.md)에 따라 category 서버 조회를
await 없이 시작하고, sidebar/main 공통 조상에서 pending query Promise를 전달했다.
기본 메뉴·검색·기존 목록 Skeleton은 먼저 표시하며 category 영역만 별도 Suspense로 기다린다.
카드가 category 데이터를 읽는 기존 의존성과 인증 검증은 유지했다.

## 비교 조건

- 기존 production build를 변경 전 보존한 뒤 후보를 새로 build했다. 둘 다 전용 `localhost:3116`, Node24.14.0, 동일 Playwright Desktop Chrome, 1 worker로 실행했다.
- 브라우저 REST는 합성 메모20개·보조 목 데이터, 서버 category는 `[]` 합성 응답이다. 실제 테스트 계정 인증만 사용하고 실제 메모/카테고리는 읽거나 쓰지 않았다.
- 요청 routing 때문에 HTTP cache는 비활성화되고 각 표본의 Query cache는 새 context다. 서버/CDN cold cache라고 주장하지 않는다.
- `delay`는 category에만 고정3000ms를 추가한 조건, `normal`은 합성 category 즉시 응답 조건이다. 실DB 정상 네트워크 조건이 아니다.
- 각 조건3회. 첫 실행에는 서버·인증 초기화 차이가 있어 전체 범위와 개별 수치를 그대로 남긴다. 작은 표본에 p75/p95·통계적 개선율을 계산하지 않는다.
- `shell`은 검색 입력 DOM 관측, `content`는 DOM20개와 마지막 카드 연속 프레임 배치 안정 proxy다. 실제 픽셀·이미지 전체 완료 지표는 아니다.

## category 3초 지연 조건

단위 ms. 탐색 시작이 공통0이며 각 열은 누적 시각으로 단순 합산하지 않는다.

| 조건 | 최종 HTML 헤더 | shell | 첫 목록 GET 시작 | content20개 |
| --- | --- | --- | --- | --- |
| 기존1 | 3139 | 3189 | 3748 | 4109 |
| 기존2 | 3075 | 3101 | 3637 | 4003 |
| 기존3 | 3085 | 3123 | 3642 | 4004 |
| 수정1 | 821 | 871 | 1479 | 3801 |
| 수정2 | 92 | 117 | 640 | 3271 |
| 수정3 | 83 | 104 | 641 | 3386 |

기존 빌드는 category 완료 전 목록 GET 시작 검사에3회 모두 실패했고, 후보는3회 모두 통과했다.
후보 각 탐색 구간에 서버 category1회·브라우저 category0회가 대응한다. 각 GET 응답은 mock HTTP200,
DOM20개·정상 완료다. 요청 시작이 앞당겨지고 중복이 없다는 근거이며 카테고리와 무관하게 카드가 완성된다는 뜻은 아니다.
후보 content는 category Promise가 풀린 뒤였다. 운영 지연의 동일 개선율을 주장하지 않는다.

## 추가 지연 없는 합성 조건

| 조건 | 최종 HTML 헤더3회 | shell3회 | 목록 GET 시작3회 | content3회 |
| --- | --- | --- | --- | --- |
| 기존 | 685 / 95 / 102 | 721 / 121 / 128 | 1293 / 652 / 654 | 1655 / 1008 / 1010 |
| 수정 | 561 / 96 / 170 | 613 / 137 / 218 | 1189 / 651 / 713 | 1553 / 1007 / 1080 |

이 조건에서는 일관된 시간 단축이 확인되지 않았다. 느린 category 대기의 직렬화를 제거하는 효과와
즉시 category 응답의 결과를 구분한다. 모든 탐색의 firstInterimResponseStart는0이었고,
최종 헤더 필드가 없는 브라우저에서는 null로 남기며 responseStart로 조용히 대체하지 않는다.

## 검증

- pending query 공유, empty와 Supabase error 값 구분, 실제 rejection 종료, 최신 browser cache 보호: 단위4/4 PASS.
- 신규 reload/mobile과 기존 category 생성·편집 취소·저장 실패 후 입력 유지/재시도·중복 제출 방지/취소: 브라우저5/5 PASS.
- 고정 gate에서 shell·GET 선행, category 정상/빈 결과·중복0, 모바일 Sheet18rem,
  다크 모드 Skeleton32/48/32px·Sidebar192px·내부 이동: 최종 success5000 조건3/3, 추적 가능한 server bootstrap의 empty5000 조건3/3 PASS.
- 전체 typecheck15tasks, production build, check/lint, env manifest 정합 통과. 기존 Biome 경고10건 유지.
- 첫 빌드는 공유 hooks 배럴이 서버에 useRef 모듈을 끌어와 실패했다. 기존 서버 호환 CategoryService로 좁힌 뒤 build 통과했다. 전역 client 경계를 추가하지 않았다.
- 초기 브라우저 검사에서 fallback DOM 선택/전환 시점의 단발 관측을 보정했다. 현재 치수 기대값은 유지하며 연결된 locator를 재시도한다. 제품 동작을 바꿔 검사를 통과시키지 않았다.
- 독립 이벤트 분석: 추가0·수정0·제거0. 기존 Faro와 사용자 행동 이벤트를 유지한다.

독립 browser QA는 자동7 PASS·FAIL0·수동 대기5다. 단위/부분 브라우저 근거가 있어도
다음 전체 시나리오를 자동 PASS로 바꾸지 않았다.

1. 카테고리/카드의 전체 성공 조작: 순서·색·활성·개수·추가·편집·삭제·카드 옵션을 함께 확인.
2. Supabase `{data:null,error}`의 실제 화면과 안전 오류 기록 계약.
3. 실제 query Promise rejection부터 오류 경계·재시도 완료까지.
4. 편집 입력·mutation과 늦은 SSR hydration을 함께 발생시킨 경합.
5. 도달 가능한 icon 변형과 다크 모드의 승인 시안 비교. 기본 offcanvas의 기존 동작을 바꾸지 않았다.

모바일 메뉴 이동 시 자동 닫힘은 이번 요구가 아니며, 기존 메뉴 이동과 Escape 닫기를 확인했다.

## 재현과 기록

[전용 서버 fixture와 실행 방법](../e2e/probes/category-streaming/README.md).
수치 원본은 git 제외 `e2e/.memo-performance/category-streaming-comparison.json`과
`category-phase-{before,after}_{delay,normal}-1..3.json`이다. raw DOM/네트워크/trace·인증값·실제 메모 원문은
최종 산출물에 포함하지 않았다. 이번 비교는 로컬이며 운영 master 배포·운영 후보 전후 비교가 아니다.
