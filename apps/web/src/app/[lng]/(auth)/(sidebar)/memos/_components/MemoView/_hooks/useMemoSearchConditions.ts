import { useSearchParams } from "next/navigation";
import { useFormContext } from "react-hook-form";
import type { SearchFormValues } from "../../MemoSearchFormProvider";

/** 목록을 거르는 카테고리·도메인·검색어와 보기 방식. 카테고리·도메인·보기는 쿼리, 검색어는 검색 폼이 출처다. */
export default function useMemoSearchConditions() {
	const { watch } = useFormContext<SearchFormValues>();
	const searchParams = useSearchParams();

	return {
		// 카테고리는 사이드바 하단에서 고르는 가로지르는 조건이라 필터와 달리 쿼리로 남는다.
		category: searchParams.get("category") ?? "",
		isListView: searchParams.get("view") === "list",
		/** 정규화 전 `?domain` 원문 */
		domainParam: searchParams.get("domain"),
		searchQuery: watch("searchQuery"),
	};
}
