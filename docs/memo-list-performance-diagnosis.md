# 메모 목록 성능 진단

작업카드: https://www.notion.so/40789de02fde814b9cc8f5d99d72fdda (DB-1256)

이 작업은 `/memos`, `/memos/wish`, `/memos/star`, `/memos/reading`의 지연을 재현하는 로컬 진단 도구를 추가합니다. 제품 화면·쿼리·캐시·Faro/Sentry 설정은 바꾸지 않습니다. 현재 서비스가 느리다고 전제하지 않습니다.

## 확인된 현재 흐름

`MemoPage` → `ClientMemoView`(`ssr: false`) → Supabase client 준비 → `useMemosInfiniteQuery` → `MemoViewFrame` → 카드/작성일별/도메인별 배치 순입니다. 서버 HTML의 목록은 스켈레톤이며 실제 메모 조회는 브라우저에서 시작합니다.

| 근거 | 확인한 사실 | 아직 증명하지 않은 것 |
| --- | --- | --- |
| `packages/shared/src/hooks/supabase/queries/useMemosInfiniteQuery.ts` | 20개 단위 복합 커서 조회, 첫 페이지 count로 총 개수 표시 | 이 조회가 운영 임계 경로의 주된 병목인지 |
| `packages/shared/src/utils/supabase/memoService.ts`의 `getMemosPaginated` | 모든 페이지가 `count: exact` 요청 | 추가 페이지 count를 생략했을 때 실제 DB 비용 감소량 |
| `MemoView/_hooks/useMemoSearchConditions.ts`, `MemoSearchForm/index.tsx` | 검색 watch 값 즉시 전달, 800ms debounce는 analytics만 대상 | 빠른 입력의 요청 경합이 실제 사용자의 지연을 늘리는 정도 |
| `useMemosInfiniteQuery`의 queryFn | AbortSignal을 전달하지 않음 | 논리적 검색 대체와 물리 요청 취소의 관계 |
| `MemoView/index.tsx`의 loadOutcome | 첫 페이지 오류는 error로 계측, 추가 페이지는 첫 페이지 결과만으로 판정할 수 없음 | 운영의 실제 오류 비율 |
| `MemoGrid.tsx`, `MemoList.tsx` | Masonry 배치 완료를 관측, grid의 `useRecycle=false` | 페이지 누적에 따른 배치·DOM 비용 |

검색은 title/memo/impression/actionItem 네 컬럼 OR입니다. 현재 검색 대상 select 값은 목록 조회로 전달되지 않으므로 결과를 제목 전용/본문 전용 검색 성능이라고 부르지 않습니다. 이 연결 문제는 별도 기능 검토 대상으로 남깁니다.

all/star/reading은 위시 메모를 제외하고 wish만 위시 메모를 조회합니다. list는 created_at, grid/domain은 updated_at 정렬입니다. 캐시·필터·정렬 조건을 섞어 비교하지 않습니다. 도메인 목록 조회와 하이라이트/출처 요청은 목록 요청과 구분합니다.

## 측정의 경계

2026-10-28 후속 변경으로 현재 probe는 측정 정의 v3다. 아래 v1/v2 결과는 역사적 기록으로 보존하며, 마지막 카드 배치 검사·비용 분리·CDP 숫자 수집·관측 창 및 실제 비교 결과는 [최적화 기록](memo-performance-optimization.md)을 따른다. v2의 보조 요청 개선만으로는 표시 시간이 줄지 않았으나, v3에서 카드 재렌더를 줄인 뒤 합성 list 200개는 약 4.4초→1.9초, 2000개는 단일 실행에서 약 148초에 전체 완료했다. 서로 다른 측정 정의를 섞어 개선율을 계산하지 않는다.

운영 지표의 정의와 허용 전송 필드는 [기존 관측 문서](memo-performance-observability.md)를 따릅니다.

| 이름 | 의미 | 한계 |
| --- | --- | --- |
| Faro `shell_ready` | React 커밋 후 rAF 콜백 | 최초 페인트가 아님 |
| Faro `data_ready` | 첫 데이터가 목록 컴포넌트에 전달됨 | 순수 HTTP·DB 시간과 다름 |
| Faro `content_ready` | 목록 배치 또는 정상 빈 상태 완료 | 탐색별 1회, 동일 경로 검색/추가 페이지 구분 불가 |
| 로컬 `observed_content_ready` | 합성 결과 확인 및 DOM 배치 안정 proxy | 실제 픽셀 페인트·이미지 로딩·조작 준비 완료를 보증하지 않음 |
| 서버 `app.memo.server_request` | 허용 Next GET 요청 처리 | Supabase DB 쿼리나 브라우저 전체 지연과 다름 |

Faro는 세션 10% 표본이며 서버 span은 Sentry의 별도 표본입니다. 브라우저/서버 건수를 1:1 비교하지 않습니다. 서로 다른 단계의 p75/p95를 빼서 구간 시간으로 만들지 않습니다. 같은 로컬 시도에서 측정한 시작/종료 시간 차이만 구간 시간으로 사용합니다.

목은 브라우저 목록 요청과 렌더를 통제합니다. 앱 서버의 인증·사이드바 SSR, CDN cold, 실제 DB 실행계획·인덱스 비용을 통제하거나 증명하지 않습니다. 합성 데이터의 빠른 결과를 운영 개선이라고 해석하지 않습니다.

## 재현 조건과 판정

### 실행

루트에서 실행합니다. 첫 명령은 전용 설정이 production preview 서버를 직접 만들며, 기존 서버가 있으면 중단합니다. `MEMO_PERF_REUSE_PREVIEW=1`은 직접 `next start`로 띄운 서버임을 확인했을 때만 사용합니다. 개발 서버를 재사용하지 않습니다.

```bash
# 기본: 네 경로의 cold hard navigation을 각 1회 검증
pnpm -F e2e exec playwright test -c playwright.memo-performance.config.ts

# 이미 production preview가 떠 있는 경우
MEMO_PERF_REUSE_PREVIEW=1 pnpm -F e2e exec playwright test -c playwright.memo-performance.config.ts

# 동일 조건 30회: 탐색적 p75와 참고 p95
MEMO_PERF_REUSE_PREVIEW=1 MEMO_PERF_SCENARIOS=all_hard_20 MEMO_PERF_REPETITIONS=30 \
  pnpm -F e2e exec playwright test -c playwright.memo-performance.config.ts

# 필요한 경계 조건만 선택 (쉼표로 연결)
MEMO_PERF_REUSE_PREVIEW=1 MEMO_PERF_SCENARIOS=all_hard_0,all_search_20,all_load_more_21,all_next_error_21,all_rapid_20,all_timeout_20 \
  pnpm -F e2e exec playwright test -c playwright.memo-performance.config.ts

# 200/2000개 데이터의 첫 화면 20개 표시: 각 30회
MEMO_PERF_REUSE_PREVIEW=1 MEMO_PERF_SCENARIOS=all_hard_200,all_hard_2000 MEMO_PERF_REPETITIONS=30 \
  pnpm -F e2e exec playwright test -c playwright.memo-performance.config.ts

# 200개를 끝까지 누적 표시하는 list 스트레스 측정: 3회
MEMO_PERF_REUSE_PREVIEW=1 MEMO_PERF_SCENARIOS=all_load_more_200 MEMO_PERF_REPETITIONS=3 \
  pnpm -F e2e exec playwright test -c playwright.memo-performance.config.ts

# 2000개 누적 표시: 우선 1회, 테스트 제한 180초
MEMO_PERF_REUSE_PREVIEW=1 MEMO_PERF_SCENARIOS=all_load_more_2000 \
  pnpm -F e2e exec playwright test -c playwright.memo-performance.config.ts

# 통계·허용 필드 출력 계약 검증
pnpm exec vitest run e2e/probes/memo-performance/statistics.test.ts
```

`MEMO_PERF_REPETITIONS`는 1~100이며 기본 1입니다. 시나리오별 정상 결과가 확인돼야 지연 표본으로 해석합니다. 수집 결과는 `e2e/.memo-performance/report.json`에 실행 단위로 덮어쓰며 git에서 제외합니다. 비교할 결과는 실행 직후 별도 로컬 경로에 보존합니다. 보고서의 `cells`는 조건별 분모와 지연 표본을 포함하고, `blocked`는 성능 시도에서 제외됩니다.

시나리오 이름은 `{all,star,wish,reading}_{hard,reload,warm,internal,slow}_20`과 all 전용 크기·보기·검색·필터·오류 조건입니다. `reload`는 같은 context의 hard 재접속(Query 캐시는 초기화), `warm`은 같은 context의 SPA 재방문(Query 캐시 재사용)입니다. 전체 조합을 자동 실행하지 않으며 `e2e/probes/memo-performance.spec.ts`의 목록에서 선택합니다.

- production build 및 `next start`, Chromium, 1 worker를 사용합니다. 개발 모드 측정값을 운영 기준선으로 쓰지 않습니다.
- hard cold는 인증만 주입한 새 context, warm은 같은 context 재방문입니다. HTTP/Router/Query 캐시와 백그라운드 재조회를 나눠 기록합니다. 서버/CDN cold는 증명하지 못하면 unknown입니다.
- Playwright의 route 모킹은 HTTP 캐시를 비활성화하므로 실제 보고서는 `http_cache=disabled_by_routing`으로 기록합니다. `reload`를 실제 HTTP warm-cache 효과로 해석하지 않습니다. 초기 200/2000건 시나리오도 첫 페이지 20건만 배치하므로 누적 DOM 비용의 증거가 아닙니다.
- normal은 제한 없음, slow는 latency 150ms·download 200000 bytes/s·upload 93750 bytes/s·CPU throttle 1입니다. 응답 delay 1500ms 실험과 실제 네트워크 제한을 혼동하지 않습니다.
- 합성 0/20/21/200/2000건, 짧은/긴 본문, grid/list/domain, 정상/빈/오류/연속 입력/30초 타임아웃을 선택해 실행합니다. 전체 조합을 무조건 곱하지 않습니다.
- 검색은 마지막 입력 직전, 필터/라우트 이동은 사용자 조작 직전, 추가 로딩은 다음 페이지 실제 요청 시작을 측정 시작점으로 삼습니다. 추가 로딩 트리거 대기는 요청 시간과 분리합니다.
- `all_load_more_200/2000`은 첫 20개가 준비된 뒤 20개씩 추가 조회하며, 매번 DOM 개수와 배치 안정을 확인합니다. 첫 추가 요청 시작부터 목표 개수 전체의 배치 안정까지 측정하므로 중간 스크롤·트리거·검증 시간도 포함합니다. 순수 렌더 시간이나 한 페이지 응답 시간이 아닙니다. 트리거는 버튼으로 스크롤한 뒤 1초 내 요청이 없으면 클릭하며, 각 테스트 제한은 180초입니다. n=3 결과에는 백분위를 내지 않습니다.
- 최신 조건에 맞는 결과를 확인합니다. 이전 검색의 늦은 응답은 최신 검색 성공으로 집계하지 않습니다. 캐시로 이미 표시된 결과는 요청이 없어도 유효합니다.
- 정상 빈 결과는 `empty`, 첫/추가 페이지 응답 오류는 `error`, 다른 조작으로 대체된 논리 동작은 `cancelled`, 30초 예산 소진은 `timeout`입니다. cancelled를 실제 HTTP abort로 표현하지 않습니다.
- 인증·빌드 준비 실패는 `blocked`입니다. 로그인 시간을 목록 표시 시간으로 계산하거나 인증 우회를 넣지 않습니다.

## 통계와 비교

지연 백분위는 success와 empty 각각 계산하며 error/cancelled/timeout을 넣지 않습니다. 완료 분류된 시도 수는 success+empty+error+cancelled+timeout이고, 각 결과 비율은 같은 조건의 이 수를 분모로 합니다. blocked와 미실행은 분리합니다.

정렬한 지연 값에서 `ceil(p*n)`번째를 고르는 nearest-rank를 사용합니다. n<30이면 백분위를 내지 않습니다. n≥30의 p75는 탐색적 수치이며, n<100의 p95는 참고치로 표시합니다. 표본수만으로 운영 SLO의 안정성을 보증하지 않습니다.

개선 전후는 동일 기기·브라우저·빌드 모드·합성 데이터·조건·표본수에서 교차 실행합니다. 목표는 기준선 확보 후 정하며, 오류율과 회귀를 함께 확인합니다. 병목 증거가 없으면 최적화 없이 진단을 마칩니다.

운영에는 시작 이벤트와 탐색 ID가 없어 누락·중복을 완전히 검증할 수 없습니다. sampled terminal content_ready와 navigation_end를 집계하더라도 이를 전체 사용자 실패율이라고 부르지 않습니다. 운영에 없는 캐시·데이터량 필드를 역추정하지 않습니다.

## 산출물과 개인정보

허용된 경로·고정 시나리오·동작·보기·합성 데이터량·네트워크/캐시 조건·시간·결과·표본수만 로컬 JSON으로 저장합니다. 원문 URL/쿼리·검색어·메모/사용자 ID·제목·본문·쿠키·인증 헤더·요청/응답 body·원본 오류 메시지는 저장하지 않습니다.

전용 실행에서는 HAR·trace·screenshot·video와 기본 HTML/JSON 실패 리포트를 끕니다. 로그인 setup에도 같은 제한을 적용합니다. 실제 DB 데이터를 생성하거나 정리하는 global teardown을 실행하지 않습니다. 기존 운영 계측의 전송 계약과 표본 비율은 변경하지 않습니다.

설치된 Playwright 1.58.2는 trace/screenshot이 꺼져 있어도 실패 시 `error-context.md`에 DOM snapshot을 남깁니다. 전용 config는 이 버전의 `PLAYWRIGHT_NO_COPY_PROMPT=1` 경로로 자동 snapshot도 차단합니다. Playwright를 업그레이드하면 실패를 주입해 이 제한을 다시 확인합니다. 안전 reporter는 원본 stdout/stderr·오류·attachment를 출력하지 않고 허용 필드로 측정값을 재구성합니다. 로그인 storageState는 기존 `e2e/.auth/`에만 저장되며 성능 보고서에 포함하지 않습니다.

## 현재 관측 결과

| 구분 | 표본/결과 | 해석 |
| --- | --- | --- |
| 운영 Grafana 접근 | 2026-10-28 HTTP 503, latency n=0 | 이번 접근에서의 응답. 전체 서비스 장애나 그 원인은 미확인 |
| 운영 목록 접근 | `/ko/memos` → `/ko/login`, latency n=0 | 인증된 목록 표시를 관측하지 못함 |
| 기존 계측 회귀 | client/faro/faro.sampling/serverTracing 27 tests 통과 | 단위 계약 확인. 운영 수신·브라우저 성능을 증명하지 않음 |

현재 운영 p75/p95·오류율·개선율은 산출하지 않았습니다. 아래 수치는 로컬 합성 데이터의 결과입니다.

### 로컬 기준선 — 2026-10-28

| 조건 | 값 |
| --- | --- |
| 실행 기기 | 개인 맥(구), arm64, Chromium 145.0.7632.6, Desktop Chrome viewport |
| 소스 | 앱은 master `f88b77da2`의 production build, probe `25cc2eacd` |
| 시나리오 | `all_hard_20`, grid, 합성 20건, normal, 1 worker, 30회 |
| 캐시 | 새 context, Query empty, HTTP disabled_by_routing, router prefetch observed, 서버/CDN unknown |
| 결과 | success 30 / empty·error·cancelled·timeout 각 0, blocked 0 |
| `observed_content_ready` | 최소 1087ms · 최대 1228ms · 탐색적 p75 **1139ms** · 참고 p95 **1208ms** |

위 실행은 `MEMO_PERF_SCENARIOS=all_hard_20 MEMO_PERF_REPETITIONS=30` 명령이며 로그인 setup을 포함해 31/31 PASS였습니다. p95는 n=30의 참고치이며 운영 목표로 쓰지 않습니다. 이 결과만으로 DB 병목·실사용 체감·성능 개선율을 확정하지 않습니다. 운영 표본 부재와 실제 DB 비용 미측정 때문에 서비스 최적화 목표는 정하지 않았습니다.

로컬 원본은 git 제외 경로 `e2e/.memo-performance/baseline.json`에 보존했습니다. 조건별 표본을 합치지 않았으며 이 실행은 한 cell, success 지연 n=30입니다. 실제 최적화 후보를 만들면 같은 조건으로 기준선과 교차 실행해 비교합니다. 이번에는 제품 최적화를 적용하지 않아 전후 개선 수치는 없습니다.

### 데이터량 확장 측정 — 2026-10-28

동일 production build를 전용 포트 3116에서 실행했습니다. 다른 작업의 3000번 서버는 재사용하지 않았습니다. 초기 화면은 grid, 전체 누적은 list이므로 두 지표를 직접 비교하지 않습니다. 첫 화면의 20건 기준선은 별도 실행이며 크기별 실행은 교차 배치하지 않았습니다.

| 합성 데이터 총량 | 실제 표시 대상 | 표본 | 결과 |
| --- | --- | --- | --- |
| 20개 | 첫 20개 | success 30 | p75 1176ms · 참고 p95 1239ms |
| 200개 | 첫 20개 | success 30 | p75 1175ms · 참고 p95 1238ms |
| 2000개 | 첫 20개 | success 30 | p75 1141ms · 참고 p95 1183ms |
| 200개 | list 전체 200개 | success 3 | 3811 / 3702 / 3762ms, 백분위 미산출 |
| 2000개 | list 전체 2000개 시도 | timeout 1 | 180초 제한 실행에서 178312ms 후 timeout 기록, 전체 표시 완료 미확인 |

첫 화면은 크기별 error/cancelled/timeout 0, 확장 실행은 setup 포함 61/61 PASS입니다. 200개 누적은 각 9번의 추가 목록 요청과 68번의 보조 요청을 관측했습니다. 2000개 누적에서는 추가 목록 요청 76번·보조 요청 3011번을 관측했으며, 최종 DOM 개수는 보고서에 저장하지 않아 완료 개수를 역산하지 않습니다. 이 실패의 세부 사유는 안전 보고서에 `unexpected_result`로 분류됐으므로 실제 HTTP timeout이나 특정 렌더 병목으로 확정하지 않습니다.

기존 21개 추가 로딩은 성공(109ms)했고, 200개 누적 예비 실행도 성공(3868ms)했습니다. 반복 도중 다른 검증을 실행한 200개 표본 3개(3752/4216/3777ms)는 위 최종 표본과 합치지 않았습니다. 첫 로그인 준비 실패 1건도 속도 표본에서 제외했습니다. 통계 단위 7 tests·E2E 타입 검사·변경 파일 Biome·diff 검사 통과. 2000개 누적 시나리오 1건은 실패 상태로 남습니다.

로컬 원본은 `e2e/.memo-performance/`의 `manual-baseline-latest.json`, `manual-large-first-page.json`, `manual-large-cumulative-200.json`, `manual-large-cumulative-smoke.json`에 보존했습니다. 큰 데이터 실험은 `1c03ff4f1` 위에 누적 시나리오를 추가한 작업 트리에서 실행했습니다. 목의 필터·페이지 응답을 사용하므로 운영 DB에 2000개가 있을 때의 조회 성능은 미측정이며, 작은 표본 차이를 개선율로 해석하지 않습니다.

### 회귀·경계 검증

- 37개 브라우저 시나리오와 setup 1건, 38/38 PASS. 직접 이동·재접속·SPA 재방문·검색·카테고리·도메인·보기·추가 페이지와 오류/빈/취소/30초 timeout을 포함합니다.
- 하드 이동의 측정 시작을 응답 commit으로 보정한 뒤 21개 시나리오+setup 22/22 PASS. 필터·캐시·연속 검색 보강 후 5개 시나리오+setup 6/6 PASS.
- 캐시 재방문: 목록 표시 174ms, 배경 응답 1505ms, `content_before_response=true`. 응답 완료를 기다리지 않고 캐시 결과를 표시했음을 확인했습니다. 이 단일 표본으로 백분위를 계산하지 않습니다.
- 연속 검색: 늦은 이전 응답 이후에도 최신 결과 유지. 같은 조건의 한 cell에 cancelled 1/success 1, 분모 2, 각 비율 0.5. 주입된 QA 시나리오의 비율이며 운영 실패율이 아닙니다.
- 의도적 setup 실패 canary: 예상 exit 1, blocked 1, 성능 attempts 0. stdout/보고서에 canary가 없고 screenshot·trace·video·error-context가 생성되지 않았습니다. Playwright의 `.last-run.json`에는 상태와 opaque test hash만 남습니다.
- 통계/허용 필드 7 tests 및 기존 관측 계약 27 tests, 총 34 tests PASS. 전체 `pnpm type-check`, `pnpm check`, `pnpm lint`, `pnpm build:web` PASS. Biome의 기존 경고 10건은 남아 있습니다.

기능 검증 원본은 `matrix.json`, `timing-final.json`, `interactions-final.json`, `privacy-result.json`으로 같은 로컬 폴더에 보존했습니다. 원본 보고서는 커밋하지 않습니다. 변경은 진단 코드·검사 설정과 두 관측 문서에 한정했습니다.

## 개선 우선순위

| 순서 | 가설/조치 | 확정 조건 |
| --- | --- | --- |
| P0 | 동작별 분모·성공/실패·캐시/네트워크 조건을 갖춘 로컬 기준선 | 이번 진단 도구 범위 |
| P1 | 추가 페이지 exact count 반복 제거 검토 | 실제 DB 비교, 호출자 count 계약·커서·총 개수 회귀 확인 후 별도 확정 |
| P2 | 검색 요청 취소/debounce 검토 | 빠른 입력의 요청 수·순서·경합·지연 증거 후 별도 설계. 체감 동작 변경은 승인 대상 |
| P3 | 누적 DOM·Masonry·부가 조회 비용 검토 | 데이터량별 병목 분리 후 별도 설계. 근거 없는 virtualization 도입 금지 |

오류 UI·캐시 구조·DB 스키마/인덱스·새 API·확장/앱·`/memos/plan`·추천 동선은 범위 밖입니다. UI 변경이 필요하면 시안을 제시하고 승인받습니다.
