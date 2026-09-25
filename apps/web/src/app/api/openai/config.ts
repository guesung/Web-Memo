/**
 * OpenAI API 키(Vercel 프로젝트 환경변수)를 호출 시점에 읽습니다.
 *
 * @description 빈 문자열도 미설정으로 취급해 `undefined`를 돌려줍니다.
 * `requireServerEnv`를 쓰지 않는 이유: 키가 없을 때 던지지 않고, 라우트가
 * 500 "OpenAI API key not configured"로 응답하는 기존 폴백을 유지하기 위해서입니다.
 * `.github/scripts/env/env-manifest.mjs`가 리터럴 참조만 수집하므로 이름을 동적으로 읽지 않습니다.
 */
export const getOpenAIApiKey = (): string | undefined =>
	process.env.OPENAI_API_KEY || undefined;
