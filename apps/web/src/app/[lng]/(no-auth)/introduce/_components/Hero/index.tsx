import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Check, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CHROME_STORE_STATS } from "../../_constants";
import InstallButtons from "../InstallButtons";
import SectionShell, { type TSectionBackground } from "../SectionShell";

/**
 * 랜딩 첫 화면.
 * @description
 * **서버 컴포넌트를 유지한다.** 헤드라인과 스크린샷이 LCP 요소라 훅이나
 * framer-motion을 들이면 클라이언트 경계가 이 파일까지 올라와 그 최적화가 통째로
 * 무너진다. 그리고 그 손실은 테스트에 잡히지 않는다.
 *
 * 신뢰 배지는 사용자 수만 말한다. 평점·리뷰 수는 JSON-LD와 짝으로 함께 걷어냈다.
 */

interface HeroProps extends LanguageType {
	background?: TSectionBackground;
}

export default async function Hero({ lng, background }: HeroProps) {
	const { t } = await useTranslation(lng);

	return (
		<SectionShell background={background}>
			<div className="grid items-center gap-14 lg:grid-cols-2">
				<div className="text-center lg:text-left">
					<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">
						<Users className="h-4 w-4" />
						{CHROME_STORE_STATS.userCount}+ {t("introduce.stats.active_users")}
					</div>

					<h1 className="text-4xl font-normal leading-[1.1] tracking-[-0.025em] sm:text-5xl lg:text-6xl">
						{t("introduce.hero.title")}
					</h1>

					<p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl lg:mx-0">
						{t("introduce.hero.subtitle")}
					</p>

					<InstallButtons lng={lng} className="mt-10" />

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
							src={`/images/pngs/introduction/${lng}/1.png`}
							alt="Web Memo Screenshot"
							fill
							className="object-cover object-top"
							priority
						/>
					</div>
				</div>
			</div>
		</SectionShell>
	);
}
