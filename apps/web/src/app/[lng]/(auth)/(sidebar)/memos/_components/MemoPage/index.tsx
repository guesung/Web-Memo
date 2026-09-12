"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import type { LanguageType } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { MemoService } from "@web-memo/shared/utils";
import { SidebarTrigger } from "@web-memo/ui";
import { Suspense } from "react";

import type { TMemoFilter } from "../../_types";
import MemoSearchForm from "../MemoSearchForm";
import MemoSearchFormProvider from "../MemoSearchFormProvider";
import MemoView from "../MemoView";
import { MemoGridSkeleton } from "../MemoView/MemoGrid";

interface IFMemoPageProps extends LanguageType {
	/** 이 화면이 보여줄 메모의 범위. 넘기지 않으면 전체를 본다 */
	filter?: TMemoFilter;
}

/**
 * 메모 목록 화면의 본체.
 *
 * @description `/memos`와 `/memos/{wish,star,reading}`이 같은 화면을 쓴다. 필터만 라우트가
 * 정하고 나머지는 전부 같으므로, 라우트마다 화면을 따로 두지 않고 이 컴포넌트를 공유한다.
 */
export default async function MemoPage({
	lng,
	filter = "all",
}: IFMemoPageProps) {
	const supabaseClient = getSupabaseClient();

	// 헤더 여백(HeaderMargin, 4rem)은 layout이 이미 넣는다. 100vh를 그대로 쓰면
	// 그만큼 문서가 길어져 내용이 짧아도 스크롤이 생긴다.
	return (
		<div className="min-h-[calc(100vh-4rem)]">
			<div className="md:hidden fixed top-20 left-4 z-40">
				<SidebarTrigger className="shadow-lg shadow-primary/10 hover:shadow-primary/20 bg-card border border-border hover:border-primary/50 transition-all duration-200 hover:scale-110 active:scale-95" />
			</div>

			<div className="flex flex-col px-4 md:px-6 py-4">
				<HydrationBoundaryWrapper
					queryKey={QUERY_KEY.memos()}
					queryFn={() =>
						new MemoService(supabaseClient).getMemosPaginated({
							limit: 20,
							sortBy: "updated_at",
						})
					}
				>
					<MemoSearchFormProvider>
						<div className="mb-6">
							<MemoSearchForm lng={lng} />
						</div>
						<Suspense fallback={<MemoGridSkeleton />}>
							<MemoView lng={lng} filter={filter} />
						</Suspense>
					</MemoSearchFormProvider>
				</HydrationBoundaryWrapper>
			</div>
		</div>
	);
}
