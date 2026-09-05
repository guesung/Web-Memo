"use server";

import type { LanguageParams } from "@src/modules/i18n";

import { Trash, TrashHeader } from "./_components";

export default async function Page({ params: { lng } }: LanguageParams) {
	return (
		<div className="px-4 md:px-6">
			<TrashHeader lng={lng} />
			<Trash lng={lng} />
		</div>
	);
}
