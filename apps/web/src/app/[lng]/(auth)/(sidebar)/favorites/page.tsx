"use server";

import type { LanguageParams } from "@src/modules/i18n";
import { Suspense } from "react";
import { getSidebarPageMetadata } from "../_utils";
import { FavoriteListSkeleton, FavoriteView } from "./_components";

export async function generateMetadata({ params }: LanguageParams) {
	return getSidebarPageMetadata({ params, labelKey: "sideBar.favorite" });
}

export default async function FavoritesPage({ params }: LanguageParams) {
	const { lng } = await params;

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-6">
			<Suspense fallback={<FavoriteListSkeleton />}>
				<FavoriteView lng={lng} />
			</Suspense>
		</div>
	);
}
