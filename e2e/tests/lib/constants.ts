export const LANGUAGE = "en";
export const EXAMPLE_URL = "https://example.com";

/**
 * 확장 ID. manifest의 고정 public key에서 나오므로 빌드가 달라져도 바뀌지 않는다.
 * (apps/chrome-extension/manifest.js의 EXTENSION_KEY)
 */
export const EXTENSION_ID = "eaiojpmgklfngpjddhoalgcpkepgkclh";

/** 확장 페이지의 절대 URL을 만든다. 예: `getExtensionUrl("options/index.html")` */
export const getExtensionUrl = (path: string) =>
	`chrome-extension://${EXTENSION_ID}/${path}`;
