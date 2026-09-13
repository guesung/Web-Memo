import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import InstallButtons from "../InstallButtons";
import SectionShell, { type TSectionBackground } from "../SectionShell";

/**
 * 페이지 끝의 설치 CTA.
 * @description
 * 설치 버튼은 `InstallButtons`가 모바일 격하까지 전부 갖고 있으므로 여기서 다시
 * 그리지 않는다. `InstallButtons`가 서버 컴포넌트라 이 섹션도 서버로 남는다.
 */

interface FinalCTAProps extends LanguageType {
	background?: TSectionBackground;
}

export default async function FinalCTA({ lng, background }: FinalCTAProps) {
	const { t } = await useTranslation(lng);

	return (
		<SectionShell background={background} className="max-w-3xl">
			<div className="text-center">
				<h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl lg:text-5xl">
					{t("introduce.section.cta_title")}
				</h2>

				<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
					{t("introduce.section.cta_desc")}
				</p>

				<InstallButtons lng={lng} isCentered className="mt-10" />

				<Link
					href="#demo"
					className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
				>
					{t("introduce.hero.learn_more")}
					<ArrowRight className="h-3.5 w-3.5" />
				</Link>
			</div>
		</SectionShell>
	);
}
