import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { PATHS } from "@web-memo/shared/constants";
import { cn } from "@web-memo/shared/utils";
import {
	ArrowRight,
	BarChart3,
	FolderOpen,
	Heart,
	Pencil,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import SectionHeader from "../SectionHeader";
import SectionShell, { type TSectionBackground } from "../SectionShell";

/**
 * 핵심 기능 목록.
 * @description
 * 벤토 그리드는 카드마다 크기가 달라 읽는 순서를 매번 다시 정해야 했다. 대신
 * 같은 묶음(원형 아이콘 → 제목 → 설명 → 링크)을 행으로 반복하고, 아이콘 위치만
 * 좌우로 번갈아 둬서 단조로움을 던다.
 *
 * 앵커 `#demo`는 `InteractiveDemo`가 목적지다. 이 섹션은 id를 갖지 않는다.
 */

interface FeaturesProps extends LanguageType {
	background?: TSectionBackground;
}

export default async function Features({ lng, background }: FeaturesProps) {
	const { t } = await useTranslation(lng);

	const features = [
		{
			icon: Pencil,
			title: t("introduce.features.memo.title"),
			description: t("introduce.features.memo.description"),
			href: `/${lng}${PATHS.featuresMemo}`,
		},
		{
			icon: BarChart3,
			title: t("introduce.features.overview.title"),
			description: t("introduce.features.overview.description"),
			href: null,
		},
		{
			icon: FolderOpen,
			title: t("introduce.features.organize.title"),
			description: t("introduce.features.organize.description"),
			href: `/${lng}${PATHS.featuresSaveArticles}`,
		},
		{
			icon: Sparkles,
			title: t("introduce.features.ai_summary.title"),
			description: t("introduce.features.ai_summary.description"),
			href: `/${lng}${PATHS.featuresYoutubeSummary}`,
		},
		{
			icon: Heart,
			title: t("introduce.features.wishlist.title"),
			description: t("introduce.features.wishlist.description"),
			href: null,
		},
	];

	return (
		<SectionShell background={background}>
			<SectionHeader
				eyebrow={t("introduce.section.features_badge")}
				title={t("introduce.section.key_features")}
				description={t("introduce.section.key_features_desc")}
			/>

			<ul className="border-t border-border">
				{features.map((feature, index) => {
					const isIconOnRight = index % 2 === 1;

					return (
						<li key={feature.title} className="border-b border-border">
							<div
								className={cn(
									"flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:gap-10",
									isIconOnRight && "sm:flex-row-reverse sm:text-right",
								)}
							>
								<span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-border">
									<feature.icon className="h-6 w-6" />
								</span>

								<div className="max-w-xl">
									<h3 className="text-xl tracking-[-0.015em] sm:text-2xl">
										{feature.title}
									</h3>

									<p className="mt-3 leading-relaxed text-muted-foreground">
										{feature.description}
									</p>

									{feature.href ? (
										<Link
											href={feature.href}
											className="mt-4 inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
										>
											{t("common.learn_more")}
											<ArrowRight className="h-3.5 w-3.5" />
										</Link>
									) : null}
								</div>
							</div>
						</li>
					);
				})}
			</ul>
		</SectionShell>
	);
}
