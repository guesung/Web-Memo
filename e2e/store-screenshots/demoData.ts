import { KO_REAL_CONTENT } from "./realMemos";

/**
 * 스토어 스크린샷에 쓰는 언어.
 * @description 확장은 `_locales/<언어>`, 웹은 `/<언어>/memos` 경로로 이 값을 따른다.
 */
export type TStoreLanguage = "ko" | "en";

/** 시연용 카테고리 한 건. id는 메모의 categoryId가 가리킨다. */
export interface IFDemoCategory {
	/** 목 저장소에 넣을 카테고리 id */
	id: number;
	/** 사이드바·메모 카드에 보이는 이름 */
	name: string;
	/** 카테고리 점 색(hex) */
	color: string;
}

/** 시연용 메모 한 건. */
export interface IFDemoMemo {
	/** 메모를 남긴 페이지 주소 */
	url: string;
	/** 페이지 제목 */
	title: string;
	/** 메모 본문 */
	memo: string;
	/** 느낀 점. 설정에서 켜야 보인다 */
	impression?: string | null;
	/** 액션 아이템. 설정에서 켜야 보인다 */
	actionItem?: string | null;
	/** 페이지 favicon 주소 */
	favIconUrl?: string | null;
	/** 연결할 카테고리 id. 없으면 null */
	categoryId: number | null;
	/** 마지막 수정이 지금부터 몇 분 전인지. 카드의 상대 시각과 정렬 순서를 정한다 */
	minutesAgo: number;
	/** 위시리스트 여부 */
	isWish?: boolean;
	/** 중요 표시 여부 */
	isStar?: boolean;
}

/**
 * 캡처할 웹 페이지.
 * @description realPage가 null이면 실제 사이트로 나가지 않고 로컬에서 만든 HTML(기사는 demoArticle.html,
 * 영상은 substituteVideo로 그린 대체 페이지)로 응답한다. 값이 있으면 실제 페이지를 읽기만 하고,
 * readySelector가 뜬 뒤 style로 광고·팝업처럼 본문을 가리는 요소를 숨긴다.
 */
export interface IFDemoPage {
	/** 페이지 주소. 주소창에도 이대로 보인다 */
	url: string;
	/** 창 틀 탭의 아이콘. 없으면 tabIconLetter를 쓴다 */
	tabIconUrl: string | null;
	/** 탭 아이콘 자리에 넣을 글자 */
	tabIconLetter: string;
	/** 실제 페이지 설정. null이면 로컬 HTML로 응답한다 */
	realPage: {
		/** 본문이 준비됐다고 볼 요소 */
		readySelector: string;
		/** 페이지에 덧붙일 CSS */
		style: string;
	} | null;
}

/** 대체 영상 페이지(실제 유튜브를 쓰지 않을 때)에 넣을 값. */
export interface IFSubstituteVideo {
	/** 썸네일 이미지 주소 */
	thumbnailUrl: string;
	/** 채널 이름 */
	channelName: string;
	/** 설명란 본문. 사이드 패널이 요약 재료로 읽는다 */
	description: string;
}

/** 한 언어 분량의 시연 데이터. */
export interface IFDemoContent {
	/** 느낀 점 칸을 사이드 패널에 보일지(목 setting의 show_impression) */
	showImpression: boolean;
	/**
	 * 5번 장에서 요약 영역이 차지할 비율(%). 요약 마지막 줄까지 보이는 범위에서 메모 칸에 남는 높이를 정한다.
	 * 확장 기본값은 60이다.
	 */
	videoSummaryRatio: number;
	/** 사이드바에 보일 카테고리 */
	categories: IFDemoCategory[];
	/** 1~3번 장의 기사 페이지 */
	articlePage: IFDemoPage;
	/** 5번 장의 영상 페이지 */
	videoPage: IFDemoPage;
	/** 대체 영상 페이지 값. videoPage.realPage가 null일 때만 쓴다 */
	substituteVideo: IFSubstituteVideo | null;
	/** 기사에 남긴 메모. 1~3번 장의 사이드 패널에 보인다 */
	articleMemo: IFDemoMemo;
	/** 영상에 남긴 메모. 5번 장의 사이드 패널에 보인다 */
	videoMemo: IFDemoMemo;
	/** 웹 대시보드(4번 장)에 함께 보일 다른 메모 */
	otherMemos: IFDemoMemo[];
	/** 목 요약 응답. 사이드 패널은 조각을 순서대로 이어 붙여 보여준다 */
	summaryChunks: string[];
}

const EN_ARTICLE_URL = "https://journal.example.com/essays/three-checks-a-day";
const EN_VIDEO_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

/**
 * 영어판 시연 데이터.
 * @description 모두 가상의 독서·업무 리서치 메모다. 기사 주소는 예약 도메인(`*.example.com`)이라 실존 매체와 겹치지 않는다.
 * 영상은 Blender 재단의 공개 영화 "Big Buck Bunny"(CC BY 3.0)이고, 대체 페이지에 저작자와 라이선스를 적는다.
 */
const EN_DEMO_CONTENT: IFDemoContent = {
	showImpression: false,
	videoSummaryRatio: 60,
	categories: [
		{ id: 1, name: "Work research", color: "#3B82F6" },
		{ id: 2, name: "Reading", color: "#10B981" },
		{ id: 3, name: "Video notes", color: "#F59E0B" },
		{ id: 4, name: "Ideas", color: "#8B5CF6" },
	],
	articlePage: {
		url: EN_ARTICLE_URL,
		tabIconUrl: null,
		tabIconLetter: "F",
		realPage: null,
	},
	videoPage: {
		url: EN_VIDEO_URL,
		tabIconUrl: null,
		tabIconLetter: "▶",
		realPage: null,
	},
	substituteVideo: {
		thumbnailUrl: "https://i.ytimg.com/vi/aqz-KE-bpKQ/maxresdefault.jpg",
		channelName: "Blender",
		description:
			"Big Buck Bunny is an open short film by the Blender Foundation. A large, gentle rabbit takes clever revenge on three rodents who bully him and the small creatures of the forest. The film is released under the Creative Commons Attribution (CC BY 3.0) license.<br />© Blender Foundation · CC BY 3.0 · peach.blender.org",
	},
	articleMemo: {
		url: EN_ARTICLE_URL,
		title: "Check chat just 3 times a day",
		memo: [
			"Checking chat = restarting focus",
			"",
			"- Open chat only at 10, 1 and 4",
			"- Take urgent requests by phone",
			"- After 4 weeks: 2h+ focus blocks went from 1 to 3 a day",
			"",
			"Propose a two-week trial at next week's team meeting",
		].join("\n"),
		categoryId: 1,
		minutesAgo: 2,
		isStar: true,
	},
	videoMemo: {
		url: EN_VIDEO_URL,
		title: "Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film",
		memo: "Study the lighting in the opening forest scene",
		categoryId: 3,
		minutesAgo: 30,
	},
	otherMemos: [
		{
			url: "https://research.example.org/remote-retro-template",
			title: "A weekly retro template for remote teams",
			memo: "Went well / Could improve / Try next — three columns are enough. Use a 15-min timer",
			categoryId: 1,
			minutesAgo: 90,
		},
		{
			url: "https://books.example.com/slow-reading/chapter-3",
			title: "Slow Reading, Chapter 3 — How to underline",
			memo: "Underline what you want to rethink, not what you agree with",
			categoryId: 2,
			minutesAgo: 60 * 5,
			isWish: true,
		},
		{
			url: "https://ux.example.com/interview-questions",
			title: "Checklist for writing user interview questions",
			memo: "Ask about 'the last time you did it' instead of 'why'",
			categoryId: 1,
			minutesAgo: 60 * 26,
			isStar: true,
		},
		{
			url: "https://notes.example.com/onboarding-emails",
			title: "5 things great onboarding emails have in common",
			memo: "First email: guide to one quick win, not a feature tour",
			categoryId: 4,
			minutesAgo: 60 * 50,
		},
		{
			url: "https://books.example.com/habits/summary",
			title: "Habits are about environment, not willpower",
			memo: "Pick one thing to keep on the desk and one to remove",
			categoryId: 2,
			minutesAgo: 60 * 75,
		},
		{
			url: "https://research.example.org/four-day-week-cases",
			title: "Companies one year after adopting a four-day week",
			memo: "Teams that capped meeting time first kept their productivity",
			categoryId: 1,
			minutesAgo: 60 * 100,
		},
	],
	summaryChunks: [
		"**In one line**\n",
		"A 10-minute animated short where a gentle giant rabbit turns the tables on three rodents who bully him and the forest's small animals.\n\n",
		"**Key scenes**\n",
		"- A peaceful morning of butterflies and flowers in the forest\n",
		"- The rabbit vows revenge after the trio harms a butterfly\n",
		"- Traps made of trees and vines catch the bullies one by one\n\n",
		"**Why watch**\n",
		"- An open movie made by the Blender Foundation with open-source tools\n",
		"- Striking fur and forest lighting in 3D animation",
	],
};

/**
 * 언어별 시연 데이터.
 * @description 한국어판은 사용자의 실제 메모(realMemos.ts), 영어판은 가상 데이터다.
 */
export const DEMO_CONTENT: Record<TStoreLanguage, IFDemoContent> = {
	ko: KO_REAL_CONTENT,
	en: EN_DEMO_CONTENT,
};
