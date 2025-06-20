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
제공하는 아티클을 다음 기준에 따라 요약해주세요:
1. 핵심 주제와 목적
- 이 아티클이 전달하고자 하는 핵심 메시지는 무엇인가요?
2. 핵심 인사이트 3가지
- 가장 중요한 통찰이나 배울 점은 무엇인가요?
3. 실행 가능한 액션 아이템
- 독자가 바로 실천할 수 있는 구체적인 행동은 무엇인가요?
4. 추가 학습이 필요한 부분
더 깊이 알아보면 좋을 주제나 개념은 무엇인가요?\
`,
		en: `\
Please summarize the provided article according to these criteria:
1. Core Topic and Purpose
- What is the main message this article aims to convey?
2. Three Key Insights
- What are the most important takeaways or lessons learned?
3. Actionable Items
- What specific actions can readers implement right away?
4. Areas for Further Learning
- What topics or concepts would be beneficial to explore in more depth?\
`,
	},
};

export const PROMPT = {
	default: "마크다운 문법을 사용하지 말아주세요.",
	language: "Language: Respond entirely in",
};
