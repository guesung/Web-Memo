import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { PATHS } from "@web-memo/shared/constants";
import {
	ArrowRight,
	Briefcase,
	GraduationCap,
	Newspaper,
	Search,
	Youtube,
} from "lucide-react";
import Link from "next/link";
import SectionHeader from "../SectionHeader";
import SectionShell, { type TSectionBackground } from "../SectionShell";

/**
 * 쓰임새 목록.
 * @description
 * 다섯 개를 카드 그리드로 두면 마지막 줄이 비어 균형이 깨지고, 카드마다 눈이
 * 다시 출발한다. 한 줄에 하나씩 놓는 리스트가 훑기에도 빠르다.
 */

interface UseCasesProps extends LanguageType {
	background?: TSectionBackground;
}

export default async function UseCases({ lng, background }: UseCasesProps) {
	const { t } = await useTranslation(lng);

	const useCases = [
		{
			icon: GraduationCap,
			title: t("introduce.use_case.student_title"),
			description: t("introduce.use_case.student_desc"),
			href: `/${lng}${PATHS.useCasesLearning}`,
		},
		{
			icon: Search,
			title: t("introduce.use_case.professional_title"),
			description: t("introduce.use_case.professional_desc"),
			href: `/${lng}${PATHS.useCasesResearch}`,
		},
		{
			icon: Briefcase,
			title: t("introduce.use_case.job_hunting_title"),
			description: t("introduce.use_case.job_hunting_desc"),
			href: `/${lng}${PATHS.useCasesJobHunting}`,
		},
		{
			icon: Newspaper,
			title: t("introduce.use_case.news_reading_title"),
			description: t("introduce.use_case.news_reading_desc"),
			href: `/${lng}${PATHS.useCasesNewsReading}`,
		},
		{
			icon: Youtube,
			title: t("introduce.use_case.youtube_notes_title"),
			description: t("introduce.use_case.youtube_notes_desc"),
			href: `/${lng}${PATHS.useCasesYoutubeNotes}`,
		},
	];

	return (
		<SectionShell background={background}>
			<SectionHeader
				title={t("introduce.section.use_cases")}
				description={t("introduce.section.use_cases_desc")}
			/>

			<ul className="border-t border-border">
				{useCases.map((useCase) => (
					<li key={useCase.title} className="border-b border-border">
						<Link
							href={useCase.href}
							className="group flex items-start gap-6 py-8"
						>
							<span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-border">
								<useCase.icon className="h-5 w-5" />
							</span>

							<div className="flex-1">
								<h3 className="text-lg tracking-[-0.015em]">{useCase.title}</h3>
								<p className="mt-2 leading-relaxed text-muted-foreground">
									{useCase.description}
								</p>
							</div>

							<ArrowRight className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-base group-hover:translate-x-1" />
						</Link>
					</li>
				))}
			</ul>
		</SectionShell>
	);
}
