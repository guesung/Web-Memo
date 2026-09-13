"use server";

import { HydrationBoundaryWrapper } from "@src/components";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { MemoService } from "@web-memo/shared/utils";

import { Trash } from "./_components";

export default async function Page({ params: { lng } }: LanguageParams) {
	const supabaseClient = getSupabaseClient();

	return (
		<div className="flex flex-col px-4 md:px-6 py-4">
			<HydrationBoundaryWrapper
				queryKey={QUERY_KEY.deletedMemos()}
				queryFn={async () => {
					const { data } = await new MemoService(
						supabaseClient,
					).getDeletedMemos();

					return (data ?? []) as GetMemoResponse[];
				}}
			>
				<Trash lng={lng} />
			</HydrationBoundaryWrapper>
		</div>
	);
}
