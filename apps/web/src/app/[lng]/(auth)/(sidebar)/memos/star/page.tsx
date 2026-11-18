"use server";

import type { LanguageParams } from "@src/modules/i18n";
import { getSidebarPageMetadata } from "../../_utils";
import { MemoPage } from "../_components";
import type { IFMemoPageParams } from "../_types";

export async function generateMetadata({ params }: LanguageParams) {
	return getSidebarPageMetadata({ params, labelKey: "sideBar.importantMemo" });
}

export default async function Page({ params, searchParams }: IFMemoPageParams) {
	const { lng } = await params;

	return <MemoPage lng={lng} filter="star" searchParams={searchParams} />;
}
