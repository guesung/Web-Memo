import { EXTERNAL_LINK } from "@web-memo/shared/constants";
import type {
	IFCompareCriterion,
	IFCompareProduct,
	IFCompareRecommendation,
} from "../_types";

/**
 * 크롬 메모 확장 비교 페이지의 사실 데이터.
 * @description
 * 모든 값은 각 제품 공식 페이지·웹 메모 레포에서 확인한 것만 적는다. 확인 날짜가
 * 바뀌면 `COMPARE_LAST_CHECKED_DATE` 한 곳만 고치면 화면·출처·JSON-LD가 함께 바뀐다.
 * 이 페이지는 한국어로만 존재해서 문구를 번역 키가 아닌 여기에 둔다
 * (docs/design-system.md 카피 절의 단일 언어 페이지 예외).
 */

/** 표·출처·구조화 데이터가 함께 쓰는 마지막 확인 날짜 */
export const COMPARE_LAST_CHECKED_DATE = "2026-09-24";

/** 언어 접두사를 뺀 이 페이지 경로. 설치 클릭 출발 경로와 canonical에 쓴다 */
export const COMPARE_PAGE_PATH = "/compare/chrome-memo-extensions";

/** 비교 대상 제품. 배열 순서가 곧 표의 열 순서다 */
export const COMPARE_PRODUCTS: IFCompareProduct[] = [
	{
		key: "webMemo",
		name: "웹 메모",
		identity: "읽던 페이지 옆에서 메모",
		sources: [
			{ label: "크롬 웹스토어", url: EXTERNAL_LINK.chromeWebStoreListing },
		],
	},
	{
		key: "notionWebClipper",
		name: "노션 웹 클리퍼",
		identity: "웹페이지를 노션 페이지·DB로 저장",
		sources: [
			{ label: "웹 클리퍼", url: "https://www.notion.com/web-clipper" },
			{ label: "도움말", url: "https://www.notion.com/help/web-clipper" },
			{ label: "요금제", url: "https://www.notion.com/pricing" },
			{
				label: "내보내기 도움말",
				url: "https://www.notion.com/help/export-your-content",
			},
		],
	},
	{
		key: "liner",
		name: "라이너(Liner)",
		identity: "AI 리서치 도구와 하이라이터",
		sources: [
			{ label: "홈페이지", url: "https://liner.com" },
			{ label: "요금제", url: "https://liner.com/pricing" },
			{
				label: "하이라이터 소개",
				url: "https://liner.com/learn/liner-highlighter",
			},
			{
				label: "크롬 웹스토어",
				url: "https://chromewebstore.google.com/detail/liner-chatgpt-ai-copilot/bmhcbmnbenmcecpmpepghooflbehcack",
			},
		],
	},
	{
		key: "glasp",
		name: "Glasp",
		identity: "웹·PDF·유튜브 하이라이터",
		sources: [
			{ label: "홈페이지", url: "https://glasp.co" },
			{ label: "요금제", url: "https://glasp.co/pricing" },
			{ label: "유튜브 요약", url: "https://glasp.co/youtube-summary" },
			{
				label: "크롬 웹스토어",
				url: "https://chromewebstore.google.com/detail/glasp-web-highlighter-pdf/blillmbchncajnhkjfdnincfndboieik",
			},
		],
	},
	{
		key: "googleKeep",
		name: "Google Keep 확장",
		identity: "페이지·선택 문장을 Keep 노트로",
		sources: [
			{
				label: "크롬 웹스토어",
				url: "https://chromewebstore.google.com/detail/google-keep-chrome-extens/lpcaedmchfhocbbapmcbpinfpgnhiddi",
			},
			{
				label: "도움말",
				url: "https://support.google.com/keep/answer/3003125",
			},
		],
	},
];

/** 비교 기준 행. 배열 순서가 곧 표의 행 순서다 */
export const COMPARE_CRITERIA: IFCompareCriterion[] = [
	{
		key: "recordingMethod",
		label: "기록 방식",
		cells: {
			webMemo: { status: "supported", description: "사이드 패널에 바로 적기" },
			notionWebClipper: {
				status: "supported",
				description: "팝업에서 노션에 저장",
			},
			liner: { status: "supported", description: "페이지 위 하이라이트" },
			glasp: { status: "supported", description: "페이지 위 하이라이트" },
			googleKeep: {
				status: "supported",
				description: "확장 팝업에서 Keep 노트",
			},
		},
	},
	{
		key: "memoBesidePage",
		label: "읽던 페이지 옆에서 메모",
		cells: {
			webMemo: { status: "supported", description: "사이드 패널, 자동 저장" },
			notionWebClipper: {
				status: "partial",
				description: "저장 후 노션에서 편집",
			},
			liner: { status: "partial", description: "하이라이트에 메모 첨부" },
			glasp: { status: "partial", description: "하이라이트에 메모 첨부" },
			googleKeep: {
				status: "partial",
				description: "팝업에서 작성, 자동 저장 안 됨",
			},
		},
	},
	{
		key: "highlight",
		label: "본문 하이라이트",
		cells: {
			webMemo: { status: "supported", description: "5색 하이라이트와 메모" },
			notionWebClipper: { status: "unsupported", description: "불가" },
			liner: { status: "supported", description: "웹·PDF·유튜브" },
			glasp: { status: "supported", description: "여러 색, 웹·PDF" },
			googleKeep: {
				status: "partial",
				description: "선택 문장을 노트로 저장",
			},
		},
	},
	{
		key: "aiSummary",
		label: "AI 요약",
		cells: {
			webMemo: {
				status: "partial",
				description: "웹·유튜브 요약, 일부 페이지 불가",
			},
			notionWebClipper: {
				status: "partial",
				description: "Notion AI 무료는 체험 횟수만",
			},
			liner: { status: "supported", description: "웹·유튜브·PDF 요약" },
			glasp: {
				status: "supported",
				description: "유튜브·PDF 요약(무료 하루 3회)",
			},
			googleKeep: { status: "unsupported", description: "불가" },
		},
	},
	{
		key: "youtube",
		label: "유튜브 영상",
		cells: {
			webMemo: {
				status: "partial",
				description: "자막 요약, 타임스탬프 메모 없음",
			},
			notionWebClipper: { status: "unsupported", description: "불가" },
			liner: {
				status: "supported",
				description: "영상 요약, 주요 순간 저장",
			},
			glasp: {
				status: "supported",
				description: "자막 하이라이트, 타임스탬프",
			},
			googleKeep: { status: "unsupported", description: "불가" },
		},
	},
	{
		key: "export",
		label: "내보내기",
		cells: {
			webMemo: { status: "supported", description: "JSON·CSV·Markdown" },
			notionWebClipper: {
				status: "supported",
				description: "PDF·HTML·Markdown·CSV",
			},
			liner: { status: "unsupported", description: "불가" },
			glasp: {
				status: "supported",
				description: "Markdown·CSV·JSON, Notion·Obsidian",
			},
			googleKeep: {
				status: "partial",
				description: "데이터 다운로드, 형식 미기재",
			},
		},
	},
	{
		key: "koreanInterface",
		label: "한국어 화면",
		cells: {
			webMemo: { status: "supported", description: "기본 언어 한국어" },
			notionWebClipper: { status: "supported", description: "한국어 지원" },
			liner: { status: "supported", description: "한국어 지원" },
			glasp: { status: "unsupported", description: "영어만" },
			googleKeep: { status: "supported", description: "한국어 지원" },
		},
	},
	{
		key: "login",
		label: "로그인",
		cells: {
			webMemo: {
				status: "partial",
				description: "요약은 없이, 메모는 로그인 필요",
			},
			notionWebClipper: { status: "partial", description: "노션 로그인 필요" },
			liner: { status: "partial", description: "계정 로그인 필요" },
			glasp: {
				status: "partial",
				description: "요약은 없이, 하이라이트는 계정 필요",
			},
			googleKeep: { status: "partial", description: "구글 계정 필요" },
		},
	},
];

/** "이런 분께 맞아요" 목록. 상황과 그에 맞는 제품, 덧붙일 설명 */
export const COMPARE_RECOMMENDATIONS: IFCompareRecommendation[] = [
	{
		situation:
			"이미 노션에 자료를 쌓고 있고, 클립한 글을 DB 속성·태그로 관리하고 싶다면",
		productName: "노션 웹 클리퍼",
		note: "저장 위치로 페이지·DB를 고르고 URL 속성이 자동으로 붙어요.",
	},
	{
		situation:
			"유튜브 강의를 타임스탬프 단위로 짚어 가며 정리하고 Obsidian·Notion으로 옮기고 싶다면",
		productName: "Glasp",
		note: "웹 메모는 영상 주소만 남겨요.",
	},
	{
		situation:
			"폰·워치에서 이미 Keep을 쓰고 있어서 웹 스크랩도 같은 곳에 모으고 싶다면",
		productName: "Google Keep 확장",
	},
	{
		situation:
			"논문·PDF를 AI에게 물어 가며 읽고 하이라이트까지 한곳에 두고 싶다면",
		productName: "라이너",
		note: "무료 플랜은 광고가 있고 파일 업로드가 하루 1개예요.",
	},
	{
		situation:
			"글을 읽다 떠오른 생각을 하이라이트와 상관없이 자유롭게 적고, 어느 페이지에서 쓴 메모인지 자동으로 남기고 싶다면",
		productName: "웹 메모",
		note: "사이드 패널에서 자동 저장되고, 주소·제목이 자동으로 기록돼요.",
	},
	{
		situation:
			"돈을 내지 않고 한국어 화면으로 메모·요약·내보내기를 모두 쓰고 싶다면",
		productName: "웹 메모",
		note: "유료 플랜이 없어요. 다만 메모를 쓰려면 로그인해야 해요.",
	},
];
