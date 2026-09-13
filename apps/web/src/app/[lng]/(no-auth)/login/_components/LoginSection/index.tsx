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

import LoginProviderButtons, {
	type TLoginProvider,
} from "../LoginProviderButtons";
import PersonalInformationInfo from "../PersonalInformationInfo";
import TrackLoginStartForm from "../TrackLoginStartForm";

/** 웹 메모 소개와 로그인 제공자 버튼을 표시합니다. */
const LoginSection = async ({ lng }: IFLoginSectionProps) => {
	const { t } = await useTranslation(lng);

	const providers: TLoginProvider[] = [
		{
			id: "kakao",
			label: t("login.kakaoLogin"),
			pendingLabel: t("login.providerPending", {
				provider: t("login.providerName.kakao"),
			}),
			signIn: signInWithOAuth.bind(null, "kakao"),
		},
		{
			id: "google",
			label: t("login.googleLogin"),
			pendingLabel: t("login.providerPending", {
				provider: t("login.providerName.google"),
			}),
			signIn: signInWithOAuth.bind(null, "google"),
		},
		{
			id: "apple",
			label: t("login.appleLogin"),
			pendingLabel: t("login.providerPending", {
				provider: t("login.providerName.apple"),
			}),
			signIn: signInWithOAuth.bind(null, "apple"),
		},
	];

	return (
		<section className="flex flex-col gap-6 rounded-2xl border border-border bg-card px-6 py-8 shadow-sm">
			<div className="flex flex-col gap-3">
				<Image
					src="/images/pngs/icon.png"
					width={48}
					height={48}
					alt={t("common.webMemo")}
					className="rounded-2xl"
				/>

				<h1 className="text-2xl font-bold text-foreground">
					{t("login.welcomeTitle")}
				</h1>
			</div>

			<TrackLoginStartForm className="flex w-full flex-col gap-3">
				<LoginProviderButtons providers={providers} />

				{!isProduction() && (
					<Button
						formAction={signInWithEmail.bind(
							null,
							SUPABASE.testEmail,
							SUPABASE.testPassword,
						)}
						data-login-method="email"
						data-testid="test-login-button"
						variant="outline"
						className="h-12 rounded-xl"
					>
						{t("login.testLogin")}
					</Button>
				)}
			</TrackLoginStartForm>

			<PersonalInformationInfo lng={lng} />
		</section>
	);
};

export default LoginSection;

/** LoginSection의 props입니다. */
interface IFLoginSectionProps extends LanguageType {}
