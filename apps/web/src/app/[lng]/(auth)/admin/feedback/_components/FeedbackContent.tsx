"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Badge } from "@web-memo/ui";

import { parseUninstallFeedback, UNINSTALL_REASONS } from "../_utils";

interface FeedbackContentProps extends LanguageType {
	content: string | null;
	/** 펼친 본문이면 전문을 줄바꿈까지 살려 그리고, 목록 요약이면 두 줄로 자른다 */
	isExpanded?: boolean;
}

/**
 * 피드백 한 건의 본문.
 * @description 목록의 절반 이상이 확장 삭제 설문 응답이고 원문은 JSON 문자열이라 그대로 보면
 * 읽을 수 없다. 설문이면 이탈 사유 배지와 직접 쓴 문장으로 풀어 그리고, 그 밖에는 원문을 쓴다.
 * 파싱에 실패해도 원문을 보여준다 — 읽을 수 없는 글자가 빈 화면보다 낫다.
 */
export default function FeedbackContent({
	lng,
	content,
	isExpanded = false,
}: FeedbackContentProps) {
	const { t } = useTranslation(lng);

	if (!content) {
		return (
			<span className="text-sm text-muted-foreground">
				{t("admin.feedback.content_empty")}
			</span>
		);
	}

	const textClassName = isExpanded
		? "whitespace-pre-wrap text-sm"
		: "line-clamp-2";
	const uninstallFeedback = parseUninstallFeedback(content);

	if (!uninstallFeedback) {
		return <span className={textClassName}>{content}</span>;
	}

	const { reason, feedback } = uninstallFeedback;
	const isKnownReason = UNINSTALL_REASONS.some(
		(knownReason) => knownReason === reason,
	);

	return (
		<div className="flex flex-col items-start gap-1">
			<Badge variant="secondary">
				{isKnownReason
					? t(`admin.feedback.uninstall_reason.${reason}`)
					: reason}
			</Badge>
			{feedback ? <span className={textClassName}>{feedback}</span> : null}
		</div>
	);
}
