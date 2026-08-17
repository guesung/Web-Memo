import { createVerify, generateKeyPairSync, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAppJwt, loadReviewerConfig, parseReviewerConfig } from "./appToken.ts";

const FAKE_CONFIG_PATH = "/fake/path/web-memo-bots/config.json";

/**
 * 존재하지 않는 것이 보장된 설정 파일 경로를 만든다.
 * @description 실제로 생성하지 않는다. 이 머신에 진짜 설정 파일이 있는지 없는지와
 * 무관하게 항상 "파일 없음" 경로를 테스트하기 위해 OS 임시 디렉터리 아래
 * 매번 다른 UUID 서브디렉터리를 조합해 경로 충돌 가능성을 없앤다.
 */
const buildNonexistentConfigPath = (): string => {
	return resolve(tmpdir(), `web-memo-bots-test-${randomUUID()}`, "config.json");
};

const VALID_BOT = {
	displayName: "이도현",
	role: "인턴 개발자",
	appId: "1234567",
	installationId: "7654321",
	privateKeyPath: "/fake/path/key.pem",
};

const buildValidConfig = (): Record<string, unknown> => {
	return {
		repo: "guesung/web-memo",
		prAuthor: "guesung",
		bots: {
			intern: { ...VALID_BOT },
			senior: { ...VALID_BOT, appId: "7654321", installationId: "1234567" },
		},
	};
};

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
	publicKeyEncoding: { type: "spki", format: "pem" },
	privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const decodeSegment = (segment: string): Record<string, unknown> => {
	return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
};

describe("buildAppJwt", () => {
	it("점으로 구분된 세 조각을 만든다", () => {
		const jwt = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey });

		expect(jwt.split(".")).toHaveLength(3);
	});

	it("RS256 헤더를 넣는다", () => {
		const [header] = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey }).split(".");

		expect(decodeSegment(header)).toEqual({ alg: "RS256", typ: "JWT" });
	});

	it("iss에 appId를 넣고 만료를 10분 이내로 둔다", () => {
		const [, payload] = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey }).split(".");
		const decoded = decodeSegment(payload) as { iss: string; iat: number; exp: number };

		expect(decoded.iss).toBe("1234567");
		expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(600);
		expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
	});

	it("개인키로 서명해 공개키로 검증된다", () => {
		const jwt = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey });
		const [header, payload, signature] = jwt.split(".");
		const verifier = createVerify("RSA-SHA256");
		verifier.update(`${header}.${payload}`);

		expect(verifier.verify(publicKey, signature, "base64url")).toBe(true);
	});

	it("본문이 변조되면 검증에 실패한다", () => {
		const jwt = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey });
		const [header, , signature] = jwt.split(".");
		const forged = Buffer.from(JSON.stringify({ iss: "9999999" })).toString("base64url");
		const verifier = createVerify("RSA-SHA256");
		verifier.update(`${header}.${forged}`);

		expect(verifier.verify(publicKey, signature, "base64url")).toBe(false);
	});

	it("세 조각 모두 base64url로 인코딩되어 +, /, = 문자를 포함하지 않는다", () => {
		const jwt = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey });

		expect(jwt).not.toMatch(/[+/=]/);
	});

	it("iat는 현재 시각보다 과거이고, exp - iat는 10분(600초)을 넘지 않는다", () => {
		const before = Math.floor(Date.now() / 1000);
		const [, payload] = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey }).split(".");
		const decoded = decodeSegment(payload) as { iat: number; exp: number };

		expect(decoded.iat).toBeLessThanOrEqual(before);
		expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(600);
	});

	it("appId가 다르면 서명도 달라진다", () => {
		const [, , signatureA] = buildAppJwt({ appId: "1111111", privateKeyPem: privateKey }).split(
			".",
		);
		const [, , signatureB] = buildAppJwt({ appId: "2222222", privateKeyPem: privateKey }).split(
			".",
		);

		expect(signatureA).not.toBe(signatureB);
	});
});

describe("loadReviewerConfig", () => {
	it("설정 파일이 없으면 그 경로와 설정 안내를 포함한 에러를 던진다", () => {
		const configPath = buildNonexistentConfigPath();

		try {
			loadReviewerConfig(configPath);
			expect.unreachable("설정 파일이 없는데도 던지지 않았다");
		} catch (error) {
			const message = (error as Error).message;

			expect(message).toContain(configPath);
			expect(message).toMatch(/README/);
		}
	});
});

describe("parseReviewerConfig", () => {
	it("최상위 repo가 없으면 repo와 설정 경로를 메시지에 담아 던진다", () => {
		const config = buildValidConfig();
		delete config.repo;
		const raw = JSON.stringify(config);

		try {
			parseReviewerConfig({ raw, configPath: FAKE_CONFIG_PATH });
			expect.unreachable("repo가 없는데도 던지지 않았다");
		} catch (error) {
			const message = (error as Error).message;

			expect(message).toMatch(/repo/);
			expect(message).toContain(FAKE_CONFIG_PATH);
		}
	});

	it("repo에 '/'가 없으면 거부한다", () => {
		const config = buildValidConfig();
		config.repo = "web-memo";
		const raw = JSON.stringify(config);

		expect(() => parseReviewerConfig({ raw, configPath: FAKE_CONFIG_PATH })).toThrowError(/repo/);
	});

	it("prAuthor가 없으면 메시지에 이름이 담긴다", () => {
		const config = buildValidConfig();
		delete config.prAuthor;
		const raw = JSON.stringify(config);

		expect(() => parseReviewerConfig({ raw, configPath: FAKE_CONFIG_PATH })).toThrowError(
			/prAuthor/,
		);
	});

	it("bots.senior가 통째로 없으면 메시지에 이름이 담긴다", () => {
		const config = buildValidConfig();
		const bots = config.bots as Record<string, unknown>;
		delete bots.senior;
		const raw = JSON.stringify(config);

		expect(() => parseReviewerConfig({ raw, configPath: FAKE_CONFIG_PATH })).toThrowError(
			/bots\.senior/,
		);
	});

	it("bots.intern.privateKeyPath가 없으면 메시지에 정확히 그 경로가 담긴다", () => {
		const config = buildValidConfig();
		const bots = config.bots as Record<string, Record<string, unknown>>;
		delete bots.intern.privateKeyPath;
		const raw = JSON.stringify(config);

		expect(() => parseReviewerConfig({ raw, configPath: FAKE_CONFIG_PATH })).toThrowError(
			/bots\.intern\.privateKeyPath/,
		);
	});

	it("appId가 빈 문자열이면 없는 것으로 취급한다", () => {
		const config = buildValidConfig();
		const bots = config.bots as Record<string, Record<string, unknown>>;
		bots.intern.appId = "";
		const raw = JSON.stringify(config);

		expect(() => parseReviewerConfig({ raw, configPath: FAKE_CONFIG_PATH })).toThrowError(
			/bots\.intern\.appId/,
		);
	});

	it("appId가 공백 문자열이면 없는 것으로 취급한다", () => {
		const config = buildValidConfig();
		const bots = config.bots as Record<string, Record<string, unknown>>;
		bots.intern.appId = "   ";
		const raw = JSON.stringify(config);

		expect(() => parseReviewerConfig({ raw, configPath: FAKE_CONFIG_PATH })).toThrowError(
			/bots\.intern\.appId/,
		);
	});

	it("여러 필드가 동시에 없으면 하나의 에러 메시지에 전부 담긴다", () => {
		const config = buildValidConfig();
		delete config.prAuthor;
		const bots = config.bots as Record<string, Record<string, unknown>>;
		delete bots.intern.appId;
		delete bots.senior.installationId;
		const raw = JSON.stringify(config);

		try {
			parseReviewerConfig({ raw, configPath: FAKE_CONFIG_PATH });
			expect.unreachable("설정이 잘못되었는데도 던지지 않았다");
		} catch (error) {
			const message = (error as Error).message;

			expect(message).toMatch(/prAuthor/);
			expect(message).toMatch(/bots\.intern\.appId/);
			expect(message).toMatch(/bots\.senior\.installationId/);
		}
	});

	it("JSON 형식이 잘못되면 설정 경로를 담고, 단순 SyntaxError가 아닌 안내 메시지를 던진다", () => {
		try {
			parseReviewerConfig({ raw: "{ not valid json", configPath: FAKE_CONFIG_PATH });
			expect.unreachable("잘못된 JSON인데도 던지지 않았다");
		} catch (error) {
			const err = error as Error;

			expect(err.message).toContain(FAKE_CONFIG_PATH);
			expect(err.message).toMatch(/JSON/);
			expect(err.name).not.toBe("SyntaxError");
		}
	});

	it("config.json이 literal null이면 경로 정보 없는 raw TypeError 대신 설정 경로를 담은 안내 에러를 던진다", () => {
		expect(() => parseReviewerConfig({ raw: "null", configPath: FAKE_CONFIG_PATH })).toThrowError(
			expect.not.objectContaining({ name: "TypeError" }),
		);
		expect(() => parseReviewerConfig({ raw: "null", configPath: FAKE_CONFIG_PATH })).toThrowError(
			new RegExp(FAKE_CONFIG_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		);
	});

	it("config.json이 배열이면 같은 방식으로 거부한다", () => {
		expect(() => parseReviewerConfig({ raw: "[]", configPath: FAKE_CONFIG_PATH })).toThrowError(
			new RegExp(FAKE_CONFIG_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		);
	});

	it("유효한 설정이면 파싱된 객체를 그대로 돌려준다", () => {
		const config = buildValidConfig();
		const raw = JSON.stringify(config);

		const result = parseReviewerConfig({ raw, configPath: FAKE_CONFIG_PATH });

		expect(result).toEqual(config);
	});
});

describe("issueInstallationToken 캐싱", () => {
	/**
	 * 페르소나별로 다른 App 설정을 가진 가짜 설정 객체를 만든다.
	 * @description installationId를 다르게 둬서, fetch가 어느 페르소나의
	 * access_tokens 엔드포인트를 호출했는지 URL로 구분할 수 있게 한다.
	 */
	const buildCacheTestConfig = (): Record<string, unknown> => {
		return {
			repo: "guesung/web-memo",
			prAuthor: "guesung",
			bots: {
				intern: { ...VALID_BOT, installationId: "111", privateKeyPath: "/fake/intern.pem" },
				senior: { ...VALID_BOT, installationId: "222", privateKeyPath: "/fake/senior.pem" },
			},
		};
	};

	/**
	 * node:fs와 fetch를 모킹한 뒤 appToken.ts를 새로 import해 캐시가 비어 있는
	 * 상태의 issueInstallationToken을 돌려준다.
	 * @description 모듈 최상위의 캐시 Map은 프로세스(=모듈 인스턴스) 생애주기 동안
	 * 유지되므로, 테스트마다 독립된 캐시를 보장하려면 vi.resetModules로 모듈
	 * 레지스트리를 비우고 다시 import해야 한다. 반환되는 토큰은 호출 순서대로
	 * tokenSequence를 소비하며, 소진되면 마지막 값을 반복한다.
	 */
	const loadFreshIssueInstallationToken = async ({
		tokenSequence,
	}: {
		tokenSequence: string[];
	}): Promise<{
		issueInstallationToken: (persona: "intern" | "senior") => Promise<string>;
		fetchMock: ReturnType<typeof vi.fn>;
	}> => {
		let callCount = 0;
		const fetchMock = vi.fn().mockImplementation(async () => {
			const token = tokenSequence[callCount] ?? tokenSequence[tokenSequence.length - 1];
			callCount += 1;

			return new Response(JSON.stringify({ token }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		});
		vi.stubGlobal("fetch", fetchMock);

		vi.doMock("node:fs", async (importOriginal) => {
			const actual = await importOriginal<typeof import("node:fs")>();

			return {
				...actual,
				readFileSync: vi.fn((path: string) => {
					if (String(path).includes("config.json")) {
						return JSON.stringify(buildCacheTestConfig());
					}

					return privateKey;
				}),
			};
		});

		vi.resetModules();
		const freshModule = await import("./appToken.ts");

		return { issueInstallationToken: freshModule.issueInstallationToken, fetchMock };
	};

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.doUnmock("node:fs");
		vi.resetModules();
	});

	it("같은 페르소나로 두 번 호출하면 토큰 발급 요청은 한 번만 일어난다", async () => {
		const { issueInstallationToken, fetchMock } = await loadFreshIssueInstallationToken({
			tokenSequence: ["token-a"],
		});

		const first = await issueInstallationToken("intern");
		const second = await issueInstallationToken("intern");

		expect(first).toBe("token-a");
		expect(second).toBe("token-a");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("페르소나가 다르면 각각 자신의 토큰을 따로 발급받는다", async () => {
		const { issueInstallationToken, fetchMock } = await loadFreshIssueInstallationToken({
			tokenSequence: ["token-intern", "token-senior"],
		});

		const internToken = await issueInstallationToken("intern");
		const seniorToken = await issueInstallationToken("senior");

		expect(internToken).toBe("token-intern");
		expect(seniorToken).toBe("token-senior");
		expect(internToken).not.toBe(seniorToken);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		const [internUrl] = fetchMock.mock.calls[0];
		const [seniorUrl] = fetchMock.mock.calls[1];
		expect(internUrl).toContain("/installations/111/access_tokens");
		expect(seniorUrl).toContain("/installations/222/access_tokens");
	});

	it("같은 페르소나로 연속 세 번 호출해도 최초 발급된 토큰이 그대로 재사용된다", async () => {
		const { issueInstallationToken, fetchMock } = await loadFreshIssueInstallationToken({
			tokenSequence: ["token-a"],
		});

		const first = await issueInstallationToken("intern");
		const second = await issueInstallationToken("intern");
		const third = await issueInstallationToken("intern");

		expect([first, second, third]).toEqual(["token-a", "token-a", "token-a"]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
