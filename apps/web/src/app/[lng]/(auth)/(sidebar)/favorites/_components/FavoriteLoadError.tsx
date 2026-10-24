"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";

interface FavoriteLoadErrorProps {
	lng: Language;
	onRetry: () => void;
	/** 목록 없이 화면 전체를 대신할 때 가운데에 크게 보여준다 */
	centered?: boolean;
	isPending?: boolean;
}

/** 즐겨찾기 조회 실패를 알리고 다시 시도하게 한다. */
export function FavoriteLoadError({
	lng,
	onRetry,
	centered = false,
	isPending = false,
}: FavoriteLoadErrorProps) {
	const { t } = useTranslation(lng);

	return (
		<div
			role="alert"
			className={`flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive${centered ? " justify-center py-16" : ""}`}
		>
			<span>{t("favorite.loadError")}</span>
			<button
				type="button"
				onClick={onRetry}
				disabled={isPending}
				className="rounded-md border border-border bg-background px-3 py-1.5 font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{t("favorite.retry")}
			</button>
		</div>
	);
}
