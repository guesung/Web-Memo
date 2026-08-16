"use server";

import type { LanguageParams } from "@src/modules/i18n";
import { Suspense } from "react";
import { HighlightListSkeleton, HighlightView } from "./_components";

export default async function HighlightsPage({
	params: { lng },
}: LanguageParams) {
	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-6">
			<Suspense fallback={<HighlightListSkeleton />}>
				<HighlightView lng={lng} />
			</Suspense>
		</div>
	);
}
