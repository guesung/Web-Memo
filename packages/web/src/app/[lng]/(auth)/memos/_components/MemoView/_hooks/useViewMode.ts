"use client";

import { useSearchParams } from "@web-memo/shared/modules/search-params";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

export type ViewMode = "grid" | "list";

const VIEW_MODE_KEY = "view";
const DEFAULT_VIEW_MODE: ViewMode = "grid";

export function useViewMode() {
	const searchParams = useSearchParams();
	const router = useRouter();

	const viewMode = useMemo<ViewMode>(() => {
		const param = searchParams.get(VIEW_MODE_KEY);
		if (param === "list") return "list";
		return DEFAULT_VIEW_MODE;
	}, [searchParams]);

	const setViewMode = useCallback(
		(mode: ViewMode) => {
			if (mode === DEFAULT_VIEW_MODE) {
				searchParams.removeAll(VIEW_MODE_KEY);
			} else {
				searchParams.set(VIEW_MODE_KEY, mode);
			}
			router.replace(searchParams.getUrl(), { scroll: false });
		},
		[searchParams, router],
	);

	return { viewMode, setViewMode };
}
