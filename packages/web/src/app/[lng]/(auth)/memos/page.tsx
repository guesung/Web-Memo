"use server";

import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import type { SearchParamsType } from "@web-memo/shared/modules/search-params";
import { Loading, SidebarTrigger } from "@web-memo/ui";
import { Suspense } from "react";

import {
	MemoSearchForm,
	MemoSearchFormProvider,
	MemoView,
} from "./_components";

interface PageProps extends LanguageParams {
	searchParams: SearchParamsType;
}

export default async function Page({ params: { lng } }: PageProps) {
	return (
		<main className="h-screen w-screen overflow-y-hidden">
			<HeaderMargin />

			<div className="flex h-full">
				<SidebarTrigger />

				<div className="flex-1 flex flex-col px-4 py-2">
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
				</div>
			</div>
		</main>
	);
}
