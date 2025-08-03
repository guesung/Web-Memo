export const DEFAULT_PROMPTS = {
	youtube: {
		ko: `\
제공하는 영상을 다음 기준에 따라 요약해주세요:
1. 핵심 주제와 목적
- 이 영상이 전달하고자 하는 핵심 메시지는 무엇인가요?
2. 핵심 인사이트 3가지
- 가장 중요한 통찰이나 배울 점은 무엇인가요?
3. 실행 가능한 액션 아이템
- 시청자가 바로 실천할 수 있는 구체적인 행동은 무엇인가요?
4. 추가 학습이 필요한 부분
더 깊이 알아보면 좋을 주제나 개념은 무엇인가요?\
`,
		en: `\
Please summarize the provided video according to these criteria:
1. Core Topic and Purpose
- What is the main message this video aims to convey?
2. Three Key Insights
- What are the most important takeaways or lessons learned?
3. Actionable Items
- What specific actions can viewers implement right away?
4. Areas for Further Learning
- What topics or concepts would be beneficial to explore in more depth?\
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

**📊 중요 데이터/통계**
- 언급된 주요 수치나 통계

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

**📊 Important Data/Statistics**
- Key numbers or statistics mentioned

**💡 Conclusion/Implications**
- Article's conclusion or significance\
`,
	},
};

export const PROMPT = {
	default: "마크다운 문법을 사용하지 말아주세요.",
	language: "Language: Respond entirely in",
};
