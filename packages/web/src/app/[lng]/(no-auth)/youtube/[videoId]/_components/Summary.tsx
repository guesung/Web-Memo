import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { FileText } from "lucide-react";

interface SummaryProps extends LanguageType {
	summary: string;
}

export default async function Summary({ lng, summary }: SummaryProps) {
	const { t } = await useTranslation(lng);

	return (
		<section className="mb-8">
			<div className="flex items-center gap-2 mb-4">
				<FileText className="h-5 w-5 text-red-500" />
				<h2 className="text-xl font-semibold text-gray-900">
					{t("youtube.summary.title")}
				</h2>
			</div>
			<div className="rounded-xl bg-gray-50 p-6">
				<div className="prose prose-gray max-w-none">
					{summary.split("\n").map((paragraph, index) => (
						<p key={index} className="mb-4 last:mb-0 text-gray-700 leading-relaxed">
							{paragraph}
						</p>
					))}
				</div>
			</div>
		</section>
	);
}
