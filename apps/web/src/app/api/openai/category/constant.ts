/** Jev 버전을 고정해 실측으로 정한 임계값의 의미를 유지합니다. */
export const JEV_MODEL = "jev-1.13.0" as const;

/** 기존 카테고리를 자동 적용할 최소 Jev confidence입니다. */
export const JEV_CONFIDENCE_THRESHOLD = 0.85;

/** Jev가 지연되면 기존 LLM 경로로 빠르게 전환합니다. */
export const JEV_TIMEOUT = 3000;

/** NONE 선택지를 포함한 Jev Choice의 최대 선택지 수입니다. */
export const JEV_MAX_CHOICES = 255;

/** 기존 카테고리 판정의 LLM 폴백 모델입니다. */
export const OPENAI_MODEL = "gpt-4o-mini" as const;

/** 기존 카테고리 판정의 LLM 설정입니다. */
export const OPENAI_SETTINGS = {
	temperature: 0.3,
	responseFormat: { type: "json_object" } as const,
} as const;

/** LLM 응답 형식을 JSON으로 제한합니다. */
export const SYSTEM_MESSAGE =
	"You are a helpful assistant that categorizes web pages and memos. Always respond with valid JSON only, no markdown formatting.";

/** LLM 프롬프트에 포함할 웹 본문의 최대 길이입니다. */
export const PAGE_CONTENT_MAX_LENGTH = 2000;
