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

/** 봇 하나가 갖춰야 하는 필드 목록. `IFBotConfig`의 키와 일치시켜 둔다 */
const REQUIRED_BOT_FIELDS = [
	"displayName",
	"role",
	"appId",
	"installationId",
	"privateKeyPath",
] as const;

/** 값이 빈 문자열이거나 공백만으로 이루어졌으면 "없는 값"으로 취급한다 */
const isBlank = (value: unknown): boolean => {
	return typeof value !== "string" || value.trim().length === 0;
};

/**
 * 파싱된 설정 객체에서 이 모듈이 실제로 의존하는 모든 필드의 누락·공백을 모아 돌려준다.
 * @description 문제를 발견하는 즉시 던지지 않고 전부 모아서 반환한다.
 * 사용자가 손으로 설정 파일을 고칠 때 한 번에 여러 문제를 확인할 수 있게 하기 위해서다.
 */
const collectConfigProblems = (config: Record<string, unknown>): string[] => {
	const problems: string[] = [];
	const repo = config.repo;

	if (isBlank(repo)) {
		problems.push("repo 가 없습니다");
	} else if (!(repo as string).includes("/")) {
		problems.push(`repo 는 "owner/repo" 형식이어야 합니다 (현재 값: "${repo}")`);
	}

	if (isBlank(config.prAuthor)) {
		problems.push("prAuthor 가 없습니다");
	}

	const bots = config.bots as Record<string, Record<string, unknown>> | undefined | null;

	if (bots === undefined || bots === null) {
		problems.push("bots 가 없습니다");

		return problems;
	}

	for (const persona of ["intern", "senior"] as const) {
		const bot = bots[persona];

		if (bot === undefined || bot === null) {
			problems.push(`bots.${persona} 가 없습니다`);
			continue;
		}

		for (const field of REQUIRED_BOT_FIELDS) {
			if (isBlank(bot[field])) {
				problems.push(`bots.${persona}.${field} 가 없습니다`);
			}
		}
	}

	return problems;
};

/**
 * 설정 JSON 문자열을 파싱하고 유효성을 검사한다.
 * @description 파일 IO를 하지 않으므로 문자열만으로 테스트할 수 있다. JSON 파싱에
 * 실패하면 설정 경로를 담아 안내한다. 파싱에 성공하면 이 모듈이 실제로 쓰는 모든 필드
 * (최상위 `repo`/`prAuthor`, 각 페르소나의 `displayName`/`role`/`appId`/
 * `installationId`/`privateKeyPath`)의 누락·공백을 전부 모아 하나의 에러로 던진다.
 * @throws 문제가 하나라도 있으면 Error. 메시지에 configPath와 문제된 필드를 모두 나열한다.
 */
export const parseReviewerConfig = ({
	raw,
	configPath,
}: {
	raw: string;
	configPath: string;
}): IFReviewerConfig => {
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch (cause) {
		const reason = cause instanceof Error ? cause.message : String(cause);

		throw new Error(`${configPath} 이(가) 올바른 JSON이 아닙니다: ${reason}`);
	}

	const config = parsed as Record<string, unknown>;
	const problems = collectConfigProblems(config);

	if (problems.length > 0) {
		throw new Error(
			`${configPath} 설정이 올바르지 않습니다:\n${problems.map((problem) => `- ${problem}`).join("\n")}`,
		);
	}

	return config as unknown as IFReviewerConfig;
};

/**
 * 봇 설정 파일을 읽어와 파싱한다.
 * @description 파일이 없으면 경로를 안내하며 던진다. 파일을 읽는 데 성공하면
 * 실제 유효성 검사는 `parseReviewerConfig`에 위임한다.
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

	return parseReviewerConfig({ raw, configPath: CONFIG_PATH });
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
	const privateKeyPath = expandHome(bot.privateKeyPath);
	let privateKeyPem: string;

	try {
		privateKeyPem = readFileSync(privateKeyPath, "utf8");
	} catch {
		throw new Error(
			`${persona} 봇의 private key 파일을 읽을 수 없습니다: ${privateKeyPath}\n` +
				`bots.${persona}.privateKeyPath 설정을 확인하세요.`,
		);
	}

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
