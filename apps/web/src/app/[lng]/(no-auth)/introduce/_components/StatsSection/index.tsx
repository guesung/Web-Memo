import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { FileText, Gift, Shield, Users } from "lucide-react";
import SectionHeader from "../SectionHeader";
import SectionShell, { type TSectionBackground } from "../SectionShell";

/**
 * 숫자로 보는 웹 메모.
 * @description
 * **페이지에서 유일하게 peach를 쓰는 자리다.** 유채색이 한 곳에만 있어야 그 한 곳이
 * 강조로 읽히므로 `.landing-accent`를 다른 섹션에 쓰지 않는다.
 *
 * 세는 값(사용자 수·메모 수)과 세지 않는 약속(무료·추적 없음)을 한 판에 두되
 * 서로 다른 크기로 둔다. "설치 10초"는 지표가 아니라 카피라서 여기 없다.
 */

interface StatsSectionProps extends LanguageType {
	/** `page.tsx`가 `getMemoCount()` 결과와 함께 넘긴다. 폴백은 그쪽이 갖는다 */
	stats: {
		installCount: number;
		memoCount: number;
	};
	background?: TSectionBackground;
}

export default async function StatsSection({
	lng,
	stats,
	background,
}: StatsSectionProps) {
	const { t } = await useTranslation(lng);

	const countedStats = [
		{
			icon: Users,
			value: `${stats.installCount.toLocaleString("en-US")}+`,
			label: t("introduce.stats.installs"),
			description: t("introduce.stats.installs_desc"),
		},
		{
			icon: FileText,
			value: `${stats.memoCount.toLocaleString("en-US")}+`,
			label: t("introduce.stats.memos_saved"),
			description: t("introduce.stats.memos_saved_desc"),
		},
	];

	const promises = [
		{ icon: Gift, label: t("introduce.stats.free_forever") },
		{ icon: Shield, label: t("introduce.stats.no_tracking") },
	];

	return (
		<SectionShell background={background}>
			<SectionHeader
				title={t("introduce.section.stats")}
				description={t("introduce.section.stats_desc")}
			/>

			<div className="landing-accent rounded-3xl px-8 py-14 lg:px-16">
				<dl className="grid gap-12 sm:grid-cols-2">
					{countedStats.map((stat) => (
						<div key={stat.label} className="text-center">
							<stat.icon className="mx-auto h-6 w-6 opacity-60" />

							<dd className="mt-5 text-5xl tracking-[-0.025em] lg:text-6xl">
								{stat.value}
							</dd>

							<dt className="mt-3 text-lg">{stat.label}</dt>

							<p className="mt-1 text-sm opacity-70">{stat.description}</p>
						</div>
					))}
				</dl>

				<div className="mt-14 flex flex-wrap justify-center gap-3">
					{promises.map((promise) => (
						<span
							key={promise.label}
							className="inline-flex items-center gap-2 rounded-full border border-current px-4 py-1.5 text-sm opacity-70"
						>
							<promise.icon className="h-4 w-4" />
							{promise.label}
						</span>
					))}
				</div>
			</div>
		</SectionShell>
	);
}
