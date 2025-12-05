"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import { HeaderMargin } from "@src/components/Header";
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

	return (
		<main className="h-screen w-screen overflow-y-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
			<HeaderMargin />

			<div className="flex h-full">
				<div className="md:hidden absolute top-20 left-4 z-40">
					<SidebarTrigger className="shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 hover:scale-110 active:scale-95" />
				</div>

				<div className="flex-1 flex flex-col px-4 md:px-6 py-4">
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
							<div className="flex-1 overflow-hidden">
								<Suspense fallback={<MemoGridSkeleton />}>
									<MemoView lng={lng} />
								</Suspense>
							</div>
						</MemoSearchFormProvider>
					</HydrationBoundaryWrapper>
				</div>
			</div>
		</main>
	);
}
