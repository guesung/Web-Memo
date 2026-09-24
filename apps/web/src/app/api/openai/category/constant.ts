/** 카테고리 추천에 사용하는 모델. */
export const OPENAI_MODEL = "gpt-6-luna" as const;

/** 카테고리 추천의 생성 옵션과 JSON 응답 형식. */
export const OPENAI_SETTINGS = {
	temperature: 0.3,
	responseFormat: { type: "json_object" } as const,
} as const;

/** 카테고리 추천 역할과 JSON 출력 제약. */
export const SYSTEM_MESSAGE =
	"You are a helpful assistant that categorizes web pages and memos. Always respond with valid JSON only, no markdown formatting.";

/** 카테고리 추천에 전달할 페이지 본문 최대 길이. */
export const PAGE_CONTENT_MAX_LENGTH = 2000;
