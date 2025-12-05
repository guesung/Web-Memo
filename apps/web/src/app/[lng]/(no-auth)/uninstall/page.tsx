import type { LanguageParams } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Coffee, Gift } from "lucide-react";

import { UninstallFeedbackForm } from "./_components";

export async function generateMetadata({ params }: LanguageParams) {
	const isKorean = params.lng === "ko";
	return {
		title: isKorean
			? "웹 메모를 삭제하셨군요 | 피드백을 남겨주세요"
			: "You uninstalled Web Memo | Share your feedback",
		description: isKorean
			? "소중한 의견을 남겨주시면 스타벅스 기프티콘을 드립니다"
			: "Share your feedback and receive a Starbucks gift card",
	};
}

interface UninstallPageProps extends LanguageParams {}

export default async function UninstallPage({
	params: { lng },
}: UninstallPageProps) {
	const { t } = await useTranslation(lng);

	return (
		<main className="relative flex min-h-screen items-center justify-center overflow-hidden py-12 px-4">
			<div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950" />

			<div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/50 dark:bg-purple-500/10 rounded-full blur-3xl" />
			<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/50 dark:bg-blue-500/10 rounded-full blur-3xl" />

			<div className="relative z-10 w-full max-w-lg">
				<section className="relative flex flex-col rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-8 py-10 shadow-2xl border border-gray-200/50 dark:border-gray-800/50 gap-8">
					<div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-3xl opacity-10 blur" />

					<div className="relative flex flex-col items-center gap-4 text-center">
						<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
							<Coffee className="w-8 h-8 text-white" />
						</div>

						<div className="space-y-3">
							<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
								{t("uninstall.title")}
							</h1>
							<p className="text-gray-600 dark:text-gray-400">
								{t("uninstall.description")}
							</p>
						</div>

						<div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full border border-amber-200 dark:border-amber-700">
							<Gift className="w-5 h-5 text-amber-600 dark:text-amber-400" />
							<span className="text-sm font-medium text-amber-700 dark:text-amber-300">
								{t("uninstall.reward")}
							</span>
						</div>
					</div>

					<div className="relative">
						<UninstallFeedbackForm lng={lng} />
					</div>
				</section>
			</div>
		</main>
	);
}
