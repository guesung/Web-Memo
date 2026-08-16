# PC 브라우저 하이라이트 복원 설계

**Date**: 2026-08-16
**Type**: feature
**Status**: in-progress (설계 확정, 구현 전)
**선행 작업**: [하이라이트 기능](2026-08-15-highlight-design.md) (PR #404)

## Summary

앱 내장 브라우저에서 그은 밑줄을 **PC 크롬에서 원문 위에 다시 보여준다.** 크롬 확장의 기존
content script에 복원 모듈을 하나 붙인다.

이번 범위는 **읽기 전용**이다. PC에서 새로 긋는 기능은 복원이 실제로 쓸 만한지 확인한 뒤
별도 사이클로 다룬다. 복원 품질(앵커가 PC 브라우저 DOM에서도 찾아지는지)이 이 기능의 성패인데,
읽기 전용만으로도 그 답이 나온다.

## 1. 왜 확장인가

밑줄을 원문 위에 그리려면 그 페이지의 DOM에 접근해야 한다. 웹 대시보드(`/highlights`)는
자기 페이지만 그릴 수 있으므로 남의 사이트를 칠할 수 없다. 남은 수단은 확장의 content script다.

**확장에 이미 필요한 것이 다 있다.**

- `host_permissions: ["<all_urls>"]`와 `content_scripts`가 모든 사이트에 등록되어 있다
  (`apps/chrome-extension/manifest.js:23,40-49`). 텍스트를 선택하면 "메모 만들기" 버튼이
  뜨는 기존 기능이 이미 그렇게 동작한다. **기존 사용자에게 권한 재승인 프롬프트가 뜨지 않고
  manifest도 고칠 필요가 없다.**
- Shadow DOM에 UI를 얹는 헬퍼(`pages/content-ui/src/utils/shadowTree.ts`의 `attachShadowTree`)가
  이미 있고 선택 버튼이 그걸 쓰고 있다.
- content script 엔트리가 하나뿐이라(`pages/content-ui/src/index.tsx`, vite iife) 새 vite entry나
  manifest 항목 없이 초기화 함수 호출 한 줄로 끝난다.

## 2. 엔진은 그대로 쓴다

`packages/shared/src/modules/highlight`는 앱 WebView용으로 만들었지만 **순수 DOM API만 쓴다.**
`resolveAnchor.ts`(W3C TextQuoteSelector → Range 복원), `renderHighlights.ts`,
`documentText.ts`, `matchQuote.ts` 모두 WebView 참조가 없다. export 경로
(`"./modules/highlight"`)도 이미 열려 있고 `pages/content-ui`가 `@web-memo/shared`를
의존성으로 갖고 있다.

**새로 써야 하는 건 `injected/entry.ts` 자리 하나다.** 이 파일만 WebView에 묶여 있다 —
`window.ReactNativeWebView.postMessage`로 이벤트를 보내고, RN이 `injectJavaScript`로 부를
전역 함수(`window.__webmemoRestore` 등)를 노출한다. 확장에서는 그 왕복이 필요 없으므로,
엔진 함수를 직접 부르고 서버 조회만 background로 보내는 얇은 wrapper를 새로 짠다.

## 3. 데이터 흐름

```
페이지 로드
  → content script: normalizeUrl(location.href)
  → bridge: GET_HIGHLIGHTS_BY_URL
  → background: HighlightService.getHighlightsByUrl
  → rows
  → resolveAnchor → renderer.add
```

**content script는 Supabase 세션에 접근할 수 없다.** MV3에서 content script는
`chrome.cookies`를 쓸 수 없고, 세션 획득은 background에서만 일어난다
(`packages/shared/src/utils/extension/Supabase.ts`의 `getSupabaseClient`가
`ChromeSyncStorage` → `chrome.cookies` 순으로 세션을 얻는다). 따라서 조회는 background를
거쳐야 하며, 이는 기존 `CREATE_MEMO` 핸들러(`apps/chrome-extension/lib/background/index.ts:95`)와
같은 관례다.

**비로그인이면 아무 일도 하지 않는다.** 하이라이트는 로그인 필수이고, background가 세션이
없으면 빈 결과를 돌려준다.

### 3-1. 하이라이트가 0개면 거기서 멈춘다

옵저버도 걸지 않고 마우스 리스너도 달지 않는다. 사용자가 방문하는 페이지 대부분이 여기
해당하므로, **남의 사이트에 남기는 비용이 조회 한 번으로 끝난다.** 이 조기 종료가
"모든 페이지에서 자동 복원"을 감당 가능하게 만드는 핵심이다.

### 3-2. 왜 URL 목록 캐시를 두지 않는가

하이라이트가 있는 URL 목록을 미리 받아두면 대부분의 페이지에서 조회조차 생략할 수 있다.
그러나 목록 동기화 로직이 붙고, 앱에서 새로 그은 하이라이트가 PC에 반영되기까지 시점 차이가
생긴다. **v1은 매 페이지 조회로 시작한다.** 느리다고 판단되면 그때 캐시를 얹는다.

## 4. 복원 시점 — MutationObserver

요즘 웹페이지는 본문을 나중에 그린다. 로드 직후에 앵커를 찾으면 아직 없는 텍스트라 실패한다.
앱 내장 브라우저는 사용자가 직접 연 페이지 하나만 다루지만, PC 확장은 온갖 사이트에서 돌므로
이 시점 문제가 복원 품질을 좌우한다.

한 번만 시도하면 React·Next 기반 사이트에서 많이 놓치고, 고정 간격 재시도는 늦게 뜨는
사이트를 여전히 놓친다. **DOM 변경을 관찰해 아직 못 찾은 앵커만 다시 시도한다.**

**종료 조건을 반드시 건다.**

- 모든 앵커를 찾으면 즉시 해제
- 못 찾아도 **10초 뒤 무조건 해제**

남의 페이지에서 무한히 도는 옵저버를 남기지 않기 위해서다. 재시도 대상은 **아직 못 찾은
앵커만**이다 — 이미 그린 것을 다시 그리면 중복 렌더가 된다.

## 5. 코멘트 툴팁

원문 위에서 다시 보는 이유는 "내가 여기서 뭘 생각했더라"이다. 밑줄만 있고 코멘트가 다른
화면에 있으면 그 이유가 반쯤 사라진다. **코멘트가 있는 하이라이트는 호버 시 툴팁으로 보여준다.**

### 왜 마우스 이벤트가 아니라 hitTest인가

주 렌더 경로인 CSS Custom Highlight API는 **DOM 요소를 만들지 않는다.** 그래서 밑줄에
`mouseover`를 걸 수 없다. 대신 렌더러가 이미 제공하는
`hitTest(x, y): number | null`(`renderHighlights.ts:31,158`)로 좌표에서 하이라이트 id를 찾는다.
이 함수는 `<span>` 폴백 경로도 함께 처리한다.

`mousemove`는 throttle한다. 남의 페이지에서 매 픽셀마다 도는 핸들러를 만들지 않는다.

툴팁은 `attachShadowTree`로 Shadow DOM에 넣는다. 사이트 CSS가 툴팁을 망가뜨리거나 툴팁이
사이트를 망가뜨리지 않게 하기 위함이다.

## 6. 왜 CSS Custom Highlight API가 중요한가

이 API는 DOM을 건드리지 않고 칠한다. `<span>`으로 감싸면 React·Next 기반 사이트가 다음
렌더에서 그 span을 날려버리거나, 반대로 우리가 사이트의 DOM 구조를 깨뜨릴 수 있다.
PC 확장은 통제할 수 없는 온갖 사이트에서 돌기 때문에 이 차이가 앱보다 훨씬 크다.

Chrome은 105부터 지원하므로 사실상 모든 사용자가 주 경로를 탄다. `<span>` 폴백은 엔진에
이미 있으니 그대로 둔다.

## 7. 알려진 한계

**SPA의 `pushState` 이동에는 다시 조회하지 않는다.** URL만 바뀌고 페이지가 새로 로드되지
않는 경우, 이전 페이지의 하이라이트가 남거나 새 페이지의 것이 안 그려진다. v1 범위 밖이다.

**해시 라우팅 사이트에서는 여러 글이 한 URL로 뭉친다.** `normalizeUrl`이 해시를 버리기
때문이다([하이라이트 설계 §6-7](2026-08-15-highlight-design.md)). 앱과 웹이 이미 같은 한계를
갖고 있어 여기만 따로 고칠 수 없다.

**원문이 바뀌면 복원되지 않는다.** 앵커를 못 찾으면 밑줄이 안 그어진다. 데이터는 남아 있으므로
`/highlights` 대시보드에서는 여전히 보인다.

## 8. 에러 처리

**복원 실패는 조용히 넘긴다.** 남의 페이지 위에 우리 에러를 띄우지 않는다. 조회가 실패하든
앵커를 못 찾든 사용자에게 알리지 않는다 — 사용자가 요청한 적 없는 배경 동작이고, 실패해도
그 페이지를 읽는 데 지장이 없다.

## 9. 테스트 전략

앵커 해석(`resolveAnchor`)과 렌더러는 이미 단위 테스트가 있다. 새로 짜는 것 중 테스트할
값어치가 있는 건 **못 찾은 앵커만 재시도하고 종료 조건에서 해제하는 옵저버 로직**이다.
jsdom으로 덮는다:

- 처음에 없던 텍스트가 나중에 DOM에 들어오면 그때 복원된다
- 전부 찾으면 옵저버가 해제된다
- 못 찾아도 타임아웃 뒤 해제된다
- 이미 그린 앵커를 다시 그리지 않는다

툴팁과 실제 복원 품질은 실제 사이트에서 눈으로 확인한다.

## Notes

- 브랜치는 `feat/highlight-restore-web`(`feat/highlight` 위에서 분기). 개수 기능(PR #405)과
  독립적이므로 PR도 따로 간다.
- 2단계(PC에서 새로 긋기)는 이 기능을 써본 뒤 별도 설계·계획 사이클로 다룬다.
  엔진의 `createAnchor.ts`·`selectionTracker.ts`가 이미 준비되어 있어 재사용 가능하다.
