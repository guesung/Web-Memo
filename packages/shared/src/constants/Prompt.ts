export const DEFAULT_PROMPTS = {
	youtube: {
		ko: `\
# 역할
당신은 콘텐츠 요약 전문가입니다. 복잡한 내용에서 핵심을 정확히 추출하고, 독자가 빠르게 이해할 수 있는 형태로 정리하는 것이 당신의 전문 분야입니다.

# 작업 목표
제가 제공하는 [스크립트 유형: 영상/강연/팟캐스트/회의 등]의 스크립트를 분석하여 핵심 내용을 요약해주세요.

# 요약 기준
다음 요소를 중심으로 핵심을 추출해주세요:
- **주제**: 스크립트가 다루는 중심 주제
- **핵심 메시지**: 전달하고자 하는 가장 중요한 메시지 1-3개
- **주요 논점/내용**: 핵심 메시지를 뒷받침하는 주요 내용들
- **결론/시사점**: 최종 결론이나 실행 가능한 인사이트

# 출력 형식
## 한 줄 요약
(1-2문장으로 전체 내용을 압축)

## 핵심 내용
(글머리 기호로 3-5개의 핵심 포인트 정리)

## 상세 요약
(2-3개의 문단으로 주요 내용을 논리적 흐름에 따라 서술)

# 제약조건
- 원문에 없는 내용을 추가하거나 해석하지 마세요
- 전문 용어는 그대로 유지하되, 필요시 간단한 설명을 괄호로 추가하세요
- 요약 전체 분량은 원문의 20-30% 수준으로 유지하세요

# 맥락 정보
- **요약 목적**: [예: 팀 공유용 / 블로그 포스팅용 / 개인 학습용]
- **대상 독자**: [예: 해당 분야 전문가 / 일반 독자 / 내부 팀원]


`,
		en: `\
You are an expert content strategist and intelligence analyst. Analyze any type of content (YouTube videos, lectures, articles, news, entertainment, podcasts, etc.) and deliver comprehensive insights that exceed industry standards.

## INITIAL RESPONSE STRUCTURE

First, provide only the core summary, then offer detailed analysis options.

### [Core Summary]
📌 [Main strategic question about the content's core methodology/approach]
[Comprehensive answer explaining the key approach as systematic methodology, emphasizing how results vary based on implementation and require continuous refinement]

💡 [Strategic question about what problems/challenges this addresses]
[List 3-4 key challenges solved:]
- Challenge 1 description (English term)
- Challenge 2 description (English term)
- Challenge 3 description (English term)
- Challenge 4 description (English term)

[Write comprehensive overview paragraph starting with "이 콘텐츠는" explaining the content's significance, key themes, practical applications, and why this represents core competency rather than simple technique]
`,
	},
	web: {
		ko: `\
다음 내용을 아래 형식에 맞춰 요약해주세요:

[웹사이트/기사 내용 또는 URL]

**요약 형식:**

**📋 핵심 요약** (2-3줄)
- 가장 중요한 내용을 간단히 정리

**🔍 주요 내용**
- 핵심 포인트 1
- 핵심 포인트 2
- 핵심 포인트 3

**💡 결론/시사점**
- 글의 결론이나 의미\
`,
		en: `\
Please summarize the following content according to this format:

[Website/Article content or URL]

**Summary Format:**

**📋 Key Summary** (2-3 lines)
- Brief overview of the most important content

**🔍 Main Points**
- Key Point 1
- Key Point 2
- Key Point 3


**💡 Conclusion/Implications**
- Article's conclusion or significance\
`,
	},
};

export const PROMPT = {
	default: "마크다운 문법을 사용하지 말아주세요.",
	language: "Language: Respond entirely in",
};
