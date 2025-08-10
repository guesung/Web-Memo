export const DEFAULT_PROMPTS = {
	youtube: {
		ko: `\
다음 영상 내용을 아래 형식에 맞춰 요약해주세요:

**🎥 영상 개요** (2-3줄)
- 영상의 주제와 핵심 메시지를 간단히 정리

**📌 주요 내용**
- 핵심 포인트 1
- 핵심 포인트 2
- 핵심 포인트 3

**🔑 핵심 인사이트**
- 영상에서 강조한 중요한 통찰이나 교훈
`,
		en: `\
Please summarize the following video content according to this format:

**🎥 Video Overview** (2-3 lines)
- Brief summary of the video's topic and core message

**📌 Key Points**
- Key Point 1
- Key Point 2
- Key Point 3

**🔑 Key Insights**
- Important insights or lessons emphasized in the video

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
