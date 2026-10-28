# 무관한 탭 이벤트의 사이드 패널 갱신 메시지 제거

## 결과와 범위

- baseline: `4a0710bbfbc3b3112ffd5d6ab24e1e7f71a313ca`
- 검증한 구현 커밋: `c915bad800975662d3b47f84070bb4e9f3471f3f`
- 구현 변경: `apps/chrome-extension/lib/background/index.ts`의 `tabs.onUpdated` 조건만 변경. 필터 테스트와 본 증거 자료를 추가했다.
- 화면·메모 저장·메시지 payload/API는 변경하지 않았다. 탭 조회를 새로 추가하지 않았다.
- **측정한 것은 갱신 메시지 호출 수다. 실제 탭 조회 횟수·지연시간·전력 절감은 측정하지 않았다.**

## 문제와 후보 선정

기존 background는 모든 탭 속성 변경에 `UPDATE_SIDE_PANEL`을 전송했다. 패널의 `SidePanelContent.tsx` 수신부는 이를 `refetchTab()`으로 연결한다. 활성 페이지와 무관한 백그라운드 탭의 소리·음소거 변경도 메시지를 발생시킨다.

다음 세 후보를 비교했다.

| 후보 | 근거 | 판단 |
| --- | --- | --- |
| 무관한 탭 변경의 갱신 메시지 | background `tabs.onUpdated`의 무조건 전송; 실제 콜백에서 이벤트100회→메시지100회 | 브라우징 중 반복 발생하고 background 한 곳에서 최소 변경으로 검증할 수 있어 채택 |
| 내보내기에서 버리는 쿼리2개 | `memoService.ts#getMemos`: 쿼리4개 중 첫2개 응답만 반환 | 전체 내보내기 누락이라는 별도 동작 문제와 얽혀 보류 |
| 일괄 삭제 목록 캐시의 반복 `includes` | `useDeleteMemosMutation.ts`: 각 메모마다 삭제 ID 배열 탐색 | 특정 대량 삭제에서의 이득이며 공유 캐시 영향 범위가 더 넓어 보류 |

열린 PR의 메모 카드 링크·자동 포커스·GA 및 원본 작업 디렉터리의 진행 중 PageHighlights 변경은 후보에서 제외했다. 최초 master에서 만든 별도 worktree에서 실행했고 기존 작업·stash는 건드리지 않았다.

## 사전에 고정한 성공 기준

1. 동일한 실제 등록 콜백과 fixture로 무관한 이벤트100개씩을7회 반복한다.
2. 비활성 탭 audible 및 활성 탭 비페이지 속성 이벤트의 메시지를90% 이상 줄인다.
3. 활성 URL·loading·complete·빈 title·빈 favIconUrl·title을 포함한 혼합 이벤트·다른 창 활성 URL 갱신은 각각1회를 유지한다. `onActivated` 갱신1회도 유지한다.
4. 같은 테스트를 baseline에도 적용하고 **타깃 메시지 수 단언**에서 실패하는지 확인한다.
5. 관련 테스트·check/lint·전체 typecheck·확장 build·로컬 browser smoke를 통과하고 독립 검증을 받는다. 최대3회 후에도 만족하지 못하면 PR 없이 종료한다.

## 원시 측정과 전후 비교

각 이벤트 묶음은 같은 입력을7회 반복했다. 네트워크·운영 데이터·시간 측정·캐시는 사용하지 않았다. 새 테스트는 구현을 복제하지 않고 `index.ts`를 import하여 **실제 `addListener`에 등록되는 콜백**을 실행한다. 경계의 SDK·bridge만 mock했다.

| 지표 | baseline / 반복 | candidate / 반복 | 변화 |
| --- | ---: | ---: | ---: |
| 비활성 탭 audible 100회 | 100회 | 0회 | 100% 감소 |
| 활성 탭 audible 100회 | 100회 | 0회 | 100% 감소 |
| 활성 탭 mutedInfo 100회 | 100회 | 0회 | 100% 감소 |
| 비활성 탭 URL 변경1회 | 1회 | 0회 | 불필요한 갱신 제외 |
| 필수 이벤트7종 | 각각1회 | 각각1회 | 유지 |
| 탭 활성화 | 1회 | 1회 | 유지 |

모든 반복에서 같은 값이었다. 원시 값은 [baseline-messages.json](baseline-messages.json), [candidate-messages.json](candidate-messages.json)에 있고 `positiveEach`는 각 필수 이벤트가1회씩 발생했음을 보여준다. 결정적 연산 수 측정이며 시간 단축의 통계적 유의성을 뜻하지 않는다.

### 네이티브 Chromium 이벤트 스모크

같은 실제 listener 구문을 TypeScript AST로 읽어 최소 테스트 확장에 넣고 **네이티브 `chrome.tabs`/`chrome.windows` 이벤트**로 실행했다. bridge 출력은 mock이며 실제 서비스 네트워크·인증·사용자 데이터·사이드 패널은 사용하지 않았다. 따라서 **전체 확장 E2E가 아니다.**

| 네이티브 동작 | baseline 메시지 | candidate 메시지 |
| --- | ---: | ---: |
| 비활성 탭 음소거 | 1 | 0 |
| 활성 탭 음소거 | 1 | 0 |
| 활성 탭 이동 | 2 | 2 |
| 탭 활성화 | 1 | 1 |
| 다른 창 활성 탭 | 4 | 4 |

페이지 이동은 status/title 등의 조합으로 여러 메시지가 발생할 수 있다. 이 PR은 유효한 이벤트 사이의 deduplication을 하지 않는다. 원시 결과: [baseline-browser.json](baseline-browser.json), [candidate-browser.json](candidate-browser.json).

## 시도 기록

구현 가설은 하나이며 검증 보강까지3회를 사용했다. 실패도 숨기지 않았다.

1. 활성 탭과 관심 속성(url/status/title/favIconUrl)으로 필터링. 효과·초기 회귀 검증 통과. 이후 테스트 fixture를 `satisfies chrome.tabs.Tab`으로 강화하면서 필수 속성 누락이 typecheck에서 드러나 성공 확정을 보류했다.
2. fixture 속성과 이벤트별 단언을 보강하던 테스트 편집에서 loop 블록 누락으로 transform 실패(테스트0개). 이 결과는 개선 증거로 채택하지 않았다.
3. 테스트 블록·필수 속성·비활성 fixture 정합성을 수정. 동일 테스트를 baseline/candidate에 적용해 재측정하고 전체 검증·독립 검증을 통과했다. production 필터는1번과 같다.

브라우저 harness의 초기 data URL 이동은 완료되지 않아 진단했고, 이동 fixture를 `about:blank`로 바꾼 **동일한 최종 harness**를 전후 양쪽에 적용했다. 실패한 환경 진단은 로컬 실행 기록에 보존하며 성공 자료와 혼합하지 않았다.

## 검증 결과

- baseline 타깃 테스트: exit1, 예상0에 실제100이라는 동작 단언에서 실패. 초기화/import 실패가 아니다. 필수 이벤트 단언은 먼저 통과한다.
- candidate 타깃 테스트: exit0.
- background + Tab + bridge: **13파일,161테스트 통과**.
- `pnpm check`, `pnpm lint`: exit0, 기존 경고10개.
- `pnpm type-check`: **15/15 task 성공**.
- `pnpm build:extension`: **8/8 task 성공**; 기존 bundle 크기 경고 있음.
- final source-linked Chromium smoke: exit0. baseline 동일 harness는 메시지1 대 예상0에서 실패한다.
- 독립 native verifier가 전후 테스트·각 필수 이벤트·161테스트·typecheck/check/lint를 재실행하고 PASS 판정했다.
- develop 머지 대상 아님: 앱/웹/공유 패키지 변경 없음. 운영 반영·자동 PR 머지는 하지 않았다.

명령/판정 요약: [verification.json](verification.json).

## 재현

Node24.14.0, pnpm10.23.0, 동일 lockfile; macOS arm64. Browser smoke는 Playwright1.58.2 / Chromium145.0.7632.6을 사용했다.

1. baseline SHA와 구현 커밋을 각각 별도 worktree에 checkout하고 각 경로에서 `pnpm install --frozen-lockfile`을 실행한다. 실제 측정에서는 기존 lockfile의 offline 설치를 사용했다.
2. 구현 커밋의 `apps/chrome-extension/lib/background/tabUpdates.test.ts`를 baseline의 같은 경로에 **그대로 복사**한다. baseline의 구현은 수정하지 않는다.
3. 각 worktree 루트에서 아래를 실행한다. output은 전후 다른 경로를 사용한다.

```bash
IMPROVE_EVIDENCE_FILE=/tmp/tab-messages.json \
  pnpm exec vitest run apps/chrome-extension/lib/background/tabUpdates.test.ts
```

baseline exit1 / candidate exit0과 원시 메시지 수를 확인한다. native browser 비교는 본 증거 폴더를 가진 checkout의 script 절대 경로를 사용하되, **cwd를 측정할 worktree 루트로 바꿔** 실행한다. 출력 파일은 새 경로여야 한다.

```bash
node <증거폴더>/browserSmoke.mjs /tmp/tab-browser.json
```

브라우저가 없으면 같은 Playwright 버전의 Chromium을 먼저 설치한다. 서비스·Supabase 로그인은 필요하지 않다. 회귀 명령:

```bash
pnpm exec vitest run apps/chrome-extension/lib/background \
  packages/shared/src/utils/extension/module/Tab.test.ts \
  packages/shared/src/modules/extension-bridge/createBridge.test.ts
pnpm check
pnpm lint
pnpm type-check
pnpm build:extension
```
