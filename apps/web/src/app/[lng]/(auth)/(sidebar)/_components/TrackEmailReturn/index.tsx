"use client";

import { analytics } from "@web-memo/shared/modules/analytics";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

const EMAIL_SOURCE = "weekly_report";
const EMAIL_CAMPAIGNS = [
	"weekly_memo_resurface",
	"weekly_memo_report",
] as const;
type EmailCampaign = (typeof EMAIL_CAMPAIGNS)[number];

/** utm_content가 비어 있는 링크를 구분하기 위한 값. */
const EMPTY_CONTENT = "none";

function isEmailCampaign(value: string | null): value is EmailCampaign {
	return EMAIL_CAMPAIGNS.some((campaign) => campaign === value);
}

/**
 * 주간 메일 링크로 들어온 방문의 캠페인과 클릭 위치를 읽습니다.
 * @description 메일 발송 쪽 테스트 캠페인(`*_test`)은 null을 돌려 집계에서 뺍니다.
 */
export function resolveEmailReturn(searchParams: URLSearchParams) {
	if (searchParams.get("utm_source") !== EMAIL_SOURCE) return null;

	const campaign = searchParams.get("utm_campaign");
	if (!isEmailCampaign(campaign)) return null;

	return {
		campaign,
		content: searchParams.get("utm_content") || EMPTY_CONTENT,
	};
}

/** 탭 세션 안에서 이미 보냈다면 true. 저장소를 못 쓰면 false로 두고 보냅니다. */
function markSentOnce(key: string) {
	try {
		if (sessionStorage.getItem(key)) return true;
		sessionStorage.setItem(key, "1");
	} catch {
		// 저장소 접근이 막힌 환경에서는 중복 방지만 포기합니다.
	}
	return false;
}

/**
 * 주간 메일에서 돌아온 방문을 탭 세션당 한 번 기록합니다.
 * @description 로그인 뒤 next로 복귀한 경우와 로그인한 채 바로 링크를 연 경우가
 * 모두 이 인증 영역 레이아웃에 도착하므로 같은 경로로 잡힙니다.
 */
export default function TrackEmailReturn() {
	const searchParams = useSearchParams();

	useEffect(() => {
		const emailReturn = resolveEmailReturn(searchParams);
		if (!emailReturn) return;

		const { campaign, content } = emailReturn;
		if (markSentOnce(`email_return:${campaign}:${content}`)) return;

		analytics.trackEvent({
			name: "email_return",
			params: { campaign, content },
		});
	}, [searchParams]);

	return null;
}
