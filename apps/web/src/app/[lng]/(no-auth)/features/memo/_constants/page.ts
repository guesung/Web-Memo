import {
	CheckCircle,
	Cloud,
	FolderOpen,
	Keyboard,
	PanelRight,
	Pencil,
	Search,
} from "lucide-react";
import type { TLandingPageConfig } from "../../../_components";

/**
 * features/memo 소개 페이지 구성.
 * @description
 * 문구는 전부 번역 키에 있고, 여기서는 어떤 항목을 어떤 아이콘으로 어떤 순서에 두는지만
 * 정한다. 화면을 그리는 일은 `LandingPageTemplate`이 한다.
 */
export const MEMO_PAGE: TLandingPageConfig = {
	pageKey: "featuresMemo",
	screenshotNumber: 2,
	benefits: [
		{ key: "shortcut", icon: Keyboard },
		{ key: "organize", icon: FolderOpen },
		{ key: "sync", icon: Cloud },
		{ key: "search", icon: Search },
	],
	steps: [
		{ key: "step1", icon: PanelRight },
		{ key: "step2", icon: Pencil },
		{ key: "step3", icon: CheckCircle },
	],
	relatedKeys: [
		"useCasesNewsReading",
		"useCasesResearch",
		"featuresSaveArticles",
	],
};
