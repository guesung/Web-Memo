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

/** 네비게이션 완료 시 injectJavaScript로 주입할 전체 스크립트 */
export const INJECTED_JS_ON_NAVIGATION = `${FAVICON_EXTRACT_JS}\n${SCROLL_DETECT_JS}\n${HIGHLIGHT_SCRIPT}\ntrue;`;

/** WebView 최초 로드 시 주입할 스크립트 */
export const INJECTED_JS_ON_LOAD = `${SCROLL_DETECT_JS}\n${HIGHLIGHT_SCRIPT}\ntrue;`;
