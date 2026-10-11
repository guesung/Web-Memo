/**
 * 느슨한 URL 일치 후보를 서버에서 좁히는 ILIKE 패턴을 만든다.
 * @description toLooseUrlKey가 같아지려면 호스트(www./m. 제외)와 끝 슬래시를 뺀 경로가 원본 URL 안에 그대로 있어야 한다.
 * YouTube는 youtu.be 단축 주소까지 같은 글로 보므로 영상 ID만으로 좁힌다. 패턴은 후보를 줄일 뿐이고,
 * 최종 판정은 matchByLooseUrl이 한다. 파싱할 수 없는 URL이면 null이다.
 */
export const buildLooseUrlPattern = (pageUrl: string): string | null => {
	try {
		const urlObj = new URL(pageUrl);
		const hostname = urlObj.hostname.replace(/^(www|m)\./, "");

		if (hostname === "youtu.be") {
			return toContainsPattern(urlObj.pathname.slice(1));
		}

		if (hostname === "youtube.com" && urlObj.pathname === "/watch") {
			return toContainsPattern(urlObj.searchParams.get("v") ?? "");
		}

		const pathname = urlObj.pathname.replace(/\/+$/, "");

		return toContainsPattern(`${hostname}${pathname}`);
	} catch {
		return null;
	}
};

/** LIKE 패턴의 특수문자를 이스케이프한 뒤 포함 일치 패턴을 만든다. */
const toContainsPattern = (value: string) =>
	`%${value.replace(/[\\%_]/g, "\\$&")}%`;
