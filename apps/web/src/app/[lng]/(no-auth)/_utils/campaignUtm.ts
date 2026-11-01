const CAMPAIGN_UTM_STORAGE_KEY = "web-memo:campaign-utm";
const CHROME_WEB_STORE_HOSTNAME = "chromewebstore.google.com";
const CAMPAIGN_UTM_KEYS = [
	"utm_source",
	"utm_medium",
	"utm_campaign",
	"utm_content",
	"utm_term",
] as const;

type CampaignUtmKey = (typeof CAMPAIGN_UTM_KEYS)[number];
export type CampaignUtm = Partial<Record<CampaignUtmKey, string>>;

/**
 * 쿼리 문자열에서 utm_* 묶음을 읽습니다.
 * @description utm_source가 없으면 다른 값이 있어도 캠페인 유입으로 보지 않아 null을 돌려줍니다.
 */
export const readCampaignUtm = (search: string): CampaignUtm | null => {
	const params = new URLSearchParams(search);

	if (!params.get("utm_source")) {
		return null;
	}

	const utm: CampaignUtm = {};
	for (const key of CAMPAIGN_UTM_KEYS) {
		const value = params.get(key);
		if (value) {
			utm[key] = value;
		}
	}
	return utm;
};

/** 묶음 전체를 덮어씁니다(마지막 접촉). 스토리지 접근 실패는 무시합니다. */
export const saveCampaignUtm = (utm: CampaignUtm) => {
	try {
		window.sessionStorage.setItem(
			CAMPAIGN_UTM_STORAGE_KEY,
			JSON.stringify(utm),
		);
	} catch {
		// 스토리지가 막힌 환경에서도 설치 흐름은 유지한다.
	}
};

/** 이번 세션에 저장된 묶음을 읽습니다. 없거나 깨졌거나 접근에 실패하면 null입니다. */
export const loadCampaignUtm = (): CampaignUtm | null => {
	try {
		const stored = window.sessionStorage.getItem(CAMPAIGN_UTM_STORAGE_KEY);
		if (!stored) {
			return null;
		}
		const parsed: unknown = JSON.parse(stored);
		if (typeof parsed !== "object" || parsed === null) {
			return null;
		}
		return readCampaignUtm(
			new URLSearchParams(parsed as Record<string, string>).toString(),
		);
	} catch {
		return null;
	}
};

/** 현재 URL의 utm_*를 우선하고, 없으면 세션에 저장된 값을 돌려줍니다. */
export const resolveCampaignUtm = (search: string): CampaignUtm | null =>
	readCampaignUtm(search) ?? loadCampaignUtm();

/**
 * 크롬 웹스토어 링크에 utm_*를 붙인 URL을 돌려줍니다.
 * @description 웹스토어 링크가 아니거나 붙일 값이 없으면 null입니다. 같은 키가 이미 있으면 덮어씁니다.
 */
export const appendCampaignUtm = (
	href: string,
	utm: CampaignUtm | null,
): string | null => {
	if (!utm) {
		return null;
	}

	let url: URL;
	try {
		url = new URL(href);
	} catch {
		return null;
	}

	if (url.hostname !== CHROME_WEB_STORE_HOSTNAME) {
		return null;
	}

	for (const key of CAMPAIGN_UTM_KEYS) {
		url.searchParams.delete(key);
	}
	for (const [key, value] of Object.entries(utm)) {
		url.searchParams.set(key, value);
	}
	return url.toString();
};
