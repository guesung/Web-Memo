import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@web-memo/ui";
import { Check, FileText, Sparkles } from "lucide-react";
import Link from "next/link";

/** 메모 보존 원칙과 AI 제한을 함께 설명하는 요금제 비교입니다. */
export const PricingCards = async (props: LanguageType) => {
	const { t } = await useTranslation(props.lng);

	return (
		<main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-24 text-foreground">
			<h1 className="text-3xl font-semibold">{t("billing.pricingTitle")}</h1>
			<p className="mt-3 text-muted-foreground">{t("billing.preservation")}</p>
			<div className="mt-8 grid gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<FileText aria-hidden="true" className="size-6 text-primary" />
						<CardTitle>{t("billing.free")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-3xl font-semibold">{t("billing.freePrice")}</p>
						<p>{t("billing.freeLimit")}</p>
						<p className="text-sm text-muted-foreground">
							{t("billing.trashIncluded")}
						</p>
						<Button asChild variant="outline" className="w-full">
							<Link href={`/${props.lng}/memos`}>{t("billing.openMemos")}</Link>
						</Button>
					</CardContent>
				</Card>
				<Card className="border-primary">
					<CardHeader>
						<Sparkles aria-hidden="true" className="size-6 text-primary" />
						<CardTitle>{t("billing.paid")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-3xl font-semibold">{t("billing.price")}</p>
						<ul className="space-y-3">
							{["unlimitedMemos", "aiFeatures"].map((key) => (
								<li key={key} className="flex gap-2">
									<Check
										aria-hidden="true"
										className="size-4 shrink-0 text-primary"
									/>
									<span>{t(`billing.${key}`)}</span>
								</li>
							))}
						</ul>
						<p className="text-sm text-muted-foreground">
							{t("billing.aiLimitDescription")}
						</p>
						<Button asChild className="w-full">
							<Link href={`/${props.lng}/billing`}>{t("billing.manage")}</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
			<section className="mt-8 space-y-3 rounded-lg border p-4 text-sm">
				<h2 className="font-semibold">{t("billing.beforeSubscribe")}</h2>
				<p>{t("billing.renewalTerms")}</p>
				<p>{t("billing.sourceScope")}</p>
				<p>{t("billing.localPreserved")}</p>
			</section>
		</main>
	);
};
