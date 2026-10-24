import type { LanguageType } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import { InstallGuideViewTracker } from "./installGuideViewTracker";
import { LoginCTA } from "./loginCTA";

export default async function InstallGuide({ lng, extCid }: InstallGuideProps) {
	const { t } = await getTranslation(lng);
	const steps = [
		{
			title: t("installGuide.steps.open.title"),
			description: t("installGuide.steps.open.description"),
		},
		{
			title: t("installGuide.steps.write.title"),
			description: t("installGuide.steps.write.description"),
		},
		{
			title: t("installGuide.steps.save.title"),
			description: t("installGuide.steps.save.description"),
		},
	];

	return (
		<main className="min-h-[calc(100vh-3rem)] bg-background text-foreground">
			<InstallGuideViewTracker />
			<div className="mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-16">
				<p className="mb-3 text-sm font-bold text-primary">
					{t("installGuide.eyebrow")}
				</p>
				<h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
					{t("installGuide.title.first")}
					<br />
					{t("installGuide.title.second")}
				</h1>
				<p className="mb-10 mt-4 text-lg leading-relaxed text-muted-foreground">
					{t("installGuide.lead")}
				</p>

				<div className="grid items-stretch gap-8 md:grid-cols-5">
					<div className="md:col-span-3">
						<BrowserPreview lng={lng} />
						<p className="mt-3 text-xs text-muted-foreground">
							{t("installGuide.previewCaption")}
						</p>
					</div>
					<ol className="flex flex-col gap-3 md:col-span-2">
						{steps.map((step, index) => (
							<li
								key={step.title}
								className="flex gap-4 rounded-lg border border-border bg-card p-5"
							>
								<span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
									{index + 1}
								</span>
								<div>
									<h2 className="mb-2 text-base font-semibold">{step.title}</h2>
									<p className="text-sm leading-relaxed text-muted-foreground">
										{step.description}
									</p>
								</div>
							</li>
						))}
					</ol>
				</div>

				<div className="mt-8 flex flex-col gap-6 rounded-xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
					<div>
						<strong className="text-lg">
							{t("installGuide.loginNotice.title")}
						</strong>
						<p className="mt-2 text-sm text-muted-foreground">
							{t("installGuide.loginNotice.description")}
						</p>
					</div>
					<LoginCTA
						lng={lng}
						extCid={extCid}
						label={t("installGuide.loginNotice.cta")}
					/>
				</div>
			</div>
		</main>
	);
}

async function BrowserPreview({ lng }: LanguageType) {
	const { t } = await getTranslation(lng);

	return (
		<div
			role="img"
			aria-label={t("installGuide.previewLabel")}
			className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
		>
			<div className="flex h-10 items-center gap-2 border-b border-border px-4">
				{[0, 1, 2].map((dot) => (
					<span
						key={dot}
						className="size-2 rounded-full bg-muted-foreground/25"
					/>
				))}
				<span className="ml-4 text-xs text-muted-foreground">
					{t("installGuide.preview.page")}
				</span>
			</div>
			<div className="flex h-80">
				<div className="min-w-0 flex-1 px-4 py-8 sm:px-6">
					<div className="mb-6 h-5 w-3/4 rounded-lg bg-muted-foreground/30" />
					<div className="mb-3 h-2 w-5/6 rounded-lg bg-muted-foreground/20" />
					<div className="mb-3 h-2 w-full rounded-lg bg-muted-foreground/20" />
					<div className="mb-3 h-2 w-3/5 rounded-lg bg-muted-foreground/20" />
					<div className="mb-3 h-2 w-full rounded-lg bg-muted-foreground/20" />
					<div className="mb-3 h-2 w-5/6 rounded-lg bg-muted-foreground/20" />
				</div>
				<div className="w-40 shrink-0 border-l border-border bg-background px-3 py-4 sm:w-48">
					<div className="mb-4 text-sm font-bold">Web Memo</div>
					<div className="rounded-lg border border-border bg-card p-3">
						<p className="mb-2 text-xs text-muted-foreground">
							{t("installGuide.preview.url")}
						</p>
						<p className="text-xs leading-relaxed">
							{t("installGuide.preview.memo")}
						</p>
						<div className="mt-3 rounded-md bg-primary py-2 text-center text-xs font-bold text-primary-foreground">
							{t("installGuide.preview.save")}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

interface InstallGuideProps extends LanguageType {
	extCid?: string;
}
