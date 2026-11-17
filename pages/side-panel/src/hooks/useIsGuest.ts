import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memoStoreQueryOptions } from "@web-memo/shared/hooks";

/**
 * 지금 패널이 비로그인(기기 저장소)으로 동작 중인지 반환한다.
 * @description Suspense 없이 읽는다. 저장소를 고르는 중이거나 고르지 못했으면 `false`라서,
 * 로그인 안내(버튼·배너)는 비로그인이 확인된 뒤에만 나타난다.
 */
export default function useIsGuest() {
	const queryClient = useQueryClient();
	const { data: memoStoreKind } = useQuery({
		...memoStoreQueryOptions(queryClient),
		// 저장소 인스턴스가 다시 만들어져도 종류만 비교해 리렌더를 일으키지 않는다.
		select: (memoStore) => memoStore.kind,
	});

	return memoStoreKind === "local";
}
