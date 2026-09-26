import type { IFDemoCategory, IFDemoContent, IFDemoMemo } from "./demoData";

/**
 * 한국어판에 쓰는 사용자의 실제 메모 9개.
 * @description 운영 DB에서 조회한 값을 그대로 옮겼다. 제목·본문·느낀 점·카테고리 이름과 색은 오타나
 * "(22) ", " - YouTube" 같은 접두·접미사까지 저장값 그대로이며 고치지 않는다. created_at은 원래 시각이고,
 * 화면에 보이는 상대 시각은 이 간격을 유지한 채 캡처 시점 기준으로 다시 계산한다(toDemoMemo).
 */
const REAL_MEMOS: IFRealMemo[] = [
	{
		id: 13290,
		title: "카파시의 AI 사용법을 지금 다시 봐야 하는 이유 - YouTube",
		url: "https://www.youtube.com/watch?v=hQoRPlPGnEM",
		favIconUrl: "https://www.youtube.com/s/desktop/18536138/img/favicon.ico",
		memo: "1. AI는 이전 대화 내용을 계속 가져간다. 그렇기에 주제가 바뀌면 새 대화를 열어 맥락을 초기화해야 한다.\n2. 얼마나 생각이 필요한지에 따라 모델을 다르게 지정할 필요가 있다.\n3. 연구를 하기에 앞서 범위를 정해주고 조사를 시작한다.\n4. 키보드로만 질문하지 않고, 휴대폰에서 말한 내용을 글로 바꿔 질문창에 넣음\n5. 이동하면서 학습하고 싶을 때는 Notebook LM을 활용해 라디오 팟캐스트로 들음\n6. AI가 반환한 결과를 반드시 검증한다.",
		impression: "",
		actionItem:
			"1. 말로 작업 만드는 플로우 만들기\ne.g. xx 작업 진행해줘 -> 노션 작업 카드 -> 작업 수행\n2. 무언가 기능 개발/수정할 때, 디자인을 나에게 반드시 먼저 보여주도록 하기\n3. 내 업무 워크플로우 한 번 더 점검하기\ne.g. QA가 과하지는 않은지, 검사 단계를 더 추가할 건 없는지",
		isStar: false,
		isWish: false,
		created_at: "2026-09-25 09:51:54.97865+00",
		category: "AI",
		category_color: "#94d0e5",
	},
	{
		id: 12425,
		title: "App Router의 장점은 우리에게도 장점일까요?",
		url: "https://toss.tech/article/52999",
		favIconUrl: "https://static.toss.im/tds/favicon/favicon-32x32.png",
		memo: "1. WebKit/Safari 엔진은 Chrome보다 FCP가 느림\n2. RSC -> RSC용 구현만 headers()로 인증 정보를 읽음. \n- RSC/RCC의 경계를 계속 구분해야 함, RSC의 영역이 생각보다 많지 않음\n- basePath를 설정한 상태에서 Page Router화면끼리 이동하면 basePath가 두 번 붙는 이슈\n=> Pages Router를 유지하기로 결정",
		impression: "",
		actionItem: "",
		isStar: false,
		isWish: true,
		created_at: "2026-09-24 01:41:02.91624+00",
		category: "프론트엔드",
		category_color: "#000000",
	},
	{
		id: 10716,
		title: "(22) AI를 미친 듯이 써보고 깨달은 한 가지 - YouTube",
		url: "https://www.youtube.com/watch?v=VubTHP1r3Cc",
		favIconUrl: "https://www.youtube.com/s/desktop/01a26818/img/favicon.ico",
		memo: "1. 이제 진짜 중요해진 것: 읽기\n- 틀린 걸 찾아내고, 더 나은 걸 찾아내 조합해서 산출물로 만들어내는 능력\n2. 문해력 기르는 방법 : 내 분야의 교과서 읽기\n1) 긴 텍스트를 견디는 힘이 키워진다.\n2) 배경 지식이 함께 쌓인다.\n- 이 구조도 전문가가 설계한 것이다.\n3. 책을 선별적으로 읽음 -> 이는 많이 읽어봐야 함.",
		impression: "",
		actionItem: "",
		isStar: false,
		isWish: true,
		created_at: "2026-08-14 12:36:42.282029+00",
		category: null,
		category_color: null,
	},
	{
		id: 10630,
		title: "비개발자가 400페이지 서명 검사를 자동화하며 고민한 것 | 요즘IT",
		url: "https://yozm.wishket.com/magazine/detail/3872/?data=NdRtPpRfSlqiSqf6yJPSIzRDEzML/pkc%20a7lPT1ojH0=&source=daily_latest_news",
		favIconUrl: "https://yozm.wishket.com/favicon.ico",
		memo: "어디까지 도구에 맡기고, 어디부터는 사람이 봐야 하는가를 스스로 정한 경험\n도구는 사람이 지치는 일, 400페이지를 뒤져 표지를 찾고, 서명란만 잘라 모으는 일을 대신하고, 판단이라는 마지막 1초는 사람에게 남겨 둔다",
		impression: "",
		actionItem: "",
		isStar: false,
		isWish: false,
		created_at: "2026-08-02 23:21:29.796475+00",
		category: null,
		category_color: null,
	},
	{
		id: 10428,
		title: "컴퓨터과학 학위는 죽지 않았다 | GeekNews",
		url: "https://news.hada.io/topic?id=31421",
		favIconUrl: "https://news.hada.io/favicon.ico",
		memo: "1. 시장 상황보다 시스템을 명확하게 이해하고 추론하는 지속 가능한 엔지니어링 역량을 쌓아야 함\n2. 첫 직장이 경력 전체를 결정하지 않으며, 시작한 위치와 최종적으로 도달하는 위치는 같지 않음",
		impression: "",
		actionItem: "",
		isStar: false,
		isWish: false,
		created_at: "2026-07-14 08:59:29.092682+00",
		category: null,
		category_color: null,
	},
	{
		id: 10178,
		title: "선택을 잘하는 사람들의 특징",
		url: "https://brunch.co.kr/@mj119/17",
		favIconUrl:
			"https://t1.kakaocdn.net/brunch/static/icon/favicon/brunchstory/favicon_20230406.ico",
		memo: "1. 선택을 잘하는 사람은 확신이 있어서 움직이지 않는다. 불안을 안고도 무너지지 않았던 경험을 하나씩 쌓아간다.\n- 완벽하지 않아도 지금의 나를 망치지 않는 선택, 그리고 그 선택을 반복할 수 있다는 감각",
		impression:
			"1. 그렇구나. 완벽한 선택은 이 세상에 없다. 이 사실을 깨닫고, 경험을 쌓아가는 것이 중요하겠구나. 잘못된 선택은 없고, 내가 한 선택이 옳은 선택이 되도록 만들어가는 것이 참 중요하겠다.",
		actionItem: "",
		isStar: false,
		isWish: true,
		created_at: "2026-06-24 22:48:17.060299+00",
		category: null,
		category_color: null,
	},
	{
		id: 10143,
		title:
			"냉동 블루베리 그냥 먹으면 안되는 이유! 블루베리와 함께 먹으면 좋은 음식 [정라레] - YouTube",
		url: "https://www.youtube.com/watch?v=-wqI1ms2kgA",
		favIconUrl: "https://www.youtube.com/s/desktop/61baa440/img/favicon.ico",
		memo: "1. 냉동 블루베리, 씻어야 하나?\n- 제품 유형이 '농산물'로 표기된 경우 반드시 섭취 전 흐르는 물에 30초 정도 가볍게 씻어야 합니다. \n- '과채가공품'은 세척 후 냉동된 것이라 바로 먹어도 되지만, 유형 표기가 없다면 씻어 먹는 것을 권장합니다.\n2. 절대 금지: 한번 해동한 블루베리를 다시 냉동하는 것은 미생물 증식의 원인이 되므로 절대 피해야 합니다.\n",
		impression: null,
		actionItem: null,
		isStar: false,
		isWish: false,
		created_at: "2026-06-22 10:31:44.59191+00",
		category: "건강",
		category_color: "#d85a5a",
	},
	{
		id: 9848,
		title: "[우테코 레벨1 회고] 우리 모두 각자만의 우테코를 하고 있으니까",
		url: "https://velog.io/@vlmbuyd/%EC%9A%B0%EC%95%84%ED%95%9C%ED%85%8C%ED%81%AC%EC%BD%94%EC%8A%A4-8%EA%B8%B0-%EB%A0%88%EB%B2%A81-%ED%9A%8C%EA%B3%A0-%EC%9A%B0%EB%A6%AC-%EB%AA%A8%EB%91%90-%EA%B0%81%EC%9E%90%EB%A7%8C%EC%9D%98-%EC%9A%B0%ED%85%8C%EC%BD%94%EB%A5%BC-%ED%95%98%EA%B3%A0-%EC%9E%88%EC%9C%BC%EB%8B%88%EA%B9%8C",
		favIconUrl: "https://static.velog.io/favicons/favicon-32x32.png",
		memo: "1. 특정 지식에 대한 깊이의 중요성은 떨어지고 있다. \n- 하지만 깊이 파는 역량의 중요성은 올라가고 있다. 즉, 어떠한 문제를 마주하더라도 깊이 파서 해결할 수 있는 역량이 중요하다.\n2. 무언가를 얻는 것보다 버리는 것이 더 어렵다.\n- 잘 안되고 있는 것 같다면 무언가를 더 추가할 생각을 하지 말고, 버려야 한다. 버릴 수 있는 것도 큰 용기다",
		impression: null,
		actionItem: null,
		isStar: false,
		isWish: false,
		created_at: "2026-05-26 22:25:14.43329+00",
		category: null,
		category_color: null,
	},
	{
		id: 9590,
		title: "AI는 사고를 대체하지 말고 끌어올려야 함 | GeekNews",
		url: "https://news.hada.io/topic?id=28937&utm_source=weekly&utm_medium=email&utm_campaign=202618",
		favIconUrl: "https://news.hada.io/favicon.svg",
		memo: "뛰어난 엔지니어는 AI를 덜 쓰는 것이 아니라 더 적극적으로 쓰되, 사고 자체는 넘기지 않음\n- 보일러플레이트 작성, 문서 요약, 테스트 스캐폴딩 생성, 리팩터링 제안, 실패 가능성 탐색, 조사 가속, 반복 업무 압축 같은 기계적 작업은 기꺼이 넘김",
		impression: null,
		actionItem: null,
		isStar: false,
		isWish: false,
		created_at: "2026-05-04 00:52:13.957184+00",
		category: "AI",
		category_color: "#94d0e5",
	},
];

/** 1~3번 장의 기사 메모 id("선택을 잘하는 사람들의 특징"). */
const ARTICLE_MEMO_ID = 10178;
/** 5번 장의 영상 메모 id("AI를 미친 듯이 써보고 깨달은 한 가지"). */
const VIDEO_MEMO_ID = 10716;

/**
 * 실제 카테고리. 메모에 붙은 이름을 처음 나온 순서대로 모으고 id를 1부터 매긴다.
 * @description 카테고리가 없는 메모는 category가 null이다.
 */
const REAL_CATEGORIES: IFDemoCategory[] = REAL_MEMOS.flatMap((realMemo) =>
	realMemo.category === null || realMemo.category_color === null
		? []
		: [{ name: realMemo.category, color: realMemo.category_color }],
)
	.filter(
		(category, index, categories) =>
			categories.findIndex(
				(otherCategory) => otherCategory.name === category.name,
			) === index,
	)
	.map((category, index) => ({ id: index + 1, ...category }));

/** 가장 최근 메모의 작성 시각. 상대 시각의 기준점이다. */
const NEWEST_CREATED_AT = Math.max(
	...REAL_MEMOS.map((realMemo) => new Date(realMemo.created_at).getTime()),
);

/**
 * 실제 메모 한 건을 목 저장소에 넣을 모양으로 바꾼다.
 * @description 가장 최근 메모가 3분 전이 되도록 전체를 옮기고, 메모 사이 간격은 원래대로 둔다.
 */
const toDemoMemo = (realMemo: IFRealMemo): IFDemoMemo => ({
	url: realMemo.url,
	title: realMemo.title,
	memo: realMemo.memo,
	impression: realMemo.impression,
	actionItem: realMemo.actionItem,
	favIconUrl: realMemo.favIconUrl,
	categoryId:
		REAL_CATEGORIES.find((category) => category.name === realMemo.category)
			?.id ?? null,
	minutesAgo:
		3 +
		Math.round(
			(NEWEST_CREATED_AT - new Date(realMemo.created_at).getTime()) / 60000,
		),
	isWish: realMemo.isWish,
	isStar: realMemo.isStar,
});

/**
 * id로 실제 메모를 찾는다.
 * @throws 목록에 없는 id면 던진다.
 */
const findRealMemo = (id: number) => {
	const realMemo = REAL_MEMOS.find((candidate) => candidate.id === id);

	if (!realMemo) {
		throw new Error(`실제 메모 목록에 없는 id입니다: ${id}`);
	}

	return realMemo;
};

/**
 * 한국어판 시연 데이터.
 * @description 기사(brunch)와 영상(유튜브)은 실제 페이지를 읽기만 한다. 본문을 가리는 요소는 CSS로 숨긴다.
 * · brunch: 표지가 화면 높이만큼 고정돼 제목과 도입 문단이 한 화면에 들어오지 않으므로, 표지와 본문 시작 위치를
 *   함께 320px로 줄인다. 아래로 버튼과 하단 이전·다음 글 막대도 숨긴다.
 * · 유튜브: 광고·추천 영상·댓글·로그인 버튼·팝업을 숨긴다. 재생은 setupDemoRoutes가 자동 재생 차단으로 막아
 *   썸네일이 보이게 한다.
 * 요약은 로컬 웹 서버에 OpenAI 키가 없어 목이다. 영상에 없는 내용을 지어내지 않도록 이 영상 메모(#10716)에
 *   적힌 내용 안에서만 문장을 만들었다.
 */
export const KO_REAL_CONTENT: IFDemoContent = {
	showImpression: true,
	categories: REAL_CATEGORIES,
	articlePage: {
		url: findRealMemo(ARTICLE_MEMO_ID).url,
		tabIconUrl: findRealMemo(ARTICLE_MEMO_ID).favIconUrl,
		tabIconLetter: "b",
		realPage: {
			readySelector: ".wrap_body p",
			style:
				".cover_item { height: 320px !important; } .wrap_body { margin-top: 320px !important; padding-top: 28px !important; } .ico_down, .wrap_page_article { display: none !important; }",
		},
	},
	videoPage: {
		url: findRealMemo(VIDEO_MEMO_ID).url,
		tabIconUrl: findRealMemo(VIDEO_MEMO_ID).favIconUrl,
		tabIconLetter: "▶",
		realPage: {
			readySelector: "ytd-watch-metadata h1",
			style:
				"#secondary, #related, #comments, #player-ads, #masthead-ad, ytd-ad-slot-renderer, .ytp-ad-module, .ytp-ad-overlay-container, tp-yt-paper-dialog, ytd-popup-container, ytd-consent-bump-v2-lightbox, ytd-mealbar-promo-renderer, #masthead #end #buttons { display: none !important; }",
		},
	},
	substituteVideo: null,
	articleMemo: toDemoMemo(findRealMemo(ARTICLE_MEMO_ID)),
	videoMemo: toDemoMemo(findRealMemo(VIDEO_MEMO_ID)),
	otherMemos: REAL_MEMOS.filter(
		(realMemo) =>
			realMemo.id !== ARTICLE_MEMO_ID && realMemo.id !== VIDEO_MEMO_ID,
	).map(toDemoMemo),
	summaryChunks: [
		"한 줄 요약\n",
		"AI를 많이 써 보고 깨달은 것은, 이제 진짜 중요해진 것이 읽기라는 점입니다. 틀린 걸 찾아내고, 더 나은 걸 찾아내 조합해서 산출물로 만들어내는 능력입니다.\n\n",
		"주요 내용\n",
		"- 문해력을 기르는 방법으로 내 분야의 교과서 읽기를 권합니다\n",
		"- 교과서를 읽으면 긴 텍스트를 견디는 힘이 키워지고 배경 지식이 함께 쌓입니다\n",
		"- 교과서의 구조도 전문가가 설계한 것입니다\n",
		"- 책은 선별적으로 읽되, 그러려면 많이 읽어 봐야 합니다",
	],
};

/** 운영 DB에서 조회한 메모 한 건의 모양. */
interface IFRealMemo {
	/** 메모 id */
	id: number;
	/** 페이지 제목 */
	title: string;
	/** 페이지 주소 */
	url: string;
	/** 페이지 favicon 주소 */
	favIconUrl: string | null;
	/** 메모 본문 */
	memo: string;
	/** 느낀 점 */
	impression: string | null;
	/** 액션 아이템 */
	actionItem: string | null;
	/** 중요 표시 여부 */
	isStar: boolean;
	/** 위시리스트 여부 */
	isWish: boolean;
	/** 작성 시각(Postgres timestamptz 문자열) */
	created_at: string;
	/** 카테고리 이름. 없으면 null */
	category: string | null;
	/** 카테고리 색(hex). 없으면 null */
	category_color: string | null;
}
