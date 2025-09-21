"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { SearchParamsType } from "@web-memo/shared/modules/search-params";
import { MemoService } from "@web-memo/shared/utils";
import { Loading, SidebarTrigger } from "@web-memo/ui";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import {
	MemoSearchForm,
	MemoSearchFormProvider,
	MemoView,
} from "./_components";

const ExtensionInstallCheckDialog = dynamic(
	() => import("./_components/ExtensionInstallCheckDialog"),
	{
		ssr: false,
	},
);

interface PageProps extends LanguageParams {
	searchParams: SearchParamsType;
}

export default async function Page({ params: { lng } }: PageProps) {
	const supabaseClient = getSupabaseClient();

	return (
		<main className="h-screen w-screen overflow-y-hidden">
			<HeaderMargin />

			<div className="flex h-full">
				<SidebarTrigger />

				<div className="flex-1 flex flex-col px-4 py-2">
					<HydrationBoundaryWrapper
						queryKey={QUERY_KEY.memos()}
						queryFn={() => new MemoService(supabaseClient).getMemos()}
					>
						<MemoSearchFormProvider>
							<div className="mb-6">
								<MemoSearchForm lng={lng} />
							</div>
							<div className="flex-1 overflow-hidden">
								<Suspense fallback={<Loading />}>
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
