import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildAppJwt, loadReviewerConfig } from "./appToken.ts";

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
