"use client";

import type { LanguageType } from "@src/modules/i18n";
import { analytics } from "@web-memo/shared/modules/analytics";
import { Button } from "@web-memo/ui";
import { motion } from "framer-motion";
import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 도메인 필터에 걸린 메모가 없을 때 보여주는 빈 상태.
 * @description 메모가 하나도 없을 때(MemoEmptyState)·검색 결과가 없을 때(MemoSearchEmptyState)와
 * 구분한다. 확장 설치 유도 CTA는 필터 중인 사용자에게 답이 아니라서 넣지 않는다.
 * 사용처: MemoGrid, MemoList
 */
export default function MemoDomainEmptyState({
	lng,
	domain,
}: IFMemoDomainEmptyStateProps) {
	const { t } = useTranslation(lng);

	const handleDomainClearClick = () => {
		const nextUrl = new URL(window.location.href);
		nextUrl.searchParams.delete("domain");
		window.history.pushState(null, "", nextUrl);

		analytics.trackEvent({
			name: "memo_domain_filter_change",
			params: { action: "clear", source: "empty_state" },
		});
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex flex-col items-center justify-center min-h-[60vh] px-4"
		>
			<div className="w-20 h-20 mb-6 rounded-full bg-muted flex items-center justify-center">
				<SearchX className="h-10 w-10 text-muted-foreground" />
			</div>

			<h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 text-center">
				{t("memos.domainFilter.emptyState.title")}
			</h3>

			<p className="text-muted-foreground text-center max-w-md [overflow-wrap:anywhere]">
				{t("memos.domainFilter.emptyState.message", { domain })}
			</p>

			<Button
				type="button"
				variant="outline"
				className="mt-6"
				onClick={handleDomainClearClick}
			>
				{t("memos.domainFilter.emptyState.clear")}
			</Button>
		</motion.div>
	);
}

/** 도메인 빈 상태의 언어와 현재 선택 도메인. */
interface IFMemoDomainEmptyStateProps extends LanguageType {
	/** 정규화된 선택 도메인 */
	domain: string;
}
