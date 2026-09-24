// 이 파일은 apps/web/scripts/generatePagePaths.mjs가 생성한다. 직접 수정하지 않는다.
// 페이지가 아닌 경로(외부 도메인·route handler 등)는 Path.ts의 MANUAL_PATHS에 둔다.

/** apps/web/src/app/[lng] 아래 page.tsx에서 뽑은 웹 페이지 경로 */
export const GENERATED_PAGE_PATHS = {
	root: "/",
	admin: "/admin",
	adminFeedback: "/admin/feedback",
	adminUsers: "/admin/users",
	compareChromeMemoExtensions: "/compare/chrome-memo-extensions",
	featuresMemo: "/features/memo",
	featuresSaveArticles: "/features/save-articles",
	featuresYoutubeSummary: "/features/youtube-summary",
	highlights: "/highlights",
	introduce: "/introduce",
	login: "/login",
	memos: "/memos",
	memosReading: "/memos/reading",
	memosSetting: "/memos/setting",
	memosStar: "/memos/star",
	memosTrash: "/memos/trash",
	memosWish: "/memos/wish",
	privacy: "/privacy",
	useCasesDeveloper: "/use-cases/developer",
	useCasesJobHunting: "/use-cases/job-hunting",
	useCasesLearning: "/use-cases/learning",
	useCasesNewsReading: "/use-cases/news-reading",
	useCasesResearch: "/use-cases/research",
	useCasesTechArticle: "/use-cases/tech-article",
	useCasesYoutubeNotes: "/use-cases/youtube-notes",
};
