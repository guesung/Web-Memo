"use server";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { PATHS } from "@web-memo/shared/constants";
import { AuthService } from "@web-memo/shared/utils";
import { redirect } from "next/navigation";

import { LoginSection, PersonalInformationInfo } from "./_components";

export default async function page({ params: { lng } }: LanguageParams) {
	const supabaseClient = getSupabaseClient();
	const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();

	if (isUserLogin) redirect(PATHS.memos);
	return (
		<main className="relative flex h-full items-center justify-center">
			<LoginSection lng={lng} />
			<PersonalInformationInfo lng={lng} />
		</main>
	);
}
