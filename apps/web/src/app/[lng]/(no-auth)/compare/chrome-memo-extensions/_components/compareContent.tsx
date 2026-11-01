import { HeaderMargin } from "@src/components/Header";
import type { Language } from "@src/modules/i18n";
import { ArrowDown, ArrowRight, Scale } from "lucide-react";

import { ExtensionInstallCTA } from "../../../_components";
import { SectionHeader, SectionShell } from "../../../introduce/_components";
import { COMPARE_PAGE_PATH } from "../_constants";
import type { TComparisonContent } from "../_utils";
import CompareJsonLD from "./CompareJsonLD";
import ComparisonTable from "./ComparisonTable";
import SourceList from "./SourceList";

const CompareContent = ({
	lng,
	content,
}: {
	lng: Language;
	content: TComparisonContent;
}) => {
	const { hero, overview, comparison, recommendation, sources, finalCTA } =
		content;

	return (
		<div className="landing min-h-screen bg-background">
			<CompareJsonLD
				lng={lng}
				title={hero.title}
				brandName={content.products[0].name}
			/>
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
						{hero.lastCheckedLabel} {content.lastCheckedDate}
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
					{content.products.map((product) => (
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
				<ComparisonTable content={content} />
			</SectionShell>

			<SectionShell background="fog">
				<SectionHeader title={recommendation.title} isCentered={false} />

				<ul className="border-t border-border">
					{content.recommendations.map((item) => (
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
				<SourceList content={content} />
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

export default CompareContent;
