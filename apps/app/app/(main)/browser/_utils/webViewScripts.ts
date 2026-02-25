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

/** 스크롤 방향/위치 감지 후 postMessage로 전달 (헤더/탭바 숨김용) */
export const SCROLL_DETECT_JS = `
(function() {
  if (window.__webmemoScrollSetup) return;
  window.__webmemoScrollSetup = true;
  var lastScrollY = window.scrollY;
  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        var currentY = window.scrollY;
        if (currentY <= 5) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'scroll', direction: 'top', scrollY: currentY
          }));
          lastScrollY = currentY;
        } else {
          var delta = currentY - lastScrollY;
          if (Math.abs(delta) > 5) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'scroll', direction: delta > 0 ? 'down' : 'up', scrollY: currentY
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

/** 네비게이션 완료 시 injectJavaScript로 주입할 전체 스크립트 */
export const INJECTED_JS_ON_NAVIGATION = `${FAVICON_EXTRACT_JS}\n${SCROLL_DETECT_JS}`;
