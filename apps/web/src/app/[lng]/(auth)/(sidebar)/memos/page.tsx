"use server";

import type { LanguageParams } from "@src/modules/i18n";
import { getSidebarPageMetadata } from "../_utils";

import { MemoPage } from "./_components";

export async function generateMetadata({ params }: LanguageParams) {
	return getSidebarPageMetadata({ params, labelKey: "sideBar.memo" });
}

export default async function Page({ params }: LanguageParams) {
	const { lng } = await params;

	return <MemoPage lng={lng} />;
}
