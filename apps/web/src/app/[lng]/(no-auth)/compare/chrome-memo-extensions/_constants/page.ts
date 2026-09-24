/**
 * 비교 페이지의 섹션 문구.
 * @description 한국어로만 존재하는 페이지라 번역 키 대신 여기에 둔다.
 */
export const COMPARE_PAGE_COPY = {
	hero: {
		badge: "크롬 메모 확장 비교",
		title: "크롬 메모 확장 프로그램, 무엇을 써야 할까요",
		descriptions: [
			"웹 메모, 노션 웹 클리퍼, 리너, Glasp, Google Keep 확장까지 크롬에서 메모·하이라이트에 쓸 수 있는 확장 다섯 개를 나란히 놓았어요.",
			"기록 방식, 읽던 페이지 옆 메모, 하이라이트, AI 요약, 유튜브, 내보내기, 한국어 화면, 로그인까지 여덟 가지 기준을 각 제품 공식 페이지에서 확인했어요.",
		],
		disclosure:
			"웹 메모를 만드는 사람이 썼어요. 웹 메모가 약한 항목도 그대로 적었어요.",
		lastCheckedLabel: "마지막 확인",
		anchorLabel: "비교표 바로 보기",
	},
	overview: {
		title: "한눈에 보기",
	},
	comparison: {
		title: "기준별 비교",
		caption:
			"각 제품 공식 페이지를 기준으로 정리했어요. 확인 날짜는 아래 출처에 있어요.",
		loginNote:
			"로그인 행은 로그인 없이 쓸 수 있는 범위를 나타내요. 지원은 로그인 없이 모두, 일부는 일부 기능만 로그인 없이 쓸 수 있다는 뜻이에요.",
		criterionHeader: "기준",
		scrollHint: "옆으로 밀어서 더 보기",
	},
	recommendation: {
		title: "이런 분께 맞아요",
	},
	sources: {
		title: "출처와 확인 날짜",
		checkedLabel: "확인",
		feedback: "달라진 점을 알려주시면 고칠게요.",
		feedbackLinkLabel: "메일로 알려주기",
	},
	finalCTA: {
		title: "읽으면서 바로 적고 싶다면",
		description:
			"웹 메모는 무료예요. 설치하고 로그인하면 읽던 페이지 옆 사이드 패널에서 바로 메모할 수 있어요.",
	},
} as const;
