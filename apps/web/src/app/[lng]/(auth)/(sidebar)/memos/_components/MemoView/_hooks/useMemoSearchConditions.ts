import { parseDomainFilter } from "@web-memo/shared/utils";
import { useSearchParams } from "next/navigation";
import { useFormContext } from "react-hook-form";
import type { SearchFormValues } from "../../MemoSearchFormProvider";

/** 목록을 거르는 카테고리·도메인·검색어와 보기 방식. 카테고리·도메인·보기는 쿼리, 검색어는 검색 폼이 출처다. */
export default function useMemoSearchConditions() {
	const { watch } = useFormContext<SearchFormValues>();
	const searchParams = useSearchParams();
	const view = searchParams.get("view");

	return {
		// 카테고리는 사이드바 하단에서 고르는 가로지르는 조건이라 필터와 달리 쿼리로 남는다.
		category: searchParams.get("category") ?? "",
		/** 쿼리의 보기 값. 작성일별은 `list`, 도메인별은 `domain`, 나머지는 카드 */
		view,
		/** 작성일별·도메인별처럼 그룹 목록으로 보여주는지 */
		isListView: view === "list" || view === "domain",
		domain: parseDomainFilter(searchParams.get("domain")),
		searchQuery: watch("searchQuery"),
	};
}
