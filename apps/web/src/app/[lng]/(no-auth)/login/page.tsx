"use server";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { PATHS } from "@web-memo/shared/constants";
import { AuthService } from "@web-memo/shared/utils";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginSection, PersonalInformationInfo } from "./_components";

export async function generateMetadata({
	params,
}: LanguageParams): Promise<Metadata> {
	const isKorean = params.lng === "ko";
	return {
		title: isKorean ? "로그인 | 웹 메모" : "Login | Web Memo",
		description: isKorean
			? "웹 메모에 로그인하여 모든 기기에서 메모를 동기화하세요."
			: "Sign in to Web Memo and sync your memos across all devices.",
		openGraph: {
			title: isKorean ? "로그인 | 웹 메모" : "Login | Web Memo",
			description: isKorean
				? "웹 메모에 로그인하여 모든 기기에서 메모를 동기화하세요."
				: "Sign in to Web Memo and sync your memos across all devices.",
			images: [
				{
					url: "/og-image.png",
					width: 1200,
					height: 630,
					alt: isKorean
						? "웹 메모 로그인"
						: "Web Memo Login",
				},
			],
		},
	};
}

export default async function page({ params: { lng } }: LanguageParams) {
	const supabaseClient = getSupabaseClient();
	const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();

	if (isUserLogin) redirect(PATHS.memos);
	return (
		<main className="relative flex h-full min-h-screen items-center justify-center overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950" />

			<div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/50 dark:bg-purple-500/10 rounded-full blur-3xl" />
			<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/50 dark:bg-blue-500/10 rounded-full blur-3xl" />

			<div className="relative z-10 w-full max-w-md px-4">
				<LoginSection lng={lng} />
			</div>

			<PersonalInformationInfo lng={lng} />
		</main>
	);
}
