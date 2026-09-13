import type { LanguageParams } from "@src/modules/i18n";
import { PricingCards } from "./_components";

/** 무료 메모와 유료 구독 조건을 비교하는 공개 페이지입니다. */
const PricingPage = (props: LanguageParams) => (
	<PricingCards lng={props.params.lng} />
);

export default PricingPage;
