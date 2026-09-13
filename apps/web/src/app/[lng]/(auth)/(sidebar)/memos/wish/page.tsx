"use server";

import type { LanguageParams } from "@src/modules/i18n";

import { MemoPage } from "../_components";

export default async function Page({ params: { lng } }: LanguageParams) {
	return <MemoPage lng={lng} filter="wish" />;
}
