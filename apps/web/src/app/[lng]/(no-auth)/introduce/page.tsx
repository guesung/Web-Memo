import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";

import {
	Features,
	FinalCTA,
	Footer,
	Hero,
	HowItWorks,
	InteractiveDemo,
	QuestionAndAnswer,
	StatsSection,
	UseCases,
} from "./_components";
import { CHROME_STORE_STATS } from "./_constants";
import { getMemoCount, metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface IntroducePageProps extends LanguageParams {}

/**
 * 소개 페이지.
 * @description
 * `landing` 클래스가 랜딩 스코프 토큰(`globals.css`)을 거는 자리다. 이게 빠지면
 * 모든 섹션이 도구 화면 팔레트로 돌아간다.
 *
 * 배경 밴드는 섹션이 아니라 여기서 정한다 — 인접한 두 섹션이 같은 밴드를 쓰지
 * 않아야 하는데, 그 판단은 순서를 아는 쪽만 할 수 있다.
 */
export default async function IntroducePage({
	params: { lng },
}: IntroducePageProps) {
	const memoCount = await getMemoCount();

	const stats = {
		installCount: CHROME_STORE_STATS.installCount,
		memoCount,
	};

	return (
		<div className="landing min-h-screen bg-background">
			<HeaderMargin />
			<Hero lng={lng} background="canvas" />
			<InteractiveDemo lng={lng} background="fog" />
			<HowItWorks lng={lng} background="canvas" />
			<Features lng={lng} background="fog" />
			<StatsSection lng={lng} stats={stats} background="canvas" />
			<UseCases lng={lng} background="fog" />
			<QuestionAndAnswer lng={lng} background="canvas" />
			<FinalCTA lng={lng} background="fog" />
			<Footer lng={lng} />
		</div>
	);
}
