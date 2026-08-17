# 하이라이트(밑줄) 기능 설계

**Date**: 2026-08-15
**Type**: feature
**Status**: in-progress (설계 확정, 구현 전)

## Summary

glasp처럼 웹 콘텐츠의 문장에 밑줄을 긋고, 그 하이라이트를 웹 대시보드에서 모아 볼 수 있게 한다.

v1은 **모바일 앱(`apps/app`)의 인앱 WebView 브라우저**에서 하이라이팅을 지원하고, **웹(`apps/web`)에서는 목록으로 확인**하는 데까지를 범위로 한다. PC 크롬 확장에서 원문 위에 밑줄을 복원하는 것은 후속 단계로 미루되, **데이터 포맷은 처음부터 복원 가능하도록** 설계한다.

### v1 범위

포함:
- 모바일 WebView에서 텍스트 선택 → 하이라이트 저장
- 색상 5종 선택 (yellow / green / blue / pink / purple)
- 하이라이트별 코멘트(note)
- 같은 페이지 재방문 시 밑줄 복원
- 웹 대시보드에 하이라이트 목록 페이지

제외 (후속):
- 비로그인 로컬 저장 및 로그인 시 동기화 → **하이라이트는 로그인 필수**
- PC 크롬 확장에서의 하이라이팅 및 밑줄 복원
- 하이라이트 공유 / 내보내기

---

## 1. 데이터 모델

### 1-1. 테이블

기존 `memo` 스키마에 `highlight` 테이블을 추가한다. **메모와 FK로 묶지 않고 정규화된 URL을 공통 키로 삼는다.**

```sql
create table memo.highlight (
  id                    bigint generated always as identity primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  url                   text not null,
  title                 text,
  "favIconUrl"          text,
  exact_text            text not null,
  prefix_text           text,
  suffix_text           text,
  text_position_start   integer,
  color                 text not null default 'yellow',
  note                  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint highlight_color_check
    check (color in ('yellow', 'green', 'blue', 'pink', 'purple'))
);

create index highlight_user_url_idx     on memo.highlight (user_id, url);
create index highlight_user_created_idx on memo.highlight (user_id, created_at desc);

alter table memo.highlight enable row level security;

create policy "highlight_select_own" on memo.highlight
  for select using (auth.uid() = user_id);
create policy "highlight_insert_own" on memo.highlight
  for insert with check (auth.uid() = user_id);
create policy "highlight_update_own" on memo.highlight
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "highlight_delete_own" on memo.highlight
  for delete using (auth.uid() = user_id);
```

컬럼 네이밍은 snake_case로 통일하되 `favIconUrl`만 예외로 둔다. 기존 `memo` 테이블이 같은 이름을 쓰고 있어서, 두 테이블을 함께 다루는 코드에서 이름이 갈리면 혼선이 생긴다.

### 1-2. 설계 결정

**메모와 FK로 묶지 않는다.** 하이라이트는 메모 없이도 존재할 수 있어야 한다(어떤 페이지에서 문장만 긋고 메모는 안 쓰는 경우가 정상 흐름이다). 대신 저장·조회 양쪽에서 `normalizeUrl`(`packages/shared/src/utils/Url.ts`)을 거치므로, URL로 조인하면 "이 페이지의 메모 + 이 페이지의 하이라이트"를 함께 조회할 수 있다. 기존 `memo` 테이블도 `getMemoByUrl`을 통해 URL을 사실상 자연키처럼 쓰고 있어 새로운 패턴이 아니다.

**`title` / `favIconUrl`을 하이라이트 행에 중복 저장한다.** 목록 화면이 하이라이트를 무한스크롤로 뿌리는데, 매번 `memo` 테이블과 조인하거나 메모가 없는 URL의 제목을 별도로 가져오는 것보다, 하이라이트를 그은 시점의 페이지 정보를 그대로 박제하는 편이 단순하고 빠르다. `memo` 테이블이 같은 값을 들고 있는 것과 같은 이유다.

**앵커를 jsonb가 아니라 개별 컬럼으로 편다.** 웹 대시보드에서 "내가 그은 문장 중 이 단어가 든 것"을 검색해야 하는데, `exact_text`가 인덱싱 가능한 컬럼이어야 이게 쉽다. jsonb 안에 넣으면 검색이 즉시 번거로워진다.

### 1-3. 타입 생성

스키마 변경 후 `pnpm generate-supabase-type`으로 `packages/shared/src/types/supabase.ts`를 재생성한다. 파생 타입(`HighlightRow`, `HighlightInsert` 등)은 기존 `MemoRow` 옆(`packages/shared/src/types/supabaseCustom.ts`)에 추가한다.

---

## 2. 앵커링 — 하이라이트 위치를 무엇으로 기억하는가

### 2-1. 왜 텍스트 인용 앵커인가

W3C Web Annotation Data Model의 **TextQuoteSelector** 방식을 쓴다. 위치를 DOM 구조가 아니라 텍스트 자체로 기억한다.

- `exact` — 실제로 그은 문장
- `prefix` — 앞 32자 문맥
- `suffix` — 뒤 32자 문맥
- `textPositionStart` — 본문 전체 텍스트 기준 근사 문자 offset (모호성 해소용 힌트)

DOM 경로(XPath/CSS selector) 방식을 쓰지 않는 결정적 이유는 **모바일 WebView가 보는 페이지와 PC 크롬이 보는 페이지의 DOM이 다르기 때문**이다. 반응형 분기, 모바일 전용 레이아웃, 광고 위치 차이로 인해 DOM 경로는 기기 간에 이식되지 않는다. "모바일에서 그은 밑줄을 웹에서 확인한다"는 요구를 만족시킬 수 있는 앵커는 텍스트 기반뿐이다.

부수적으로, SPA 리렌더·사이트 개편·문단 이동에도 문장만 남아 있으면 살아남는다.

대가는 두 가지다. 같은 문장이 페이지에 여러 번 나오면 prefix/suffix와 위치 힌트로 후보를 골라야 하고, 원문이 실제로 수정되면 못 찾는다. 후자는 "원문에서 사라진 하이라이트"로 표시하고 텍스트는 그대로 보관한다(§6-3).

### 2-2. 구현 — 무엇을 가져다 쓸 것인가

기성 npm 패키지를 그대로 쓰기 어렵다. 조사 결과:

| 후보 | 상태 |
|---|---|
| `dom-anchor-text-quote` | diff-match-patch 기반이나 약 9년간 미유지보수 |
| `apache-annotator` | 저장소 아카이브(read-only) |
| `anchor-quote` | WORK IN PROGRESS 상태로 아카이브 |
| **hypothesis/client `match-quote.ts`** | **현재 프로덕션에서 가장 활발히 쓰이는 구현. BSD-2-Clause** |

따라서 **hypothesis의 매칭 전략을 따라 직접 구현**하고, 근사 문자열 매칭만 [`approx-string-match`](https://www.npmjs.com/package/approx-string-match)(MIT, 유지보수 중)를 npm에서 설치해 쓴다. 코드를 그대로 옮기는 대신 알고리즘을 따라 우리 코드로 쓰는 편이 라이선스 관리도 단순하고, 우리 타입 체계에 맞춰 테스트를 붙이기도 쉽다. 참고 출처는 구현 파일 주석에 남긴다.

전략은 다음과 같다:

1. `indexOf()`로 정확 매칭을 먼저 시도한다
2. 실패했을 때만 `approxSearch()`로 근사 매칭한다 (`maxErrors = min(256, quote.length / 2)`)
3. 후보들을 스코어링해 최적 매치를 고른다 — 인용문 유사도(가중치 50) + prefix 일치(20) + suffix 일치(20) + 위치 힌트(2)

정확 매칭을 먼저 거치는 순서가 성능상 중요하다. 근사 매칭은 대형 문서에서 눈에 띄게 느려서 hypothesis에도 관련 이슈가 있다. 대부분의 하이라이트는 원문이 그대로이므로 1단계에서 끝난다.

### 2-3. 타입 네이밍

기존 코드(`MemoSortBy`, `MemosPaginatedKeyParams`)가 타입에 접두사를 쓰지 않으므로 같은 관례를 따른다 — `HighlightAnchor`, `HighlightColor`, `HighlightItem`.

---

## 3. 하이라이팅 엔진 모듈

### 3-1. 위치

**`packages/shared/src/modules/highlight/`** 에 둔다. 앱 안이 아니라 공유 패키지인 이유는 같은 코드가 최소 세 곳에서 필요하기 때문이다 — 지금은 모바일 WebView에 주입되고, 후속 단계에서 크롬 확장 content script가 쓰고, 웹 뷰어가 쓸 수 있다. 앱 안에 두면 확장 작업 시 복사하게 된다.

```
packages/shared/src/modules/highlight/
├── createAnchor.ts       # Range → HighlightAnchor
├── resolveAnchor.ts      # (document, HighlightAnchor) → Range | null
├── matchQuote.ts         # hypothesis 포팅 (근사 매칭 코어)
├── renderHighlights.ts   # Range[] → 화면에 색 입히기 + 히트테스트
├── selectionTracker.ts   # 선택 감지 → 앵커 캐싱 → postMessage
├── types.ts              # HighlightAnchor, HighlightColor, 브릿지 메시지 타입
├── index.ts              # 모듈 배럴
└── injected/
    └── entry.ts          # WebView 주입용 IIFE 엔트리
```

`createAnchor` / `resolveAnchor` / `matchQuote`는 DOM만 있으면 도는 순수 함수다. 앵커링은 엣지 케이스가 많은 로직이라 **jsdom 위에서 Vitest 단위 테스트를 붙이는 것이 품질을 가른다**(§8).

### 3-2. 빌드 — 문자열로 주입하는 문제

`injectedJavaScript`는 문자열이어야 한다. 기존 `apps/app/app/(main)/browser/_utils/webViewScripts.ts`처럼 JS를 백틱 문자열에 통째로 넣으면, 이 정도 크기의 엔진은 타입 체크도 테스트도 받지 못한다.

그래서 진짜 TS 모듈로 작성하고, **esbuild로 `injected/entry.ts`를 IIFE 번들 하나로 만든 뒤 그 결과를 문자열로 export하는 빌드 스텝**을 `packages/shared`에 추가한다.

```
injected/entry.ts  --esbuild(iife, minify)-->  dist/injected/highlight.js
                   --생성-->  dist/injected/highlightScript.ts
                              (export const HIGHLIGHT_SCRIPT = "...")
```

`packages/env`가 이미 tsup 빌드 스텝을 갖고 있어 모노레포에 낯선 패턴은 아니다. 번들에는 `approx-string-match`가 함께 포함되며, **대상 환경은 앱의 최소 지원 환경인 iOS Safari 15 / Chrome 105로 잡는다**(`apps/app/ios/Podfile:19`의 deployment target이 15.1). 렌더링 API 지원 여부와 스크립트 자체의 파싱 가능 여부는 별개다 — Custom Highlight API를 못 써서 폴백을 타는 사용자에게도 스크립트는 돌아가야 한다.

### 3-3. 앵커 타입

```typescript
/** 하이라이트의 위치를 텍스트로 기억하는 앵커 (W3C TextQuoteSelector 기반) */
interface HighlightAnchor {
  /** 실제로 선택된 문장 */
  exact: string;
  /** 앞 문맥 32자 */
  prefix: string;
  /** 뒤 문맥 32자 */
  suffix: string;
  /** 문서 텍스트 기준 근사 시작 offset. 동일 문장이 여러 번 나올 때 후보 선택 힌트 */
  textPositionStart: number;
}
```

`textPositionStart`의 기준을 명확히 정의한다. **`document.body`를 `TreeWalker`로 순회하며 얻은 텍스트 노드들을 순서대로 이어붙인 문자열에서의 offset**이다. `innerText`는 CSS 레이아웃 결과에 따라 값이 달라져(줄바꿈 삽입, `display:none` 처리) 기기 간 이식되지 않으므로 쓰지 않는다. `createAnchor`와 `resolveAnchor`가 동일한 순회 규칙을 공유해야 하며, 이 규칙 자체를 `matchQuote.ts` 옆의 단일 함수로 두어 두 곳이 갈라지지 않게 한다.

어차피 근사 힌트이므로 기기 간에 값이 정확히 일치할 필요는 없다. prefix/suffix로도 후보가 갈릴 때 "더 가까운 쪽"을 고르는 데만 쓰인다.

---

## 4. 모바일 동작 흐름

### 4-1. 선택 UI — 네이티브 선택 메뉴를 쓴다

**당초 페이지 안에 커스텀 툴바를 주입하려 했으나, 네이티브 선택 메뉴(`menuItems`)를 쓰는 쪽으로 변경한다.**

iOS는 텍스트를 선택하면 시스템이 "복사 / 조회 / 공유" 콜아웃을 자동으로 띄운다. 여기에 우리 툴바를 겹쳐 그리면 두 개의 메뉴가 싸우게 되고, 시스템 콜아웃을 확실히 억제하는 방법도 문서상 보장되지 않는다.

`react-native-webview`의 `menuItems` / `onCustomMenuSelection`은 문서상 iOS와 Android를 모두 지원하며, 콜백 이벤트에 `selectedText`가 포함된다. 선택 메뉴에 "하이라이트" 항목 하나를 넣는 방식이 훨씬 네이티브스럽고 충돌이 없다.

**색상은 선택 시점이 아니라 저장 후에 고른다.** 메뉴에서 "하이라이트"를 누르면 기본색(노랑)으로 즉시 저장되고, 밑줄을 탭하면 열리는 바텀시트에서 색을 바꾸거나 코멘트를 단다. 빠른 캡처 → 나중에 정리라는 흐름이 실제 읽기 경험에 더 맞고, 시스템 메뉴에 색상 5개를 욱여넣지 않아도 된다.

### 4-2. 선택 시점에 앵커를 미리 계산해 캐싱한다

`onCustomMenuSelection` 콜백은 `selectedText`만 주고 prefix/suffix나 Range는 주지 않는다. 그렇다고 콜백을 받은 뒤에 `injectJavaScript`로 선택 영역을 읽으려 하면, 그 시점에 선택이 이미 해제되어 있을 수 있다.

그래서 **주입된 스크립트가 `selectionchange`를 구독해 선택이 바뀔 때마다 앵커를 미리 계산해 캐싱**해 둔다. 메뉴가 눌리면 앱은 `injectJavaScript`로 커밋 함수만 호출하고, 스크립트는 캐시된 앵커를 `postMessage`로 올려보낸다. 선택이 살아 있는지에 의존하지 않으므로 두 플랫폼 모두에서 안정적이다.

### 4-3. 저장 흐름

```
사용자가 텍스트 선택
  → [주입 스크립트] selectionchange 감지 → 앵커 계산 → window.__webmemoPendingAnchor 에 캐싱
사용자가 선택 메뉴 "하이라이트" 탭
  → [RN] onCustomMenuSelection
  → [RN] injectJavaScript("window.__webmemoCommitHighlight()")
  → [주입 스크립트] postMessage({ type: "highlight:create", anchor, ... })
  → [RN] handleWebViewMessage 의 새 분기
  → useHighlightCreateMutation → Supabase insert
  → 성공 시 injectJavaScript 로 해당 하이라이트를 즉시 렌더
```

`handleWebViewMessage`(`apps/app/app/(main)/browser/_hooks/useBrowserState.ts`)에는 이미 `favicon` / `scroll` 두 타입이 흐르고 있다. 세 번째 분기가 붙는 것이라 구조 변경이 없다.

저장에 필요한 `url` / `title` / `favIconUrl`은 주입 스크립트가 페이지에서 직접 읽어 payload에 담는다(`location.href`, `document.title`, `link[rel~="icon"]`). RN 쪽 `currentUrl` / `pageFavIconUrl` 상태를 쓰지 않는 이유는, 그 값들이 `onNavigationStateChange` 타이밍에 따라 실제 보고 있는 페이지보다 뒤처질 수 있기 때문이다. 페이지 안에서 읽으면 하이라이트를 그은 그 순간의 페이지가 확실히 기록된다. URL 정규화(`normalizeUrl`)는 RN 쪽에서 저장 직전에 적용한다.

### 4-4. 복원 흐름

현재 코드는 네비게이션이 끝나면 `INJECTED_JS_ON_NAVIGATION`(파비콘 + 스크롤)을 재주입한다. 같은 자리에서 해당 URL의 하이라이트를 조회해 함께 내려보낸다.

```
페이지 로드 완료 (handleLoadEnd / onNavigationStateChange)
  → [RN] useHighlightsByUrlQuery(normalizeUrl(currentUrl))
  → [RN] injectJavaScript("window.__webmemoRestore(<JSON>)")
  → [주입 스크립트] 각 앵커를 resolveAnchor 로 탐색 → 찾은 것만 렌더
  → postMessage({ type: "highlight:restored", resolved: n, unresolved: m })
```

못 찾은 하이라이트는 조용히 넘어가되 개수를 앱에 알린다(§6-3).

### 4-5. 밑줄 탭 → 편집

```
밑줄 탭
  → [주입 스크립트] click 좌표로 히트테스트 → postMessage({ type: "highlight:tap", id })
  → [RN] 바텀시트 오픈 (기존 MemoDetailModal 과 같은 패턴)
       색 변경 / 코멘트 편집 / 삭제
```

### 4-6. 브릿지 메시지 목록

| type | 방향 | payload |
|---|---|---|
| `highlight:create` | WebView → RN | `{ anchor, url, title, favIconUrl }` |
| `highlight:tap` | WebView → RN | `{ id }` |
| `highlight:restored` | WebView → RN | `{ resolved, unresolved }` |
| `window.__webmemoCommitHighlight()` | RN → WebView | (인자 없음, 캐시된 앵커 커밋) |
| `window.__webmemoRestore(list)` | RN → WebView | `HighlightItem[]` |
| `window.__webmemoAdd(item)` | RN → WebView | 저장 성공 직후 즉시 렌더 |
| `window.__webmemoRemove(id)` | RN → WebView | 삭제 후 지우기 |
| `window.__webmemoSetColor(id, color)` | RN → WebView | 색 변경 반영 |

---

## 5. 렌더링

### 5-1. CSS Custom Highlight API를 쓴다

`CSS.highlights` + `new Highlight(range)` + `::highlight()` 로 색을 입힌다. **DOM을 전혀 건드리지 않으므로** React 기반 사이트를 망가뜨리지 않고, 사이트가 리렌더해도 우리가 삽입한 노드가 날아가는 문제가 없다.

지원 범위는 iOS Safari 17.2+ / Chrome 105+ (Android WebView 포함)이고, 미지원 환경에서는 **`<span data-webmemo-hl>` 래핑으로 폴백**한다.

**폴백은 예비 경로가 아니라 실제 사용자 몫이 타는 경로다.** 앱의 iOS deployment target이 **15.1**(`apps/app/ios/Podfile:19`)이고 WKWebView는 시스템 WebKit을 쓰므로, **iOS 15.1~17.1 사용자는 예외 없이 폴백을 탄다.** (Android는 WebView가 Play 스토어로 갱신되고 Chrome 105면 충분하므로 사실상 전부 Custom Highlight 경로다.)

따라서 폴백 경로의 결함을 "구형 환경이니 감수한다"로 넘기지 않는다. 지켜야 할 경계는 이렇다 — **밑줄이 사라지는 것은 감수하되(React 사이트 리렌더로 `<span>`이 날아가는 경우), 틀린 위치에 그어지거나 글자가 깨지는 것은 감수하지 않는다.** 리렌더 대응(MutationObserver 재삽입)은 후속 과제로 둔다.

### 5-2. 히트테스트

CSS Custom Highlight API에는 "이 좌표가 어떤 하이라이트인가"를 알려주는 표준 API가 없다. 다음 조합으로 직접 구현한다.

1. `document.caretPositionFromPoint(x, y)` — 표준 API, 우선 사용
2. `document.caretRangeFromPoint(x, y)` — 비표준·deprecated. 구형 폴백으로만
3. 얻은 캐럿 위치를, 스크립트가 메모리에 들고 있는 하이라이트 Range 목록과 대조해 포함 여부를 판정

폴백(`<span>` 래핑) 경로에서는 그냥 DOM 이벤트로 처리하면 되므로 이 로직이 필요 없다.

### 5-3. 색상 정의

색상은 `packages/shared/src/constants/Highlight.ts`에 단일 정의를 두고, 주입 스크립트의 `::highlight()` CSS와 RN 바텀시트의 색상 칩, 웹 대시보드의 색 막대가 모두 같은 값을 참조한다. 다크 모드를 고려해 배경색은 알파를 넣은 값으로 잡는다.

값은 `background`와 `bar` 두 가지를 두되 쓰이는 곳이 다르다. **`background`는 WebView에서 실제로 글자에 칠하는 색**(Custom Highlight API의 `::highlight()` 배경, 폴백 `<span>` 배경)이고, **`bar`는 웹 대시보드 목록에서 문장 왼쪽에 세우는 색 막대**다.

웹 대시보드의 인용문에는 배경색을 깔지 않는다. 목록에서 색은 왼쪽 막대로 이미 전달되고, 인용문마다 배경까지 칠하면 밀집된 목록이 시각적으로 시끄러워진다. (구현 과정에서 실제로 만들어보고 내린 판단이다.)

---

## 6. 에러 처리 및 엣지 케이스

### 6-1. 선택 자체가 유효하지 않은 경우

주입 스크립트가 커밋 전에 거른다. 기존 확장의 텍스트 선택 핸들러(`pages/content-ui/src/ui/textSelection/`)와 같은 기준을 쓴다.

- 선택 길이 3자 미만
- `INPUT` / `TEXTAREA` / `contenteditable` 내부
- 선택이 collapsed 상태

`contenteditable` 배제는 필수다. 해당 요소에서는 `menuItems`가 동작하지 않고 AutoFill만 뜨는 알려진 이슈가 있다.

### 6-2. 저장 실패

`useHighlightCreateMutation`은 낙관적 렌더를 하지 않는다. 즉 **저장이 성공한 뒤에 밑줄을 그린다**. 밑줄이 보이는데 서버에 없는 상태가 사용자에게 가장 나쁘기 때문이다. 실패 시 토스트로 알린다.

### 6-3. 앵커를 못 찾은 경우 (원문 변경)

렌더를 건너뛰되 데이터는 지우지 않는다. `exact_text`가 남아 있으므로 사용자는 하이라이트 목록에서 자기가 뭘 그었는지 항상 볼 수 있다.

"원문에서 찾을 수 없음" 배지는 **웹 목록에 붙이지 않는다.** 앵커 해석은 그 페이지의 DOM이 있어야 가능한데 웹 대시보드는 원문을 불러오지 않으므로, 웹은 어떤 하이라이트가 아직 살아 있는지 알 방법이 없다. 해석 실패는 실제로 페이지를 연 WebView만 알 수 있으므로, `highlight:restored`의 `unresolved` 개수는 모바일에서만 쓴다. v1에서는 이 값을 별도로 표시하지 않고 향후 진단용으로 남겨둔다.

### 6-4. 중복 하이라이트

같은 앵커를 두 번 그으면 그냥 두 행이 생긴다. 완전 동일한 `(url, exact_text, text_position_start)` 조합은 저장 전에 스크립트가 걸러 UX상 중복을 막되, DB 제약으로 강제하지는 않는다(겹치는 하이라이트는 정상적인 사용 패턴이다).

### 6-5. 로그인하지 않은 상태

앱의 다른 기능은 비로그인 로컬 저장을 지원하지만 하이라이트는 로그인 필수다. 비로그인 상태에서는 선택 메뉴에 "하이라이트" 항목을 넣지 않는다(눌렀다가 실패하는 것보다 아예 안 보이는 편이 낫다).

### 6-6. 매우 긴 선택

`exact_text`가 지나치게 길면 근사 매칭 성능이 나빠진다. 5,000자 상한을 두고 초과 시 토스트로 알린다.

### 6-7. 해시 라우팅 사이트에서 하이라이트가 섞인다 (알려진 한계, 미해결)

`normalizeUrl`(`packages/shared/src/utils/Url.ts`)은 `origin + pathname + search`만 남기고 **해시를 버린다.**

일반적인 앵커 링크(`#section`)에서는 이게 옳다. `#intro`든 `#conclusion`이든 같은 문서이므로 하이라이트가 한 URL로 모여야 한다. 해시가 바뀌면 `highlight:page`가 다시 오고 `pageEpoch`가 올라가 복원이 재실행되지만, 조회 결과가 같으니 같은 밑줄이 다시 그려진다 — 낭비되는 재작업일 뿐 동작은 정상이다.

**문제는 해시를 라우팅 수단으로 쓰는 사이트다.** `example.com/#/article/1`과 `example.com/#/article/2`는 논리적으로 다른 페이지인데 정규화하면 둘 다 `example.com/`이 된다. 결과:

- article/1의 하이라이트가 article/2에서도 조회된다. 대부분은 `resolveAnchor`가 못 찾아 조용히 넘어가지만, **두 글에 같은 문장이 있으면 엉뚱한 곳에 밑줄이 그어진다.**
- article/2에서 새로 그은 하이라이트도 같은 URL로 저장되어, 웹 대시보드에서 **서로 다른 글의 하이라이트가 한 카드에 뒤섞인다.**

즉 밑줄이 사라지는 게 아니라 **섞이는** 문제다.

**이 한계는 하이라이트만의 것이 아니다.** `normalizeUrl`은 기존 메모 기능이 쓰던 함수를 그대로 재사용한 것이므로, 해시 라우팅 사이트에서는 **메모도 똑같이 한 URL로 뭉친다.** 새로 생긴 결함이 아니라 기존 동작을 물려받은 것이다.

**지금 고치지 않는다.** 고치는 방향은 두 가지인데 둘 다 대가가 있다:
- 해시를 URL에 **포함**시키면 해시 라우팅 사이트가 정확해지지만, 일반 앵커 링크에서 같은 글의 하이라이트가 위치마다 쪼개진다.
- 해시가 `#/`로 시작할 때만 포함시키는 **휴리스틱**은 두 경우를 구분하지만 완벽하지 않다(`#!/` 등 변종, 해시 없이 쿼리로 라우팅하는 경우).

어느 쪽이든 `normalizeUrl`을 바꾸면 **메모 기능의 URL 기준도 함께 바뀌어 기존 저장 데이터와 어긋난다.** 해시 라우팅을 쓰는 콘텐츠 사이트가 드물다는 점을 감안해 알려진 한계로 남기고, 실제로 문제가 보고되면 그때 마이그레이션까지 포함해 판단한다.

---

## 7. 웹 대시보드

### 7-1. 라우트

`apps/web/src/app/[lng]/(auth)/highlights/` 를 추가한다. 기존 `memos` 페이지의 구조를 그대로 따른다.

```
highlights/
├── page.tsx          # 서버에서 프리페치 후 HydrationBoundaryWrapper
├── _components/      # HighlightView, HighlightGroupCard, HighlightItem, HighlightEmptyState
├── _hooks/           # useHighlightList
├── _constants/
└── _utils/
```

`MemoSidebar`에 항목을 하나 추가한다. 인증 보호를 위해 `packages/shared/src/constants/Path.ts`의 `NEED_AUTH_PAGES`에 `/highlights`를 넣는다.

### 7-2. 화면

URL별로 묶인 카드 목록이다. 카드 상단에 페이지 제목·파비콘, 그 아래 그 페이지에서 그은 문장들이 색 막대와 함께 쌓인다. 문장을 누르면 코멘트를 보고 편집할 수 있고, 제목을 누르면 원문으로 나간다. 검색은 `exact_text`와 `note`를 대상으로 건다.

### 7-3. 서비스 계층

`packages/shared/src/utils/Supabase.ts`에 `HighlightService`를 추가한다(`MemoService` / `CategoryService`가 있는 곳).

- `getHighlightsByUrl(url)` — 모바일 복원용
- `getHighlightsPaginated({ cursor, limit, searchQuery, color })` — 목록용. `getMemosPaginated`가 쓰는 (정렬값, id) 복합 커서 방식을 그대로 따른다
- `insertHighlight` / `updateHighlight` / `deleteHighlight`

### 7-4. i18n

번역 키는 `highlight.*` 접두사로 묶고, `apps/web/src/modules/i18n/locales/{ko,en}/translation.json` 양쪽에 추가한다. 작업 후 `/i18n-check`로 검증한다.

---

## 8. 테스트 전략

**단위 테스트 (Vitest + jsdom)** — 이 기능에서 가장 중요한 방어선이다. 대상은 `createAnchor` / `resolveAnchor` / `matchQuote`.

- 정확 매칭이 되는 기본 케이스
- 같은 문장이 여러 번 등장할 때 prefix/suffix로 올바른 것을 고르는지
- prefix/suffix까지 같을 때 `textPositionStart`로 가장 가까운 것을 고르는지
- 원문이 조금 바뀐 경우 근사 매칭이 찾아내는지
- 원문에서 사라진 경우 `null`을 반환하는지
- 요소 경계를 가로지르는 선택(`<p>앞<strong>강조</strong>뒤</p>`)
- 공백/개행이 다르게 정규화된 경우

**E2E (Playwright)** — 웹 대시보드의 목록 조회·검색·코멘트 편집 흐름. 기존 `e2e/` 스위트에 추가한다.

**수동 검증(스파이크 포함)** — WebView 관련은 자동화가 어려우므로 실기기 검증 항목을 따로 둔다(§9).

---

## 9. 구현 전 검증이 필요한 항목 (스파이크)

조사 단계에서 문서만으로는 확정하지 못한 것들이다. **본 구현에 들어가기 전에 작은 스파이크로 먼저 확인한다.**

1. **`menuItems` / `onCustomMenuSelection`의 Android 실제 동작.** 공식 문서는 iOS/Android 모두 지원한다고 표기하지만, 원래 iOS 전용으로 구현됐다는 이슈 히스토리가 있어 문서와 히스토리 사이에 간극이 있다. 실기기에서 직접 확인해야 한다. Android에서 동작하지 않으면 Android만 인젝트 툴바로 분기한다.
2. **`menuItems` 지정 시 iOS 기본 메뉴 항목이 사라지는지.** 사용자가 "복사"를 못 쓰게 되면 회귀다. 사라진다면 `{label:'복사'}`를 우리가 직접 넣어 처리한다.
3. **CSS Custom Highlight API가 타겟 기기의 WKWebView / Android WebView에서 실제로 동작하는지.** 특히 최소 지원 OS 버전 기기에서.
4. **`packages/shared`의 esbuild IIFE 번들이 Metro 번들러와 충돌 없이 문자열로 import되는지.**

각 항목은 통과/실패에 따른 대안이 위에 적혀 있으므로, 실패해도 설계 전체가 흔들리지는 않는다.

---

## 10. 후속 단계 (v2 이후)

- **PC 크롬 확장에서의 밑줄 복원.** `packages/shared/src/modules/highlight/`를 content script에서 그대로 재사용한다. 텍스트 기반 앵커이므로 모바일에서 그은 하이라이트가 PC에서도 해석된다 — 이것이 §2의 앵커 선택 이유다.
- **크롬 확장에서의 하이라이팅.** 기존 `SelectionMemoButton`(`pages/content-ui/src/ui/textSelection/`) 옆에 하이라이트 버튼을 추가한다.
- **비로그인 로컬 저장 및 동기화.** 기존 `useLocalMemos` / `syncService` 패턴을 따른다.
- **하이라이트 내보내기 / 공유.**

---

## Notes

- 이 설계 문서는 `feat/daily-article-reminder` 브랜치에 커밋했다. 하이라이트 구현은 별개 작업이므로 `develop`에서 새 브랜치(`feat/highlight`)를 따서 진행한다.
- 스키마 마이그레이션은 `packages/supabase-edge-functions/supabase/migrations/`에 날짜 접두사 파일로 추가한다.
