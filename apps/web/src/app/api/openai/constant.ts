export const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
} as const;

export const HTTP_STATUS = {
	BAD_REQUEST: 400,
	FORBIDDEN: 403,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
	MISSING_MESSAGES: "메시지가 필요합니다.",
	INVALID_MESSAGE_FORMAT: "올바른 메시지 형식이 아닙니다.",
	API_KEY_NOT_SET: "OpenAI API 키가 설정되지 않았습니다.",
	QUOTA_EXCEEDED: "API 사용 한도를 초과했습니다.",
	CONTEXT_TOO_LONG: "입력 텍스트가 너무 깁니다.",
	STREAMING_ERROR: "요약 생성 중 오류가 발생했습니다.",
	GENERAL_SERVER_ERROR: "서버 오류가 발생했습니다.",
	UNAUTHORIZED: "권한이 없습니다.",
	RATE_LIMIT_EXCEEDED:
		"요청 한도를 초과했습니다. {time} 후에 다시 시도해주세요.",
} as const;
