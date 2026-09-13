"use server";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { PATHS } from "@web-memo/shared/constants";
import { AuthService } from "@web-memo/shared/utils";
import { Separator } from "@web-memo/ui";
import { redirect } from "next/navigation";

import { LoginAside, LoginErrorAlert, LoginSection } from "./_components";

export default async function page({
	params: { lng },
	searchParams,
}: IFPageProps) {
	const supabaseClient = getSupabaseClient();
	const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();

	if (isUserLogin) redirect(`/${lng}${PATHS.memos}`);

	const hasLoginError = Boolean(searchParams.error);

	return (
		<main className="relative min-h-screen">
			<div className="absolute inset-0 gradient-mesh dark:gradient-mesh-dark opacity-5" />

			<div className="relative z-10 grid min-h-screen lg:grid-cols-2">
				<div className="flex items-center justify-center px-4 py-12">
					<div className="flex w-full max-w-sm flex-col gap-6">
						{hasLoginError && <LoginErrorAlert lng={lng} />}
						<LoginSection lng={lng} />
					</div>
				</div>

				<div className="flex items-center justify-center bg-muted/40 px-4 pb-12 lg:px-12 lg:py-12">
					<div className="w-full max-w-md">
						<Separator className="mb-8 lg:hidden" />
						<LoginAside lng={lng} />
					</div>
				</div>
			</div>
		</main>
	);
}

/** 로그인 페이지의 props입니다. */
interface IFPageProps extends LanguageParams {
	/** OAuth 콜백이 실패로 돌아왔는지 알려주는 쿼리. 값 자체는 화면에 노출하지 않습니다 */
	searchParams: { error?: string };
}
