import { HeaderMargin } from "@src/components/Header";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { cn } from "@web-memo/shared/utils";
import { ArrowRight, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LANDING_PAGE, type TLandingPageKey } from "../../_constants";
import SectionHeader from "../../introduce/_components/SectionHeader";
import SectionShell, {
	type TSectionBackground,
} from "../../introduce/_components/SectionShell";
import ExtensionInstallCTA from "../ExtensionInstallCTA";

/**
 * 기능·유스케이스 소개 페이지 열 개의 공통 뼈대.
 * @description
 * 열 라우트가 줄 수까지 같은 `Hero`·`Benefits`·`CTA`를 각자 들고 있었다. 같은 화면을
 * 열 번 고쳐야 했고, 실제로 CWS 주소가 스무 곳에 같은 줄 번호로 박혀 있었다.
 *
 * 페이지마다 다른 것은 **문구 키 앞부분·아이콘·스크린샷·이어서 볼 페이지** 넷뿐이므로
 * 그것만 설정으로 받는다. 배경 밴드는 섹션이 고르지 않고 여기서 순서를 보고 정한다 —
 * 3단계 안내가 있는 페이지와 없는 페이지에서 교대가 어긋나면 안 되기 때문이다.
 *
 * 서버 컴포넌트로 남긴다. 히어로의 제목과 스크린샷이 LCP 요소라 훅이나 애니메이션
 * 라이브러리를 들이면 클라이언트 경계가 이 파일까지 올라온다.
 */

/** 본문 항목 하나. `key`는 번역 키의 마지막 마디다 */
export type TLandingPageItem = {
	key: string;
	icon: LucideIcon;
};

/** 소개 페이지 한 장을 그리는 데 필요한 전부 */
export type TLandingPageConfig = {
	/** 이 페이지가 명부에서 차지하는 자리. 문구 키·아이콘·경로가 여기서 나온다 */
	pageKey: TLandingPageKey;
	/** `/images/pngs/introduction/{lng}/{n}.png`의 번호 */
	screenshotNumber: number;
	/** `{prefix}.benefits.{key}` 아래 문구를 읽는다 */
	benefits: TLandingPageItem[];
	/** `{prefix}.howItWorks.{key}` 아래 문구를 읽는다. 3단계 안내가 없는 페이지는 생략 */
	steps?: TLandingPageItem[];
	/** 이어서 볼 페이지. 자기 자신은 넣지 않는다 */
	relatedKeys: TLandingPageKey[];
};

interface LandingPageTemplateProps extends LanguageType {
	config: TLandingPageConfig;
	/** 페이지 고유의 구조화 데이터 등, 본문 맨 앞에 끼워 넣을 것 */
	children?: ReactNode;
}

/** 인접한 두 섹션이 같은 밴드를 쓰지 않도록 순서대로 번갈아 준다 */
function getBackground(sectionIndex: number): TSectionBackground {
	return sectionIndex % 2 === 0 ? "canvas" : "fog";
}

export default async function LandingPageTemplate({
	lng,
	config,
	children,
}: LandingPageTemplateProps) {
	const { t } = await useTranslation(lng);

	const { icon: PageIcon, translationPrefix } = LANDING_PAGE[config.pageKey];

	const stepsSectionIndex = 2;
	const relatedSectionIndex = config.steps ? 3 : 2;
	const ctaSectionIndex = relatedSectionIndex + 1;

	return (
		<div className="landing min-h-screen bg-background">
			{children}
			<HeaderMargin />

			<SectionShell background={getBackground(0)}>
				<div className="grid items-center gap-14 lg:grid-cols-2">
					<div className="text-center lg:text-left">
						<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">
							<PageIcon className="h-4 w-4" />
							{t(`${translationPrefix}.hero.badge`)}
						</div>

						<h1 className="text-4xl font-normal leading-[1.15] tracking-[-0.025em] sm:text-5xl">
							{t(`${translationPrefix}.hero.title`)}
						</h1>

						<p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
							{t(`${translationPrefix}.hero.description`)}
						</p>

						<ExtensionInstallCTA lng={lng} className="mt-10" />
					</div>

					{/* LCP 요소. priority를 떼지 않는다 */}
					<div className="overflow-hidden rounded-3xl border border-border bg-card">
						<div className="relative aspect-[4/3]">
							<Image
								src={`/images/pngs/introduction/${lng}/${config.screenshotNumber}.png`}
								alt={t(`${translationPrefix}.hero.badge`)}
								fill
								className="object-cover object-top"
								priority
							/>
						</div>
					</div>
				</div>
			</SectionShell>

			<SectionShell background={getBackground(1)}>
				<SectionHeader
					title={t(`${translationPrefix}.benefits.title`)}
					description={t(`${translationPrefix}.benefits.subtitle`)}
				/>

				<ul className="border-t border-border">
					{config.benefits.map((benefit, index) => {
						const isIconOnRight = index % 2 === 1;

						return (
							<li key={benefit.key} className="border-b border-border">
								<div
									className={cn(
										"flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:gap-10",
										isIconOnRight && "sm:flex-row-reverse sm:text-right",
									)}
								>
									<span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-border">
										<benefit.icon className="h-6 w-6" />
									</span>

									<div className="max-w-xl">
										<h3 className="text-xl tracking-[-0.015em] sm:text-2xl">
											{t(`${translationPrefix}.benefits.${benefit.key}.title`)}
										</h3>

										<p className="mt-3 leading-relaxed text-muted-foreground">
											{t(
												`${translationPrefix}.benefits.${benefit.key}.description`,
											)}
										</p>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			</SectionShell>

			{config.steps ? (
				<SectionShell background={getBackground(stepsSectionIndex)}>
					<SectionHeader
						title={t(`${translationPrefix}.howItWorks.title`)}
						description={t(`${translationPrefix}.howItWorks.subtitle`)}
					/>

					<ol className="grid gap-12 sm:grid-cols-3">
						{config.steps.map((step, index) => (
							<li
								key={step.key}
								className="flex flex-col items-center text-center"
							>
								<span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-border">
									<step.icon className="h-8 w-8" />
									<span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-sm">
										{index + 1}
									</span>
								</span>

								<h3 className="mt-6 text-xl tracking-[-0.015em]">
									{t(`${translationPrefix}.howItWorks.${step.key}.title`)}
								</h3>

								<p className="mt-3 max-w-xs leading-relaxed text-muted-foreground">
									{t(`${translationPrefix}.howItWorks.${step.key}.description`)}
								</p>
							</li>
						))}
					</ol>
				</SectionShell>
			) : null}

			<SectionShell background={getBackground(relatedSectionIndex)}>
				<SectionHeader
					title={t("landing.related.title")}
					description={t("landing.related.description")}
				/>

				<ul className="border-t border-border">
					{config.relatedKeys.map((relatedKey) => {
						const related = LANDING_PAGE[relatedKey];

						return (
							<li key={relatedKey} className="border-b border-border">
								<Link
									href={`/${lng}${related.path}`}
									className="group flex items-start gap-6 py-8"
								>
									<span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-border">
										<related.icon className="h-5 w-5" />
									</span>

									<div className="flex-1">
										<h3 className="text-lg tracking-[-0.015em]">
											{t(`${related.translationPrefix}.hero.badge`)}
										</h3>
										<p className="mt-2 leading-relaxed text-muted-foreground">
											{t(`${related.translationPrefix}.hero.description`)}
										</p>
									</div>

									<ArrowRight className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-base group-hover:translate-x-1" />
								</Link>
							</li>
						);
					})}
				</ul>
			</SectionShell>

			<SectionShell
				background={getBackground(ctaSectionIndex)}
				className="max-w-3xl"
			>
				<div className="text-center">
					<h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
						{t(`${translationPrefix}.cta.title`)}
					</h2>

					<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
						{t(`${translationPrefix}.cta.description`)}
					</p>

					<ExtensionInstallCTA lng={lng} isCentered className="mt-10" />

					<p className="mt-8 text-sm text-muted-foreground">
						{t(`${translationPrefix}.cta.subtext`)}
					</p>
				</div>
			</SectionShell>
		</div>
	);
}
