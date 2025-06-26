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
import Image from "next/image";

interface LoginSectionProps extends LanguageType {}

export default async function LoginSection({ lng }: LoginSectionProps) {
	const { t } = await useTranslation(lng);

	return (
		<section className="relative flex flex-col items-center justify-center rounded-md bg-zinc-100 px-8 py-12 opacity-80 shadow-xl dark:bg-zinc-900">
			<p className="text-center text-2xl">{t("login.welcomeTitle")}</p>
			<p className="text-md text-center">{t("login.welcomeDescription")}</p>
			<div className="h-8" />
			<form className="flex w-full flex-col gap-4 px-4">
				<Button
					formAction={signInWithOAuth.bind(null, "kakao")}
					className="h-12 bg-[rgb(247,228,76)] text-black hover:bg-[rgb(247,228,76)]"
				>
					<Image
						src="/images/svgs/kakao.svg"
						width={16}
						height={16}
						alt="kakao"
					/>
					{t("login.kakaoLogin")}
				</Button>
				<Button
					formAction={signInWithOAuth.bind(null, "google")}
					className="h-12 bg-white text-black hover:bg-white"
				>
					<Image
						src="/images/svgs/google.svg"
						width={16}
						height={16}
						alt="google"
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
						className="h-12 bg-green-300 text-black hover:bg-green-300"
					>
						{t("login.testLogin")}
					</Button>
				)}
			</form>
		</section>
	);
}
