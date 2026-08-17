import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { TPersona } from "./markers.ts";

const CONFIG_PATH = resolve(homedir(), ".config/web-memo-bots/config.json");
const JWT_LIFETIME_SECONDS = 540;
const GITHUB_API_BASE = "https://api.github.com";

/** 봇 하나의 GitHub App 자격 정보 */
export interface IFBotConfig {
	/** 코멘트 서명에 쓰는 한글 이름 (예: 이도현) */
	displayName: string;
	/** 코멘트 서명에 쓰는 직급 (예: 인턴 개발자) */
	role: string;
	appId: string;
	installationId: string;
	/** private key 경로. `~` 확장을 지원한다 */
	privateKeyPath: string;
}

/** `~/.config/web-memo-bots/config.json` 전체 스키마 */
export interface IFReviewerConfig {
	/** `owner/repo` 형식 */
	repo: string;
	/** PR 작성자 GitHub 로그인. 미답변 스레드 판별에 쓴다 */
	prAuthor: string;
	bots: Record<TPersona, IFBotConfig>;
}

const expandHome = (path: string): string => {
	return path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : path;
};

/**
 * 봇 설정 파일을 읽어온다.
 * @description 파일이 없거나 필수 키가 비면 설정 방법을 안내하며 즉시 예외를 던진다.
 */
export const loadReviewerConfig = (): IFReviewerConfig => {
	let raw: string;

	try {
		raw = readFileSync(CONFIG_PATH, "utf8");
	} catch {
		throw new Error(
			`봇 설정 파일을 찾을 수 없습니다: ${CONFIG_PATH}\n` +
				"docs/superpowers/plans/2026-08-17-ai-review-personas.md 의 Task 4를 먼저 수행하세요.",
		);
	}

	const config = JSON.parse(raw) as IFReviewerConfig;

	for (const persona of ["intern", "senior"] as const) {
		if (config.bots?.[persona]?.appId === undefined) {
			throw new Error(`${CONFIG_PATH} 에 bots.${persona}.appId 가 없습니다.`);
		}
	}

	return config;
};

/**
 * GitHub App 인증용 JWT를 만든다.
 * @description GitHub는 만료를 10분 이내로 요구하므로 9분으로 둔다.
 * 서버 시계가 앞설 때를 대비해 iat를 60초 앞당긴다.
 */
export const buildAppJwt = ({
	appId,
	privateKeyPem,
}: {
	appId: string;
	privateKeyPem: string;
}): string => {
	const encode = (value: object): string => {
		return Buffer.from(JSON.stringify(value)).toString("base64url");
	};

	const issuedAt = Math.floor(Date.now() / 1000) - 60;
	const header = encode({ alg: "RS256", typ: "JWT" });
	const payload = encode({ iat: issuedAt, exp: issuedAt + JWT_LIFETIME_SECONDS, iss: appId });
	const signer = createSign("RSA-SHA256");
	signer.update(`${header}.${payload}`);

	return `${header}.${payload}.${signer.sign(privateKeyPem, "base64url")}`;
};

/**
 * 해당 페르소나 봇의 installation access token을 발급받는다.
 * @description 토큰 수명은 1시간이며 캐싱하지 않고 호출 시마다 새로 발급한다.
 */
export const issueInstallationToken = async (persona: TPersona): Promise<string> => {
	const config = loadReviewerConfig();
	const bot = config.bots[persona];
	const privateKeyPem = readFileSync(expandHome(bot.privateKeyPath), "utf8");
	const jwt = buildAppJwt({ appId: bot.appId, privateKeyPem });

	const response = await fetch(
		`${GITHUB_API_BASE}/app/installations/${bot.installationId}/access_tokens`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${jwt}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);

	if (!response.ok) {
		throw new Error(
			`${persona} 봇 토큰 발급 실패 (${response.status}): ${await response.text()}`,
		);
	}

	const body = (await response.json()) as { token: string };

	return body.token;
};
