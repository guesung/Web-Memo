import { useSearchParams } from "next/navigation";
import { useFormContext } from "react-hook-form";
import type { SearchFormValues } from "../../MemoSearchFormProvider";

/** 목록을 거르는 카테고리·검색어와 보기 방식. 카테고리·보기는 쿼리, 검색어는 검색 폼이 출처다. */
export default function useMemoSearchConditions() {
	const { watch } = useFormContext<SearchFormValues>();
	const searchParams = useSearchParams();
	const view = getMemoListView(searchParams.get("view"));

	return {
		// 카테고리는 사이드바 하단에서 고르는 가로지르는 조건이라 필터와 달리 쿼리로 남는다.
		category: searchParams.get("category") ?? "",
		view,
		isListView: view !== "grid",
		searchQuery: watch("searchQuery"),
	};
}

/** 쿼리의 보기 값. 작성일별(list)·도메인별(domain) 외에는 카드 보기(grid)로 본다. */
function getMemoListView(view: string | null): "grid" | "list" | "domain" {
	return view === "list" || view === "domain" ? view : "grid";
}
