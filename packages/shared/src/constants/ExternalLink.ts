import { CHROME_EXTENSION_ID } from "./ChromeExtension";

/**
 * 앱 밖으로 나가는 링크 모음.
 * @description
 * 키 이름만 보고 어떤 페이지로 가는지 알 수 있게 서비스명과 페이지 성격을 함께 적는다.
 * 웹 서비스 자체의 origin은 환경별로 달라지므로 여기가 아니라 `CONFIG.webUrl`을 쓴다.
 */
export const EXTERNAL_LINK = {
	chromeWebStoreListing: `https://chromewebstore.google.com/detail/web-memo/${CHROME_EXTENSION_ID}`,
	iosAppStoreListing: "https://apps.apple.com/app/id6759237784",
	notionGuideKo: "https://guesung.notion.site/8a740938aa6547b88d09dbab7cb2222b",
	notionGuideEn: "https://guesung.notion.site/10d89de02fde803c99c9e3027c2d10d5",
	youtubeChannel: "https://www.youtube.com/@web-memo",
	kakaoOpenChat: "https://open.kakao.com/o/sido56Pg",
	contactEmail: "mailto:gueit214@naver.com",
} as const;
