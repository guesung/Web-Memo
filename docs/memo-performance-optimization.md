# 메모 목록 보조 조회 최적화

## 승인 범위와 계획

2026-10-28 사용자가 측정 보정과 보조 데이터 반복 조회 제거를 승인했다. 기존 진단 전용 범위에 추가하는 후속 작업이다. 화면 구성·가상화·SSR·DB 쿼리/스키마·운영 계측은 이번에 바꾸지 않는다.

1. 회귀 테스트로 추가 페이지 이전의 하이라이트·출처 표시, 빈 결과, 실패 재시도, 변경 후 무효화를 고정한다. 누적 목록에서 기존 범위 재조회가 발생하는 테스트를 먼저 확인한다.
2. 누적 URL/ID 전체를 새 쿼리로 조회하는 대신 안정적인 배치 단위 TanStack Query 캐시를 재사용한다. 기존 조회·오류·갱신 계약을 유지한다. 계정별 결과가 섞이지 않게 한다. 새 의존성을 추가하지 않는다.
3. 로컬 probe에 스크롤/트리거·DOM 검증에 쓴 시간을 별도 기록한다. 전체 경과 시간에서 검증 시간을 뺀 값을 순수 렌더 시간이라고 부르지 않는다. 요청 종류와 실제 관측 DOM 개수를 허용된 수치로 기록해 누적 실패를 해석한다.
4. 같은 보정 probe로 기존 production build와 수정 build를 비교한다. 200/2000개 첫 화면과 전체 누적을 분리하고, 실패를 성공 표본에 섞지 않는다. 보정 전의 178초 결과와 직접 개선율을 내지 않는다.
5. 관련 단위/E2E·타입·Biome·빌드를 검증하고 develop 테스트 배포 및 master 대상 기존 PR을 갱신한다.

## 판정 기준

- 추가된 데이터 조회가 기존 전체 범위를 반복하지 않고, 기존 데이터가 계속 표시된다.
- 하이라이트/출처 수정·생성·삭제 후 기존 무효화가 작동한다. 빈 응답과 실패한 배치 재시도가 유지된다.
- 성능 결과에 전체 시간·검증/트리거 비용·최종 DOM 수·종류별 요청 수와 성공/실패를 별도로 남긴다.
- 운영 DB 속도나 실제 사용자 체감 개선으로 확대 해석하지 않는다.

## 실행 결과

### 구현과 검증

- `ec018ec66`: 원본 URL 대신 canonical page key와 메모 ID를 계정별 20개 안정 배치로 캐시한다. 표시 매핑에는 원본 URL을 유지하고, 배치 사이 같은 하이라이트 ID는 한 번만 반환한다. 오류가 있으면 실패 배치만 재시도하며, 정상 상태의 수동 refetch는 전체 활성 배치를 갱신한다. 기존 mutation의 `highlights`/`memos` prefix invalidation을 유지한다.
- `229a001ea`: 로컬 보고서/측정 정의를 v2로 분리한다. 전체 카드 위치 반복 검사를 마지막 카드 검사로 줄였다. DOM 개수·첫 카드 내용 검증은 유지하지만 모든 카드의 배치 안정·실제 페인트를 보장하지 않는다.
- 단위 테스트 41/41, 브라우저 회귀 11/11, probe 경계 6/6, 전체 타입 검사 15 tasks, 웹 production build, `pnpm check`·`pnpm lint`·diff 검사 통과. Biome의 기존 경고 10건은 남는다.
- 새 추가 페이지 회귀는 원본 production build에서 FAIL 1, 수정 build에서 PASS였다. 출처를 목 저장소에서 바꾼 뒤 Refresh로 새 인용문이 나타나는 것과 기존 상세·날짜별 배치·검색을 검증했다.
- 단위 테스트 선행 실행을 놓친 항목은 수정 후 원본 훅으로 임시 대체해 red를 확인하고 수정본을 복구했다. 사후 대조 검증이며 테스트 선행 작성으로 표현하지 않는다.
- 이벤트 분석: 사용자 행동·기존 GA/Faro/Sentry 의미 변경이 없어 신규 이벤트 없음.

### 측정 정의와 조건

기존 앱 build(`6fe55edda` 시점)와 후보 앱 build(`ec018ec66`)를 동일한 v2 probe·Chromium 145.0.7632.6·normal 네트워크·production `next start`·포트 3116·1 worker로 실행했다. 3000번의 다른 작업 서버는 사용하지 않았다. 브라우저 목 데이터이며 운영 DB 조회 비용은 측정하지 않았다. 로그인 준비 실패는 지연 표본에서 제외했고, 이후 실행은 이미 정상 생성된 인증 storageState를 재사용했다.

`duration_ms`는 첫 추가 목록 요청 시작부터 목표 DOM 개수 및 마지막 카드 배치 안정까지다. `validation_ms`는 DOM 개수 대기·배치 검사 구간의 **경과 시간**이며 앱이 준비되기를 기다리는 시간도 포함한다. `trigger_total_ms`는 스크롤·요청 발생 확인 구간의 경과 시간이다. 첫 트리거는 duration 시작보다 앞서므로 두 값을 합하거나 전체에서 빼서 순수 렌더/테스트 CPU 비용이라고 해석하지 않는다.

표시 완료 시각을 먼저 고정한 뒤 최대 1.5초 동안 보조 요청 종료를 관측한다. 요청 수는 이 관측 창 끝의 값이고, `auxiliary_settled`·pending 수를 함께 기록한다. 성공 시나리오의 bounded settle은 표시 지연에 포함하지 않는다. v1의 전체 DOM 검사·기존 178초와 직접 개선율을 내지 않는다.

### 200개 누적 — 동일 작업량 비교

처음 20개 준비 후 180개를 9페이지로 추가한 list 구간이다. 양쪽 최종 DOM 200개, 정상 완료이며 보조 요청 pending 0이었다. 아래 수치에는 초기 20개 조회를 포함하지 않는다.

| 조건 | 반복 3회 전체 시간 | 하이라이트 요청 | 출처 요청 | 보조 요청 합계 |
| --- | --- | --- | --- | --- |
| 기존 build | 4333 / 3985 / 4046ms | 매회 54 | 매회 14 | 매회 68 |
| 수정 build | 4517 / 4385 / 4403ms | 매회 9 | 매회 9 | 매회 18 |

별도 단일 실행은 기존 4069ms/수정 4443ms였다. 후보 실행 후 원본 build를 복원하고 다시 후보 build를 복원한 교차 확인에서도 기존 3861ms(68회), 수정 4427ms(18회)였다. n=3 및 교차 단일 표본을 합쳐 백분위를 내지 않는다.

**요청 중복 제거는 확인됐지만 표시 시간 단축은 확인되지 않았다. 관측 시간은 수정 후 더 컸다.** 실제 네트워크 지연이 없는 목 실험이며, 추가 observer/결과 집계·DOM 배치·스크롤 검사 비용의 기여를 분리할 프로파일은 없다. 이 결과로 실제 사용자 체감 개선이나 통계적으로 확정된 회귀율을 주장하지 않는다.

### 2000개 누적 — 실패 유지

양쪽 1회씩, 테스트 전체 제한은 180초다. 세부 실패 분류는 `unexpected_result`이며 실제 HTTP timeout으로 단정하지 않는다.

| 조건 | 결과 | duration | 마지막 관측 DOM 수 | 추가 목록 요청 | 하이라이트/출처 요청 | pending 보조 요청 |
| --- | --- | --- | --- | --- | --- | --- |
| 기존 build | timeout | 178713ms | 1460 | 72 | 2532 / 567 | 4 |
| 수정 build | timeout | 178431ms | 1300 | 65 | 64 / 64 | 0 |

완료한 작업량이 다르므로 이 행들의 요청 수로 감소율을 계산하지 않는다. 2000개 전체 표시 문제는 해결되지 않았으며, 후보가 더 많은 메모를 표시한 것도 아니다. 이 시나리오는 PASS로 바꾸거나 숨기지 않았다.

첫 화면 20개는 기존 1674ms/수정 1228ms 각 1회 성공했다. 계측 경계 검증용 표본이며 첫 화면 개선의 근거로 사용하지 않는다.

### 원본과 다음 확인

로컬 git 제외 경로 `e2e/.memo-performance/`에 `optimization-manifest.json`, `optimization-before-v2.json`, `optimization-after-v2.json`, `optimization-{before,after}-200-v2.json`, `optimization-cross-{before,after}-v2.json`, `auxiliary-{red,green}.json`, `optimization-probe-regression-v2.json`을 보존했다. 보고서의 revision은 probe 실행 체크아웃이며, 실제 앱 build revision/BUILD_ID는 manifest를 따른다. 원본 build는 비교를 위해 별도 `/tmp` 경로에 보존했다.

구현의 트레이드오프는 활성 배치별 observer와 동일 훅 생명주기에 본 URL/ID 배치 이력이 늘어난다는 것이다. 프로파일링으로 React commit·하이라이트 배열/Map 참조 변화·Masonry 배치·스크롤 검사 비용을 분리해야 다음 수정의 근거를 얻을 수 있다. DOM 가상화·컴포넌트 메모화·SSR·실제 DB 최적화는 이번에 적용하지 않았다. 운영 배포 완료나 속도 개선 달성으로 기록하지 않는다.

공식 참고: [useQueries](https://tanstack.com/query/v5/docs/framework/react/reference/useQueries), [기본 재조회 조건](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults), [prefix invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation). 최신 v5 문서이며 설치본은 react-query 5.90.21/query-core 5.90.20이다. 기존 observer 재사용은 설치본과 실제 브라우저 회귀로 확인했다.

## 후속 승인: React 재렌더·브라우저 배치 비용

사용자가 다음 작업 진행을 승인했다. 목표는 누적 카드의 재렌더와 브라우저 layout/style/script 작업을 수치로 분리하고, 확인된 불필요한 작업만 줄이는 것이다. 화면 구성·스타일·가상화·SSR·API/DB·운영 계측은 바꾸지 않는다.

정리 계획:

1. 기존 200/2000개 누적 재현을 유지하고 CDP의 숫자 집계만 수집한다. 개인정보가 담길 수 있는 raw trace·DOM·CPU profile은 저장하지 않는다. 측정 정의는 v3로 구분한다.
2. 3~5개 반증 가능한 가설을 정하고, 반복 렌더를 재현할 수 있는 실제 호출 지점의 회귀 테스트를 먼저 실패시킨다. 지원되지 않는 production React profiler 값을 만들지 않는다.
3. 확인된 참조 불안정·관찰자·배치 작업 중 작은 변경부터 적용한다. 보조 데이터 변경·카드 본문 변경·펼치기·설정·리사이즈·페이지 추가의 정확성을 유지한다.
4. 동일하게 계측한 production build를 비교한다. React 테스트의 렌더 수와 CDP layout/script 경과 시간을 서로 다른 지표로 보고하며 단순 차감해 원인 비율로 만들지 않는다.
5. 해당 회귀·타입·lint·build 및 실제 누적 재현을 확인하고, 결과·한계를 기존 문서와 PR에 기록한다. 성공 기준을 만족하지 않은 시나리오는 실패로 남긴다.

### 재현과 최소 수정

기존 `MemoGroup` → 실제 `React.memo(MemoItem)` 호출 지점에서 동일한 20개 메모와 표시값에 새 하이라이트 배열을 전달하면 카드 하위 Header 호출이 20회에서 40회로 늘어났다. `MemoGroup.render.test.ts`를 제품 수정 전에 실행해 RED를 확인했다. Masonry와 환경·하위 UI 의존성은 mock으로 바꿨으므로 이는 테스트 환경의 카드 렌더 경계 검증이며 실제 production React 커밋 수나 Masonry 실행 시간을 직접 측정한 것이 아니다.

`MemoItem`은 하이라이트 배열의 길이만 사용했다. `24035aeac`는 private prop을 `highlightCount?: number`로 좁히고 Group/Grid가 길이만 전달하도록 바꿨다. 배열 내용을 깊게 비교하거나 쿼리 구조·레이아웃 옵션을 추가로 바꾸지 않았다. 수정 후 같은 표시값 갱신은 누적 호출 20회 유지, 20→21개 추가는 21회이며, 개수·출처·본문 변경은 해당 카드, 설정 변경은 모든 카드에 반영된다. 기존 카드 테스트를 포함해 18개가 통과했다.

가설은 H1 배열 참조로 인한 기존 카드 렌더, H2 Masonry 배치, H3 카드별 clamp 높이 측정, H4 준비 게이트·프로브 대기였다. H1의 불필요한 렌더는 실제 호출 경계에서 재현했다. 다른 비용의 개별 기여는 이 변경만으로 확정하지 않는다. Masonry의 JavaScript 작업도 아래 ScriptDuration에 포함될 수 있다.

### v3 브라우저 수치의 의미

별도 profiling production build나 지원되지 않는 DevTools Fiber hook을 주입하지 않았다. 일반 production의 CDP 숫자 집계와 테스트 렌더 카운터를 구분한다. React `<Profiler>`는 기본 production에서 비활성화되므로 실제 커밋·렌더 시간을 측정했다고 주장하지 않는다([React Profiler](https://react.dev/reference/react/Profiler), [Next CLI profiling 옵션](https://nextjs.org/docs/app/api-reference/cli/next#next-build-options)).

CDP `Performance.getMetrics`의 Layout/RecalcStyle/Script/Task duration 누적값은 초 단위이며 구간 차이에 1000을 곱해 ms로 기록한다([Chromium 구현](https://chromium.googlesource.com/chromium/src/+/f2335d615c4876cce0babf9532f44f977a9b8712/third_party/blink/renderer/core/inspector/inspector_performance_agent.cc#205)). 이는 페이지 수준 비용이며 React/Masonry 단독 비용이 아니다. 서로 겹칠 수 있어 합산·차감으로 원인 비율을 내지 않는다. 종료 시점 Nodes/heap은 detached node·다른 UI·GC 시점 영향을 포함할 수 있는 gauge이며 메모 카드 수나 메모당 메모리로 해석하지 않는다.

계측 창은 조작 직전부터 DOM 검증과 최대 1.5초의 보조 요청 관찰 종료까지다. 누적 표시에서는 각 페이지 검증 후에도 숫자 snapshot을 보존한다. 따라서 내용 준비 시간보다 창이 길고 수집 자체의 비용도 포함된다. 동일하게 계측한 v3끼리 비교하며 v1/v2와 직접 개선율을 계산하지 않는다.

최초 v3 실험은 2000개가 테스트 예산 180초를 소진한 뒤 마지막 CDP 읽기도 실패해 시도 행을 잃었다. 고정 진단 enum `test_budget_exceeded`로 확인했으며 준비 단계의 지표 누락으로 단정하지 않았다. `e288a454b`에서 매 페이지 마지막 유효 snapshot을 보존하고, 읽기 실패/카운터 역행은 partial 또는 null로 표시한다. `cdp_sample_complete`와 sample elapsed/count를 함께 기록하며 부분값은 요약에서 제외한다. 성공/빈 결과의 CDP가 불완전하면 데이터 outcome은 유지하되 보고서와 exit 상태는 계측 실패로 표시한다. 테스트 예산을 늘리거나 실패를 성공으로 바꾸지 않았다.

### v3 비교 결과

기존 앱 build `ec018ec66`(체크아웃 `e9b24f985`와 동일한 제품 코드)과 수정 앱 build `24035aeac`를 비교한다. production `next start`, Chromium 145.0.7632.6, normal 네트워크, 포트 3116, 1 worker, 합성 데이터, 날짜별 list 보기다. 보고서 revision은 probe 체크아웃이며 실제 build ID는 `render-manifest-v3.json`에 별도 기록한다.

| 200개 누적: 처음 20개 이후 180개 추가 | 기존 3회 | 수정 3회 |
| --- | --- | --- |
| 전체 표시 시간 | 4483 / 4462 / 4435ms | 1870 / 1846 / 1870ms |
| ScriptDuration | 3202.084 / 3208.028 / 3198.913ms | 558.761 / 571.536 / 582.727ms |
| LayoutDuration | 46.248 / 45.362 / 45.013ms | 49.309 / 46.820 / 49.006ms |
| RecalcStyleDuration | 181.429 / 181.275 / 178.643ms | 200.373 / 196.960 / 201.452ms |
| 하이라이트/출처 요청 | 매회 9 / 9 | 매회 9 / 9 |

양쪽 최종 DOM 200개, success 3이며 CDP sample은 모두 complete였다. 작은 표본으로 백분위를 산출하지 않는다. 요청 수가 같은 상태에서 이 실험의 표시 시간과 JS 작업은 줄었고 레이아웃/스타일 시간이 줄었다고 보지는 않는다. 운영 DB·실사용자 지연으로 확대 해석하지 않는다.

수정 빌드 실행 후 원본 빌드를 복원하고 다시 수정 빌드를 복원한 교차 단일 확인도 기존 4419ms/Script 3174.763ms, 수정 1862ms/Script 561.174ms였다. 교차 표본을 위 n=3과 합쳐 백분위를 내지 않았다.

| 2000개 누적, 각 1회 | 기존 build | 수정 build |
| --- | --- | --- |
| 결과 | timeout | success |
| 전체 표시 시간 | 178470ms 후 미완료 | 147952ms에 완료 |
| 최종 관측 메모 수 | 1300 | 2000 |
| ScriptDuration | 136742.963ms | 15604.557ms |
| LayoutDuration | 642.335ms | 1602.624ms |
| RecalcStyleDuration | 3309.077ms | 8641.047ms |
| TaskDuration | 176334.345ms | 146020.183ms |
| 추가 목록/하이라이트/출처 요청 | 64 / 63 / 63 | 99 / 99 / 99 |

양쪽 테스트 제한은 180초로 유지했고, CDP sample은 모두 complete였다. 실패 행의 complete는 실패 시점까지의 CDP 창 수집이 끝났다는 뜻이며 2000개 표시 성공이 아니다. 목표 DOM 개수를 줄이거나 가상화로 숨기지 않았다. 수정 후 처음 20개를 제외한 1980개를 실제로 누적해 DOM 2000개와 마지막 카드 안정이 확인됐다. 이미지는 준비 기준에 포함하지 않는다.

기존은 미완료이고 수정은 더 많은 메모를 표시했으므로 이 두 행으로 지연·요청·엔진 비용의 감소율을 계산하지 않는다. 수정 후에도 전체 약 148초·TaskDuration 약 146초의 큰 누적 비용은 남는다. Script/Layout/Style/Task는 겹칠 수 있어 남은 시간을 단순 차감해 GC·Masonry 등으로 단정하지 않는다. n=1 스트레스 표본이며 2000개 완료의 반복 안정성이나 운영 SLO를 보장하지 않는다.

### 후속 검증과 산출물

- 관련 단위 9파일 66/66 PASS: 카드 렌더 경계·기존 카드·하이라이트/출처 훅·상세/하이라이트 화면·CDP/통계 계약.
- 실제 브라우저 회귀 11/11 PASS: 추가 페이지·출처 Refresh·상세·날짜별 배치·검색. 새로운 사용자 동선이 없어 해당 기존 E2E를 유지했다.
- v3 경계 8/8 PASS, 시도 9개: hard/reload/empty/load-more/cache/rapid/추가 페이지 오류/주입 timeout. hard/reload 카운터 연속성을 실제 브라우저에서 확인했고, 부분 CDP 0·계측 실패 0이었다. 의도한 error/cancelled/timeout은 성공 지연에 섞지 않았다.
- 웹 production build, 전체 타입 15 tasks, check/lint 및 diff 검사 PASS. 기존 Biome 경고 10건 유지. 독립 코드 검토의 counter-reset fallback/불완전 계측 성공 표시 두 지적은 보완 후 해소됐다.
- 사용자 행동과 기존 analytics 호출·속성을 바꾸지 않아 이벤트 추가/수정/제거는 모두 없다.

로컬 git 제외 경로 `e2e/.memo-performance/`의 `render-manifest-v3.json`, `render-before-200-repeat-v3.json`, `render-after-200-repeat-v3.json`, `render-before-2000-v3.json`, `render-after-2000-v3.json`, `render-cross-before-v3.json`, `render-cross-after-v3.json`, `render-boundaries-v3.json`, `render-functional-e2e.json`을 보존했다. 예비 단일 표본·계측 수집 실패 실행은 최종 반복 표본에 합치지 않았다. 앱 build ID와 probe revision을 구분하며 후보 build를 로컬 `.next`에 복원하고 비교 서버를 종료했다.

이번 변경으로 확인한 것은 이 합성 list 실험의 기존 카드 재렌더 방지, 200개 표시 시간·JS 비용 감소, 2000개 단일 완료다. 기본 grid의 2000개 전체 표시·실제 DB·운영 사용자 지연·상시 메모리·scroll FPS는 별도 미측정 항목이다.
