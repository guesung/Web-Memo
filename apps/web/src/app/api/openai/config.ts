import { readServerEnv } from "@src/utils/serverEnv";

/**
 * OpenAI API 키(Vercel 프로젝트 환경변수)를 호출 시점에 읽습니다.
 *
 * @description 키가 없으면 `undefined`를 돌려줍니다. `requireServerEnv`를 쓰지 않는 이유:
 * 키가 없을 때 던지지 않고, 라우트가 500 "OpenAI API key not configured"로 응답하는
 * 기존 폴백을 유지하기 위해서입니다.
 */
export const getOpenAIApiKey = (): string | undefined =>
	readServerEnv("OPENAI_API_KEY");
