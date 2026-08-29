/**
 * Slack ↔ GitHub 연동에 필요한 서버 전용 설정.
 *
 * @description 이 값들은 의도적으로 `@web-memo/env`의 CONFIG에 넣지 않았습니다.
 * CONFIG는 `packages/env/.env.*`에서 오는데, 그 파일들은 공개돼도 되는 값만 담는다는
 * 전제로 **레포에 추적되고** 확장 프로그램 빌드도 함께 읽습니다. GitHub PAT나 Slack
 * 시크릿을 거기 두면 그대로 커밋되거나 확장 번들에 섞여 들어갑니다.
 * 여기서는 Vercel 환경변수를 서버에서만 직접 읽습니다.
 */

/** 값이 없으면 조용히 빈 문자열로 넘기지 않고 즉시 실패시킵니다. */
const requireServerEnv = (name: string): string => {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} 환경변수가 설정되지 않았습니다`);
	}

	return value;
};

/** Slack 요청 서명 검증 키. Slack App > Basic Information > Signing Secret. */
export const getSlackSigningSecret = (): string =>
	requireServerEnv("SLACK_SIGNING_SECRET");

/** 모달을 여는 데 필요한 봇 토큰(`xoxb-`). views.open 스코프가 필요합니다. */
export const getSlackBotToken = (): string =>
	requireServerEnv("SLACK_BOT_TOKEN");

/** release.yml / versions.yml을 실행할 수 있는 PAT (`actions: write`). */
export const getGithubDispatchToken = (): string =>
	requireServerEnv("GITHUB_DISPATCH_TOKEN");

/** 배포를 트리거할 대상 레포지토리. */
export const getGithubRepository = (): string =>
	process.env.GITHUB_DISPATCH_REPOSITORY ?? "guesung/Web-Memo";

/** 워크플로를 실행할 기본 브랜치. release.yml은 여기서 dispatch됩니다. */
export const GITHUB_DEFAULT_BRANCH = "master";
