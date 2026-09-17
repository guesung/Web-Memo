"use client";

import { PATHS } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * 지금 보고 있는 뷰의 이름을 정합니다.
 * @description 사이드바 탭은 searchParams만 바꾸는 같은 라우트 전환이라 경로만으로는
 * 구분되지 않습니다. 어느 뷰를 실제로 쓰는지가 기능 존폐 판단의 근거라 따로 가릅니다.
 */
function resolveViewName(pathname: string, searchParams: URLSearchParams) {
	if (pathname.endsWith(PATHS.highlights)) return "highlights";
	if (pathname.endsWith(PATHS.memosTrash)) return "trash";
	if (pathname.endsWith(PATHS.memosSetting)) return "setting";

	if (searchParams.get("isWish") === "true") return "wish";
	if (searchParams.get("isStar") === "true") return "star";
	if (searchParams.get("isReading") === "true") return "reading";
	if (searchParams.get("category")) return "category";

	return "all";
}

/**
 * 뷰 전환을 기록합니다.
 * @description 사이드바를 눌러 들어온 것뿐 아니라 주소로 바로 들어온 것도 잡힙니다.
 * MemoSidebar가 서버 컴포넌트라 링크에 핸들러를 달 수 없기도 하고, 도착 쪽에서 재는
 * 편이 실제로 그 화면을 본 횟수에 더 가깝습니다.
 */
export default function TrackViewChange() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		analytics.trackEvent({
			name: "view_change",
			params: { view: resolveViewName(pathname, searchParams) },
		});
	}, [pathname, searchParams]);

	return null;
}
