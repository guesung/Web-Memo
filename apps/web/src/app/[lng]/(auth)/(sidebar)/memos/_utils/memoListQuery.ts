import type { IFMemosInfiniteQueryParams } from "@web-memo/shared/utils/services";
import { parseDomainFilter } from "@web-memo/shared/utils/url";
import type { TMemoFilter } from "../_types";

/** 메모 목록의 보기 방식. */
export type TMemoListView = "grid" | "list" | "domain";

/** 쿼리의 보기 값. 작성일별(list)·도메인별(domain) 외에는 카드 보기(grid)로 본다. */
export function getMemoListView(
	view: string | null | undefined,
): TMemoListView {
	return view === "list" || view === "domain" ? view : "grid";
}

/**
 * 라우트 필터와 URL 조건을 메모 목록 조회 조건으로 바꾼다.
 *
 * @description 서버 prefetch와 클라이언트 목록이 이 함수 하나로 조건을 만든다. 둘이 조금이라도
 * 다르면 queryKey가 갈라져 서버에서 시작한 조회를 버리고 브라우저가 다시 요청한다.
 * 위시 탭만 위시 메모를 보여주고, 그 외 탭(별표·읽는 중 포함)은 위시 메모를 제외한다.
 */
export function getMemoListQueryParams({
	filter,
	category,
	view,
	domainParam,
	searchQuery,
}: {
	filter: Exclude<TMemoFilter, "plan">;
	category: string;
	view: TMemoListView;
	domainParam: string | null | undefined;
	searchQuery: string;
}): IFMemosInfiniteQueryParams {
	return {
		category,
		sortBy: view === "list" ? "created_at" : "updated_at",
		isWish: filter === "wish",
		isStar: filter === "star" ? true : undefined,
		isReading: filter === "reading" ? true : undefined,
		searchQuery: searchQuery || undefined,
		domain: parseDomainFilter(domainParam),
	};
}
