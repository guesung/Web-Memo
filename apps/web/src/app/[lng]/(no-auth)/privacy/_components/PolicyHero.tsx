import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { ShieldCheck } from "lucide-react";
import { toStringArray } from "../_utils";

/** 방침 페이지 상단의 제목·시행일·핵심 요약 영역 */
export default async function PolicyHero({ lng }: PolicyHeroProps) {
	const { t } = await useTranslation(lng);

	const summaryItems = toStringArray(
		t("privacy.summary.items", { returnObjects: true }),
	);

	return (
		<header className="mb-12">
			<h1 className="mb-3 font-bold text-3xl text-foreground sm:text-4xl">
				{t("privacy.title")}
			</h1>
			<p className="mb-4 text-muted-foreground">{t("privacy.subtitle")}</p>

			<dl className="mb-8 flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground text-sm">
				<div className="flex gap-2">
					<dt>{t("privacy.effective_label")}</dt>
					<dd className="text-foreground">{t("privacy.effective_date")}</dd>
				</div>
				<div className="flex gap-2">
					<dt>{t("privacy.updated_label")}</dt>
					<dd className="text-foreground">{t("privacy.updated_date")}</dd>
				</div>
			</dl>

			<section className="rounded-lg border border-border bg-muted/40 p-6">
				<h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground text-lg">
					<ShieldCheck className="h-5 w-5 text-emerald-600" />
					{t("privacy.summary.title")}
				</h2>
				<ul className="space-y-2">
					{summaryItems.map((summaryItem) => (
						<li
							key={summaryItem}
							className="flex gap-2 text-muted-foreground text-sm leading-relaxed"
						>
							<span aria-hidden="true">·</span>
							<span>{summaryItem}</span>
						</li>
					))}
				</ul>
			</section>
		</header>
	);
}

interface PolicyHeroProps extends LanguageType {}
