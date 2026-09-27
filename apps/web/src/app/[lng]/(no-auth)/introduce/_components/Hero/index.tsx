import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import InstallButtons from "../InstallButtons";
import SectionShell, { type TSectionBackground } from "../SectionShell";

/**
 * 랜딩 첫 화면.
 * @description
 * **서버 컴포넌트를 유지한다.** 헤드라인과 스크린샷이 LCP 요소라 훅이나
 * framer-motion을 들이면 클라이언트 경계가 이 파일까지 올라와 그 최적화가 통째로
 * 무너진다. 그리고 그 손실은 테스트에 잡히지 않는다.
 *
 * 첫 메시지와 장면을 함께 보여 주고 설치 버튼의 기존 계측 위치를 유지한다.
 */

/** 첫 화면에 필요한 언어와 배경 설정입니다. */
interface IFHeroProps extends LanguageType {
	background?: TSectionBackground;
}

const Hero = async ({ lng, background }: IFHeroProps) => {
	const { t } = await useTranslation(lng);

	return (
		<SectionShell background={background}>
			<div className="grid items-center gap-14 lg:grid-cols-2">
				<div className="text-center lg:text-left">
					<h1 className="text-4xl font-normal leading-[1.1] tracking-[-0.025em] sm:text-5xl lg:text-6xl">
						{t("introduce.hero.title")}
					</h1>

					<p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl lg:mx-0">
						{t("introduce.hero.subtitle")}
					</p>

					<InstallButtons lng={lng} position="hero" className="mt-10" />

					<div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground lg:justify-start">
						<span className="inline-flex items-center gap-1.5">
							<Check className="h-4 w-4" />
							{t("introduce.hero.free_forever")}
						</span>
						<span className="inline-flex items-center gap-1.5">
							<Check className="h-4 w-4" />
							{t("introduce.hero.quick_install")}
						</span>
						<Link href="#demo" className="underline-offset-4 hover:underline">
							{t("introduce.hero.explore_features")}
						</Link>
					</div>
				</div>

				{/* LCP 요소. priority를 떼지 않는다 */}
				<div className="overflow-hidden rounded-3xl border border-border bg-card">
					<div className="relative aspect-[4/3]">
						<Image
							src={`/images/webps/introduction/${lng}/1.webp`}
							alt={t("introduce.hero.image_alt")}
							fill
							className="object-contain"
							unoptimized
							priority
						/>
					</div>
				</div>
			</div>
		</SectionShell>
	);
};

export default Hero;
