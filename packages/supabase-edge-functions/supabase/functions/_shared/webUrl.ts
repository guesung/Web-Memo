// 웹 앱 주소와 리다이렉트 허용 판정. Deno·Node 양쪽에서 실행된다.

const DEFAULT_WEB_URL = "https://www.webmemo.xyz";

/** WEB_URL 시크릿(끝 슬래시 제거). 없으면 운영 주소 */
export const readWebUrl = (): string =>
  (Deno.env.get("WEB_URL") || DEFAULT_WEB_URL).replace(/\/+$/, "");

const stripWww = (hostname: string) => hostname.replace(/^www\./i, "");

/**
 * 클릭 리다이렉트 목적지가 웹 앱 도메인인지 본다 (오픈 리다이렉트 방지)
 * @description http(s)만, host는 WEB_URL의 host와 같거나 www 유무만 다른 경우만 허용한다.
 * 포트·userinfo가 붙은 주소(`https://www.webmemo.xyz@evil.com`)는 URL 파싱으로 걸러진다.
 */
export const isWebUrlDestination = (destination: string, webUrl: string) => {
  try {
    const target = new URL(destination);
    const base = new URL(webUrl);

    return (
      (target.protocol === "https:" || target.protocol === "http:") &&
      target.protocol === base.protocol &&
      target.port === base.port &&
      !target.username &&
      !target.password &&
      stripWww(target.hostname) === stripWww(base.hostname)
    );
  } catch {
    return false;
  }
};
