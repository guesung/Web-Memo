"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { CategoryService } from "@web-memo/shared/utils";
import type { Metadata } from "next";

import { Setting, SettingHeader } from "./_components";

export async function generateMetadata({
	params,
}: LanguageParams): Promise<Metadata> {
	const isKorean = params.lng === "ko";
	return {
		title: isKorean ? "설정 | 웹 메모" : "Settings | Web Memo",
		robots: {
			index: false,
			follow: false,
		},
	};
}

export default async function Page({ params: { lng } }: LanguageParams) {
	const supabaseClient = getSupabaseClient();

	return (
		<main>
			<HeaderMargin />
			<SettingHeader lng={lng} />
			<HydrationBoundaryWrapper
				queryKey={QUERY_KEY.category()}
				queryFn={new CategoryService(supabaseClient).getCategories}
			>
				<Setting lng={lng} />
			</HydrationBoundaryWrapper>
		</main>
	);
}
