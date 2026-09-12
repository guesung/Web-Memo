import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { BookmarkPlus, Download, PanelRightOpen } from "lucide-react";
import SectionHeader from "../SectionHeader";
import SectionShell, { type TSectionBackground } from "../SectionShell";
import HowToJsonLD from "./HowToJsonLD";

/**
 * 시작하는 3단계.
 * @description
 * 원형 아이콘 리듬 — 단계마다 같은 크기의 원을 쓰고 번호만 다르다. 단계를 잇는
 * 선을 그리지 않는다. 세 원이 같은 간격으로 놓이면 순서는 이미 읽힌다.
 */

interface HowItWorksProps extends LanguageType {
	background?: TSectionBackground;
}

export default async function HowItWorks({ lng, background }: HowItWorksProps) {
	const { t } = await useTranslation(lng);

	const steps = [
		{
			number: 1,
			icon: Download,
			title: t("introduce.steps.step1_title"),
			description: t("introduce.steps.step1_desc"),
		},
		{
			number: 2,
			icon: PanelRightOpen,
			title: t("introduce.steps.step2_title"),
			description: t("introduce.steps.step2_desc"),
		},
		{
			number: 3,
			icon: BookmarkPlus,
			title: t("introduce.steps.step3_title"),
			description: t("introduce.steps.step3_desc"),
		},
	];

	return (
		<SectionShell background={background}>
			<HowToJsonLD lng={lng} />

			<SectionHeader
				title={t("introduce.section.how_it_works")}
				description={t("introduce.section.how_it_works_desc")}
			/>

			<ol className="grid gap-12 sm:grid-cols-3">
				{steps.map((step) => (
					<li
						key={step.number}
						className="flex flex-col items-center text-center"
					>
						<span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-border">
							<step.icon className="h-8 w-8" />
							<span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-sm">
								{step.number}
							</span>
						</span>

						<h3 className="mt-6 text-xl tracking-[-0.015em]">{step.title}</h3>

						<p className="mt-3 max-w-xs leading-relaxed text-muted-foreground">
							{step.description}
						</p>
					</li>
				))}
			</ol>
		</SectionShell>
	);
}
