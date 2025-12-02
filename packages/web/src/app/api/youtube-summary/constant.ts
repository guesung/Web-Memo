export const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
} as const;

export const HTTP_STATUS = {
	OK: 200,
	BAD_REQUEST: 400,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
	MISSING_VIDEO_ID: "video_id 파라미터가 필요합니다.",
	INVALID_VIDEO_ID: "유효하지 않은 video_id입니다.",
	TRANSCRIPT_FETCH_FAILED: "자막을 가져오는데 실패했습니다.",
	SUMMARY_GENERATION_FAILED: "요약 생성에 실패했습니다.",
	DATABASE_ERROR: "데이터베이스 오류가 발생했습니다.",
	GENERAL_ERROR: "서버 오류가 발생했습니다.",
} as const;

export const YOUTUBE_SUMMARY_PROMPT = {
	ko: `당신은 YouTube 영상 요약 전문가입니다. 다음 자막을 바탕으로 영상의 핵심 내용을 요약해주세요.

## 요약 형식

### 핵심 요약
📌 영상의 핵심 메시지를 2-3문장으로 설명

### 주요 내용
💡 핵심 포인트들을 불릿 포인트로 정리 (3-5개)

### 결론
이 영상이 제공하는 가치와 핵심 takeaway를 1-2문장으로 정리

마크다운 문법을 사용하지 말아주세요.`,
	en: `You are a YouTube video summary expert. Please summarize the key content of the video based on the following transcript.

## Summary Format

### Core Summary
📌 Explain the core message of the video in 2-3 sentences

### Key Points
💡 Organize key points as bullet points (3-5 items)

### Conclusion
Summarize the value and key takeaways this video provides in 1-2 sentences

Please do not use markdown syntax.`,
} as const;
