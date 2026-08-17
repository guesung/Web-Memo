import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildAppJwt, loadReviewerConfig, parseReviewerConfig } from "./appToken.ts";

const FAKE_CONFIG_PATH = "/fake/path/web-memo-bots/config.json";

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
	it("설정 파일이 없으면 예상 경로를 포함한 에러를 던진다", () => {
		expect(() => loadReviewerConfig()).toThrowError(/config\.json/);
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

	it("유효한 설정이면 파싱된 객체를 그대로 돌려준다", () => {
		const config = buildValidConfig();
		const raw = JSON.stringify(config);

		const result = parseReviewerConfig({ raw, configPath: FAKE_CONFIG_PATH });

		expect(result).toEqual(config);
	});
});
