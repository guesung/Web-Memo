"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { SearchParamsType } from "@web-memo/shared/modules/search-params";
import { MemoService } from "@web-memo/shared/utils";
import { SidebarTrigger } from "@web-memo/ui";
import { Suspense } from "react";

import {
	MemoGridSkeleton,
	MemoSearchForm,
	MemoSearchFormProvider,
	MemoView,
} from "./_components";

interface PageProps extends LanguageParams {
	searchParams: SearchParamsType;
}

export default async function Page({ params: { lng } }: PageProps) {
	const supabaseClient = getSupabaseClient();

	// 헤더 여백(HeaderMargin, 4rem)은 layout이 이미 넣는다. 100vh를 그대로 쓰면
	// 그만큼 문서가 길어져 내용이 짧아도 스크롤이 생긴다.
	return (
		<div className="min-h-[calc(100vh-4rem)]">
			<div className="md:hidden fixed top-20 left-4 z-40">
				<SidebarTrigger className="shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 bg-card border border-border hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 hover:scale-110 active:scale-95" />
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
							<MemoView lng={lng} />
						</Suspense>
					</MemoSearchFormProvider>
				</HydrationBoundaryWrapper>
			</div>
		</div>
	);
}
