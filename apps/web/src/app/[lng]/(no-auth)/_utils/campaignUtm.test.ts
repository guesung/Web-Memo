import { afterEach, describe, expect, it, vi } from "vitest";
import {
	appendCampaignUtm,
	loadCampaignUtm,
	readCampaignUtm,
	resolveCampaignUtm,
	saveCampaignUtm,
} from "./campaignUtm";

const STORE_URL = "https://chromewebstore.google.com/detail/web-memo/abc";

const stubSessionStorage = () => {
	const data = new Map<string, string>();
	vi.stubGlobal("window", {
		sessionStorage: {
			getItem: (key: string) => data.get(key) ?? null,
			setItem: (key: string, value: string) => data.set(key, value),
		},
	});
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("readCampaignUtm", () => {
	it("utm_source가 있으면 utm_* 묶음을 읽는다", () => {
		expect(
			readCampaignUtm("?utm_source=threads&utm_medium=social&foo=1"),
		).toEqual({ utm_source: "threads", utm_medium: "social" });
	});

	it("utm_source가 없으면 다른 utm_*만 있어도 null이다", () => {
		expect(readCampaignUtm("?utm_medium=social&utm_campaign=a")).toBeNull();
		expect(readCampaignUtm("")).toBeNull();
	});
});

describe("saveCampaignUtm / loadCampaignUtm", () => {
	it("저장한 묶음을 읽고, 다시 저장하면 이전 키가 남지 않는다", () => {
		stubSessionStorage();
		saveCampaignUtm({ utm_source: "threads", utm_content: "old" });
		saveCampaignUtm({ utm_source: "x" });

		expect(loadCampaignUtm()).toEqual({ utm_source: "x" });
	});

	it("스토리지 접근이 예외를 던져도 조용히 무시한다", () => {
		vi.stubGlobal("window", {
			get sessionStorage(): Storage {
				throw new Error("denied");
			},
		});

		expect(() => saveCampaignUtm({ utm_source: "x" })).not.toThrow();
		expect(loadCampaignUtm()).toBeNull();
	});

	it("저장값이 깨져 있으면 null이다", () => {
		vi.stubGlobal("window", {
			sessionStorage: { getItem: () => "{not json" },
		});

		expect(loadCampaignUtm()).toBeNull();
	});
});

describe("resolveCampaignUtm", () => {
	it("URL의 값을 저장값보다 우선한다", () => {
		stubSessionStorage();
		saveCampaignUtm({ utm_source: "stored" });

		expect(resolveCampaignUtm("?utm_source=url")).toEqual({
			utm_source: "url",
		});
	});

	it("URL에 없으면 저장값을, 둘 다 없으면 null이다", () => {
		stubSessionStorage();
		expect(resolveCampaignUtm("")).toBeNull();

		saveCampaignUtm({ utm_source: "stored" });
		expect(resolveCampaignUtm("?utm_medium=a")).toEqual({
			utm_source: "stored",
		});
	});
});

describe("appendCampaignUtm", () => {
	it("웹스토어 링크에 utm_*를 붙인다", () => {
		const href = appendCampaignUtm(STORE_URL, {
			utm_source: "threads",
			utm_campaign: "launch",
		});

		expect(new URL(href ?? "").searchParams.get("utm_source")).toBe("threads");
		expect(new URL(href ?? "").searchParams.get("utm_campaign")).toBe("launch");
	});

	it("같은 키는 덮어쓰고, 두 번 붙여도 중복되지 않는다", () => {
		const utm = { utm_source: "x" };
		const once = appendCampaignUtm(`${STORE_URL}?utm_source=old&hl=ko`, utm);
		const twice = appendCampaignUtm(once ?? "", utm);

		expect(twice).toBe(once);
		const params = new URL(twice ?? "").searchParams;
		expect(params.getAll("utm_source")).toEqual(["x"]);
		expect(params.get("hl")).toBe("ko");
	});

	it("웹스토어가 아닌 링크나 붙일 값이 없으면 null이다", () => {
		const utm = { utm_source: "x" };

		expect(
			appendCampaignUtm("https://play.google.com/store/apps/details", utm),
		).toBeNull();
		expect(appendCampaignUtm("not a url", utm)).toBeNull();
		expect(appendCampaignUtm(STORE_URL, null)).toBeNull();
	});
});
