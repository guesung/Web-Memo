"use server";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import {
	signInWithEmail,
	signInWithOAuth,
} from "@src/modules/supabase/util.server";
import { SUPABASE } from "@web-memo/shared/constants";
import { isProduction } from "@web-memo/shared/utils";
import { Button } from "@web-memo/ui";
import { Sparkles } from "lucide-react";
import Image from "next/image";

interface LoginSectionProps extends LanguageType {}

export default async function LoginSection({ lng }: LoginSectionProps) {
	const { t } = await useTranslation(lng);

	return (
		<section className="relative flex flex-col items-center justify-center rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-8 py-10 shadow-2xl border border-gray-200/50 dark:border-gray-800/50 gap-6">
			<div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-3xl opacity-10 blur" />

			<div className="relative flex flex-col items-center gap-4">
				<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
					<Sparkles className="w-8 h-8 text-white" />
				</div>

				<div className="text-center space-y-2">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						{t("login.welcomeTitle")}
					</h1>
					<p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
						{t("login.welcomeDescription")}
					</p>
				</div>
			</div>

			<form className="relative flex w-full flex-col gap-3 mt-2">
				<Button
					formAction={signInWithOAuth.bind(null, "kakao")}
					className="relative h-14 bg-[#FEE500] hover:bg-[#F5DC00] text-gray-900 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] overflow-hidden group"
					data-testid="kakao-login-button"
				>
					<div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-yellow-300/30 to-yellow-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
					<Image
						src="/images/svgs/kakao.svg"
						width={20}
						height={20}
						alt="kakao"
						className="mr-2"
					/>
					{t("login.kakaoLogin")}
				</Button>

				<Button
					formAction={signInWithOAuth.bind(null, "google")}
					className="relative h-14 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-xl border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] overflow-hidden group"
					data-testid="google-login-button"
				>
					<div className="absolute inset-0 bg-gradient-to-r from-gray-100/0 via-gray-200/50 to-gray-100/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
					<Image
						src="/images/svgs/google.svg"
						width={20}
						height={20}
						alt="google"
						className="mr-2"
					/>
					{t("login.googleLogin")}
				</Button>

				{!isProduction() && (
					<Button
						formAction={signInWithEmail.bind(
							null,
							SUPABASE.testEmail,
							SUPABASE.testPassword,
						)}
						className="h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
						data-testid="test-login-button"
					>
						{t("login.testLogin")}
					</Button>
				)}
			</form>
		</section>
	);
}
