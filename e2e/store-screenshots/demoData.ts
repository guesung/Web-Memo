/**
 * 스토어 스크린샷에 쓰는 언어.
 * @description 확장은 `_locales/<언어>`, 웹은 `/<언어>/memos` 경로로 이 값을 따른다.
 */
export type TStoreLanguage = "ko" | "en";

/**
 * 시연용 기사(demoArticle.html)를 띄우는 주소.
 * @description `.example.com`은 문서 예시용으로 예약된 도메인이라 실존 매체와 겹치지 않는다.
 * 실제로 요청이 나가지 않도록 capture.spec.ts가 이 주소를 로컬 파일로 응답한다.
 */
export const DEMO_ARTICLE_URL =
	"https://journal.example.com/essays/three-checks-a-day";

/**
 * 요약 장면에 쓰는 유튜브 영상 주소.
 * @description Blender 재단의 공개 영화 "Big Buck Bunny"(CC BY 3.0)다. 영상 페이지는 capture.spec.ts가
 * 직접 그린 HTML로 응답하고, 썸네일만 유튜브 이미지 서버(i.ytimg.com)에서 받는다.
 */
export const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

/** 영상 썸네일. 유튜브가 영상마다 공개하는 고해상도 정지 화면이다. */
export const DEMO_VIDEO_THUMBNAIL_URL =
	"https://i.ytimg.com/vi/aqz-KE-bpKQ/maxresdefault.jpg";

/** 시연용 카테고리 한 건. id는 메모의 categoryId가 가리킨다. */
interface IFDemoCategory {
	/** 목 저장소에 넣을 카테고리 id */
	id: number;
	/** 사이드바·메모 카드에 보이는 이름 */
	name: string;
	/** 카테고리 점 색(hex) */
	color: string;
}

/** 시연용 메모 한 건. */
interface IFDemoMemo {
	/** 메모를 남긴 페이지 주소 */
	url: string;
	/** 페이지 제목 */
	title: string;
	/** 메모 본문 */
	memo: string;
	/** 연결할 카테고리 id. 없으면 null */
	categoryId: number | null;
	/** 마지막 수정이 지금부터 몇 분 전인지. 카드의 상대 시각과 정렬 순서를 정한다 */
	minutesAgo: number;
	/** 위시리스트 여부 */
	isWish?: boolean;
	/** 중요 표시 여부 */
	isStar?: boolean;
}

/** 한 언어 분량의 시연 데이터. */
interface IFDemoContent {
	/** 사이드바에 보일 카테고리 */
	categories: IFDemoCategory[];
	/** 시연 기사에 남긴 메모. 1~3번 장의 사이드 패널에 보인다 */
	articleMemo: IFDemoMemo;
	/** 시연 영상에 남긴 메모. 5번 장의 사이드 패널에 보인다 */
	videoMemo: IFDemoMemo;
	/** 웹 대시보드(4번 장)에 함께 보일 다른 메모 */
	otherMemos: IFDemoMemo[];
	/** 영상 페이지 본문(설명란). 사이드 패널이 요약 재료로 읽는다 */
	videoDescription: string;
	/** 목 요약 응답. 사이드 패널은 조각을 순서대로 이어 붙여 보여준다 */
	summaryChunks: string[];
}

/**
 * 언어별 시연 데이터.
 * @description 모두 가상의 독서·업무 리서치 메모다. 실제 사용자 데이터를 쓰지 않는다.
 * 주소는 예약 도메인(`*.example.com`, `*.example.org`)만 쓴다.
 */
export const DEMO_CONTENT: Record<TStoreLanguage, IFDemoContent> = {
	ko: {
		categories: [
			{ id: 1, name: "업무 리서치", color: "#3B82F6" },
			{ id: 2, name: "독서", color: "#10B981" },
			{ id: 3, name: "영상 공부", color: "#F59E0B" },
			{ id: 4, name: "아이디어", color: "#8B5CF6" },
		],
		articleMemo: {
			url: DEMO_ARTICLE_URL,
			title: "알림은 하루 세 번만 확인하세요",
			memo: [
				"알림 확인 = 집중을 새로 시작하는 횟수",
				"",
				"- 10시·1시·4시에만 메신저 열기",
				"- 급한 일은 전화로 받기",
				"- 4주 뒤 2시간 이상 몰입 구간 1회 → 3회",
				"",
				"다음 주 팀 회의에서 2주만 시범 운영 제안해 보기",
			].join("\n"),
			categoryId: 1,
			minutesAgo: 2,
			isStar: true,
		},
		videoMemo: {
			url: DEMO_VIDEO_URL,
			title: "Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film",
			memo: "오프닝 숲 장면의 빛 표현 참고하기",
			categoryId: 3,
			minutesAgo: 30,
		},
		otherMemos: [
			{
				url: "https://research.example.org/remote-retro-template",
				title: "원격 팀을 위한 주간 회고 템플릿",
				memo: "잘한 것·아쉬운 것·시도할 것 3칸이면 충분. 15분 타이머 꼭 쓰기",
				categoryId: 1,
				minutesAgo: 90,
			},
			{
				url: "https://books.example.com/slow-reading/chapter-3",
				title: "『천천히 읽기』 3장 — 밑줄 긋는 법",
				memo: "밑줄은 동의한 곳이 아니라 다시 생각하고 싶은 곳에 긋는다",
				categoryId: 2,
				minutesAgo: 60 * 5,
				isWish: true,
			},
			{
				url: "https://ux.example.com/interview-questions",
				title: "사용자 인터뷰 질문 설계 체크리스트",
				memo: "'왜'보다 '마지막으로 그걸 했을 때'를 물어볼 것",
				categoryId: 1,
				minutesAgo: 60 * 26,
				isStar: true,
			},
			{
				url: "https://notes.example.com/onboarding-emails",
				title: "좋은 온보딩 이메일의 공통점 5가지",
				memo: "첫 메일은 기능 소개 대신 첫 성공 경험 하나만 안내",
				categoryId: 4,
				minutesAgo: 60 * 50,
			},
			{
				url: "https://books.example.com/habits/summary",
				title: "습관은 의지가 아니라 환경이다",
				memo: "책상 위에 둘 것 하나, 치울 것 하나 정하기",
				categoryId: 2,
				minutesAgo: 60 * 75,
			},
			{
				url: "https://research.example.org/four-day-week-cases",
				title: "주 4일제를 먼저 도입한 회사들의 1년 뒤",
				memo: "회의 시간 상한을 먼저 정한 회사가 생산성 유지에 성공",
				categoryId: 1,
				minutesAgo: 60 * 100,
			},
		],
		videoDescription:
			"Big Buck Bunny는 Blender 재단이 만든 공개 단편 애니메이션입니다. 숲에 사는 커다란 토끼가 자신을 괴롭히는 세 마리 설치류에게 재치 있게 복수하는 이야기를 담았습니다. 이 영상은 크리에이티브 커먼즈 저작자 표시(CC BY 3.0) 라이선스로 공개되었습니다.",
		summaryChunks: [
			"**한 줄 요약**\n",
			"숲속의 순한 큰 토끼가 자신과 작은 동물들을 괴롭히던 세 설치류에게 재치 있는 함정으로 되갚아 주는 10분짜리 단편 애니메이션입니다.\n\n",
			"**주요 장면**\n",
			"- 아침 숲에서 나비와 꽃을 즐기는 토끼의 평화로운 일상\n",
			"- 설치류 삼총사가 나비를 해치자 토끼가 복수를 결심\n",
			"- 나무와 덩굴로 만든 함정으로 셋을 차례로 골탕 먹이는 후반부\n\n",
			"**볼 만한 점**\n",
			"- Blender 재단이 오픈소스 도구만으로 제작한 공개 영화\n",
			"- 털과 숲 조명 표현이 돋보이는 3D 애니메이션",
		],
	},
	en: {
		categories: [
			{ id: 1, name: "Work research", color: "#3B82F6" },
			{ id: 2, name: "Reading", color: "#10B981" },
			{ id: 3, name: "Video notes", color: "#F59E0B" },
			{ id: 4, name: "Ideas", color: "#8B5CF6" },
		],
		articleMemo: {
			url: DEMO_ARTICLE_URL,
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
			url: DEMO_VIDEO_URL,
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
		videoDescription:
			"Big Buck Bunny is an open short film by the Blender Foundation. A large, gentle rabbit takes clever revenge on three rodents who bully him and the small creatures of the forest. The film is released under the Creative Commons Attribution (CC BY 3.0) license.",
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
	},
};
