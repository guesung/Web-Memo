import type { LanguageParams } from "@src/modules/i18n";
import { Skeleton } from "@web-memo/ui";
import { Suspense } from "react";
import { BillingOverview } from "../_components";

/** 구독 관리와 카드등록 결과를 서버 확인 상태로 표시합니다. */
const BillingPage = (props: LanguageParams) => (
	<Suspense fallback={<Skeleton className="mx-4 mt-24 h-64" />}>
		<BillingOverview lng={props.params.lng} />
	</Suspense>
);

export default BillingPage;
