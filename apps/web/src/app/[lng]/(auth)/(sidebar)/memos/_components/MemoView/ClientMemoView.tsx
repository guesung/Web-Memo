"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
	supabaseClientQueryOptions,
	userQueryOptions,
} from "@web-memo/shared/hooks";
import { memosInfiniteQueryOptions } from "@web-memo/shared/utils";
import { useSearchParams } from "next/navigation";
import {
	type ComponentProps,
	type ComponentType,
	useEffect,
	useState,
} from "react";
import { getMemoListQueryParams, getMemoListView } from "../../_utils";
import type MemoViewComponent from "./index";
import { MemoViewSkeleton } from "./MemoListSkeleton";

type TMemoViewProps = ComponentProps<typeof MemoViewComponent>;

/** 한 번 불러온 목록 모듈. 탭을 옮길 때는 스켈레톤 없이 바로 그린다. */
let loadedMemoView: ComponentType<TMemoViewProps> | null = null;

/**
 * 브라우저에서만 렌더하는 메모 목록.
 *
 * @description 메모는 브라우저용 Supabase 클라이언트가 쿠키의 세션으로 불러오므로 서버에서는 스켈레톤만
 * 내보낸다. 예전에는 `next/dynamic`(Suspense)으로 목록을 지연 로딩했는데, 그러면 하이드레이션 때 보인
 * 스켈레톤 뒤로 목록 모듈·Supabase 클라이언트·사용자·메모가 각각 Suspense를 다시 풀었고, React는 폴백을
 * 보인 지 300ms(FALLBACK_THROTTLE_MS)가 지나기 전에는 Suspense 내용을 공개하지 않는다. 운영 트레이스에서
 * 카드는 준비된 뒤 약 220ms를 그 타이머만 기다렸다.
 *
 * 그래서 모듈과 첫 화면에 필요한 쿼리를 미리 다 받아 두고 나서 상태 업데이트로 한 번에 그린다. 상태 업데이트는
 * Suspense 재시도가 아니라서 지연 대상이 아니다. 준비 중 하나가 실패해도 목록은 그대로 그려, 실패 처리는 예전처럼
 * 목록 안의 쿼리가 맡는다.
 */
const ClientMemoView = (props: TMemoViewProps) => {
	const [MemoView, setMemoView] = useState(() => loadedMemoView);
	const queryClient = useQueryClient();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (MemoView) {
			return;
		}

		let isCancelled = false;
		const prepareData = async () => {
			const supabaseClient = await queryClient.ensureQueryData(
				supabaseClientQueryOptions(),
			);
			await Promise.all([
				queryClient.ensureQueryData(userQueryOptions(supabaseClient)),
				// 읽을 계획은 다른 쿼리를 써서 목록 안의 Suspense가 그대로 맡는다.
				props.filter !== "plan" &&
					queryClient.ensureInfiniteQueryData(
						memosInfiniteQueryOptions(
							supabaseClient,
							// 검색어는 폼 상태라 첫 화면에서는 항상 비어 있다. PagedMemoView와 같은 조건이어야 키가 맞는다.
							getMemoListQueryParams({
								filter: props.filter,
								category: searchParams.get("category") ?? "",
								view: getMemoListView(searchParams.get("view")),
								domainParam: searchParams.get("domain"),
								searchQuery: "",
							}),
						),
					),
			]);
		};

		void Promise.all([
			import("./index"),
			prepareData().catch(() => undefined),
		]).then(([module]) => {
			loadedMemoView = module.default;
			if (!isCancelled) {
				setMemoView(() => module.default);
			}
		});

		return () => {
			isCancelled = true;
		};
	}, [MemoView, props.filter, queryClient, searchParams]);

	if (!MemoView) {
		return <MemoViewSkeleton />;
	}

	return <MemoView {...props} />;
};

export default ClientMemoView;
