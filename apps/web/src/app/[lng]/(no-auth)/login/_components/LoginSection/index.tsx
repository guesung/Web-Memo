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

import LoginProviderButtons, {
	type TLoginProvider,
} from "../LoginProviderButtons";
import PersonalInformationInfo from "../PersonalInformationInfo";
import TrackLoginStartForm from "../TrackLoginStartForm";

export default async function LoginSection({ lng }: IFLoginSectionProps) {
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
				<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
					<Sparkles className="h-6 w-6 text-primary-foreground" />
				</div>

				<h1 className="text-2xl font-bold text-foreground">
					{t("login.welcomeTitle")}
				</h1>
				<p className="text-sm text-muted-foreground">
					{t("login.welcomeDescription")}
				</p>
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
}

/** LoginSection의 props입니다. */
interface IFLoginSectionProps extends LanguageType {}
