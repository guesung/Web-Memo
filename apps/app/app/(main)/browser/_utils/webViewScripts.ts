import { HIGHLIGHT_SCRIPT } from "@web-memo/shared/modules/highlight";

/**
 * WebView에 주입되는 JavaScript 스크립트들.
 * ReactNativeWebView.postMessage로 앱과 통신한다.
 */

/** 페이지 favicon URL 추출 후 postMessage로 전달 */
export const FAVICON_EXTRACT_JS = `
(function() {
  var el = document.querySelector('link[rel="icon"]')
    || document.querySelector('link[rel="shortcut icon"]')
    || document.querySelector('link[rel="apple-touch-icon-precomposed"]')
    || document.querySelector('link[rel="apple-touch-icon"]');
  var href = el && el.href ? el.href : (window.location.origin + '/favicon.ico');
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'favicon', url: href }));
})();
true;
`;

/** 스크롤 방향/위치 감지 후 postMessage로 전달 (헤더/탭바 숨김 + 읽기 위치 저장용) */
export const SCROLL_DETECT_JS = `
(function() {
  if (window.__webmemoScrollSetup) return;
  window.__webmemoScrollSetup = true;
  var BOTTOM_MARGIN = 120;
  var lastScrollY = window.scrollY;
  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        var maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        var currentY = Math.min(Math.max(0, window.scrollY), maxY);
        if (currentY <= 5) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'scroll', direction: 'top', scrollY: currentY, maxY: maxY
          }));
          lastScrollY = currentY;
        } else if (maxY - currentY <= BOTTOM_MARGIN) {
          // 최하단 여유 구간: iOS 바운스로 방향이 요동쳐 헤더/탭바가 버벅이므로 방향 전환 없이 위치만 전달
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'scroll', direction: 'bottom', scrollY: currentY, maxY: maxY
          }));
          lastScrollY = currentY;
        } else {
          var delta = currentY - lastScrollY;
          if (Math.abs(delta) > 5) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'scroll', direction: delta > 0 ? 'down' : 'up', scrollY: currentY, maxY: maxY
            }));
            lastScrollY = currentY;
          }
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})(); true;
`;

/** 현재 페이지 본문 텍스트를 추출해 postMessage로 전달 (AI 요약/질의응답용) */
export const EXTRACT_PAGE_TEXT_JS = `
(function() {
  var text = (document.body && document.body.innerText) ? document.body.innerText : '';
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'pageTextExtracted',
    title: document.title,
    text: text.slice(0, 12000)
  }));
})(); true;
`;

/**
 * 텍스트 선택 차단을 푸는 스크립트.
 *
 * @description 브런치처럼 선택을 막아둔 사이트에서는 드래그뿐 아니라 하이라이트도
 * 같이 죽는다. `HIGHLIGHT_SCRIPT`가 `selectionchange`에 의존하기 때문이다.
 * 차단 수단이 하나가 아니라 셋이라 셋을 모두 풀어야 한다 — CSS `user-select`,
 * 이벤트 핸들러의 `preventDefault`, 인라인 `on*` 속성. 특히 iOS WebView는
 * `-webkit-` 접두사 쪽이 실질 변수이고, `-webkit-touch-callout`을 되돌리지 않으면
 * 길게 눌러도 선택 핸들이 안 나온다.
 * 이벤트는 캡처 단계에서 가로채 `stopPropagation`한다. 사이트의 리스너가
 * `preventDefault`를 부르기 전에 끊어야 하므로 버블 단계로는 늦다.
 */
export const UNLOCK_SELECTION_JS = `
(function() {
  var STYLE_ID = 'webmemo-unlock-selection';
  if (document.getElementById(STYLE_ID)) return;

  var style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = '*, *::before, *::after {'
    + ' -webkit-user-select: text !important;'
    + ' user-select: text !important;'
    + ' -webkit-touch-callout: default !important;'
    + ' }';
  document.documentElement.appendChild(style);

  var BLOCKED_EVENTS = ['selectstart', 'dragstart', 'contextmenu', 'copy', 'cut'];
  for (var i = 0; i < BLOCKED_EVENTS.length; i += 1) {
    document.addEventListener(BLOCKED_EVENTS[i], function(event) {
      event.stopPropagation();
    }, true);
  }

  var INLINE_ATTRIBUTES = ['onselectstart', 'ondragstart', 'oncontextmenu', 'oncopy'];
  var nodes = document.querySelectorAll('[onselectstart], [ondragstart], [oncontextmenu], [oncopy]');
  for (var n = 0; n < nodes.length; n += 1) {
    for (var a = 0; a < INLINE_ATTRIBUTES.length; a += 1) {
      nodes[n].removeAttribute(INLINE_ATTRIBUTES[a]);
    }
  }
})(); true;
`;

/** 네비게이션 완료 시 injectJavaScript로 주입할 전체 스크립트 */
export const INJECTED_JS_ON_NAVIGATION = `${FAVICON_EXTRACT_JS}\n${SCROLL_DETECT_JS}\n${HIGHLIGHT_SCRIPT}\ntrue;`;

/** WebView 최초 로드 시 주입할 스크립트 */
export const INJECTED_JS_ON_LOAD = `${SCROLL_DETECT_JS}\n${HIGHLIGHT_SCRIPT}\ntrue;`;
