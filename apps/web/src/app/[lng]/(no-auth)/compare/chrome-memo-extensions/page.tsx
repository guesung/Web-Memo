import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { ArrowDown, ArrowRight, Scale } from "lucide-react";
import { notFound } from "next/navigation";

import { ExtensionInstallCTA } from "../../_components";
import { SectionHeader, SectionShell } from "../../introduce/_components";
import { CompareJsonLD, ComparisonTable, SourceList } from "./_components";
import {
	COMPARE_LAST_CHECKED_DATE,
	COMPARE_PAGE_COPY,
	COMPARE_PAGE_PATH,
	COMPARE_PRODUCTS,
	COMPARE_RECOMMENDATIONS,
} from "./_constants";
import { metadataKorean } from "./_utils";

/** 한국어로만 존재하는 페이지라 다른 언어 경로는 메타데이터도 만들지 않는다 */
export const generateMetadata = async ({ params }: LanguageParams) => {
	const { lng } = await params;

	if (lng !== "ko") {
		notFound();
	}

	return metadataKorean;
};

/**
 * 크롬 메모 확장 프로그램 비교 페이지(한국어 전용).
 * @description
 * `landing` 클래스가 랜딩 스코프 토큰을 거는 자리다. 배경 밴드는 순서를 아는
 * 여기서 canvas·fog를 번갈아 지정한다.
 */
const CompareChromeMemoExtensionsPage = async ({ params }: LanguageParams) => {
	const { lng } = await params;

	if (lng !== "ko") {
		notFound();
	}

	const { hero, overview, comparison, recommendation, sources, finalCTA } =
		COMPARE_PAGE_COPY;

	return (
		<div className="landing min-h-screen bg-background">
			<CompareJsonLD />
			<HeaderMargin />

			<SectionShell background="canvas">
				<div className="max-w-3xl">
					<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">
						<Scale className="h-4 w-4" />
						{hero.badge}
					</div>

					<h1 className="text-4xl font-normal leading-[1.15] tracking-[-0.025em] sm:text-5xl">
						{hero.title}
					</h1>

					<div className="mt-6 space-y-3 text-lg leading-relaxed text-muted-foreground">
						{hero.descriptions.map((description) => (
							<p key={description}>{description}</p>
						))}
					</div>

					<p className="mt-6 text-sm text-muted-foreground">
						{hero.disclosure}
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						{hero.lastCheckedLabel} {COMPARE_LAST_CHECKED_DATE}
					</p>

					<a
						href="#comparison"
						className="mt-8 inline-flex items-center gap-1.5 text-base underline-offset-4 hover:underline"
					>
						{hero.anchorLabel}
						<ArrowDown className="h-4 w-4" />
					</a>
				</div>
			</SectionShell>

			<SectionShell background="fog">
				<SectionHeader title={overview.title} isCentered={false} />

				<ul className="border-t border-border">
					{COMPARE_PRODUCTS.map((product) => (
						<li
							key={product.key}
							className="flex flex-col gap-1 border-b border-border py-5 sm:flex-row sm:items-baseline sm:gap-6"
						>
							<span className="w-40 flex-shrink-0 text-lg tracking-[-0.015em]">
								{product.name}
							</span>
							<span className="leading-relaxed text-muted-foreground">
								{product.identity}
							</span>
						</li>
					))}
				</ul>
			</SectionShell>

			<SectionShell background="canvas" id="comparison">
				<SectionHeader title={comparison.title} isCentered={false} />
				<ComparisonTable />
			</SectionShell>

			<SectionShell background="fog">
				<SectionHeader title={recommendation.title} isCentered={false} />

				<ul className="border-t border-border">
					{COMPARE_RECOMMENDATIONS.map((item) => (
						<li
							key={item.situation}
							className="flex flex-col gap-3 border-b border-border py-6 sm:flex-row sm:items-start sm:gap-6"
						>
							<p className="flex-1 leading-relaxed">{item.situation}</p>

							<div className="flex items-start gap-2 sm:w-72 sm:flex-shrink-0">
								<ArrowRight
									aria-hidden="true"
									className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground"
								/>
								<div>
									<p className="font-medium">{item.productName}</p>
									{item.note ? (
										<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
											{item.note}
										</p>
									) : null}
								</div>
							</div>
						</li>
					))}
				</ul>

				<ExtensionInstallCTA
					lng={lng}
					from={COMPARE_PAGE_PATH}
					position="recommendation"
					className="mt-10"
				/>
			</SectionShell>

			<SectionShell background="canvas">
				<SectionHeader title={sources.title} isCentered={false} />
				<SourceList />
			</SectionShell>

			<SectionShell background="fog" className="max-w-3xl">
				<div className="text-center">
					<h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
						{finalCTA.title}
					</h2>

					<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
						{finalCTA.description}
					</p>

					<ExtensionInstallCTA
						lng={lng}
						from={COMPARE_PAGE_PATH}
						position="final"
						isCentered
						className="mt-10"
					/>
				</div>
			</SectionShell>
		</div>
	);
};

export default CompareChromeMemoExtensionsPage;
