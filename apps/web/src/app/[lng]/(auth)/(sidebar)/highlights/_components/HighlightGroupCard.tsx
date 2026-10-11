"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { HighlightGroup } from "@web-memo/shared/modules/highlight";
import type { HighlightMemoLink } from "@web-memo/shared/types";
import { getHighlightSourceUrl } from "@web-memo/shared/utils";
import { PanelRightOpen } from "lucide-react";
import { useState } from "react";
import { HighlightQuote } from "./HighlightQuote";

interface HighlightGroupCardProps {
	group: HighlightGroup;
	lng: Language;
	/** 이 URL에 저장된 하이라이트 총 개수. 카드에 보이는 문장 수와 다를 수 있다 */
	count: number;
	links?: Map<number, HighlightMemoLink>;
	isLinkLoading?: boolean;
	isLinkError?: boolean;
	onRetryLinks?: () => void;
	targetHighlightId?: number;
}

/** 같은 URL에서 그은 하이라이트를 한 카드로 모아 보여준다 */
export function HighlightGroupCard({
	group,
	lng,
	count,
	links,
	isLinkLoading,
	isLinkError,
	onRetryLinks,
	targetHighlightId,
}: HighlightGroupCardProps) {
	const { t } = useTranslation(lng);
	const [failedFavIconUrl, setFailedFavIconUrl] = useState<string | null>(null);
	const [isPanelOpenError, setIsPanelOpenError] = useState(false);
	const favIconUrl = group.favIconUrl;
	const isFavIconVisible = !!favIconUrl && failedFavIconUrl !== favIconUrl;
	const sourceUrl = getHighlightSourceUrl({ url: group.url, exact_text: "" });

	const handleFavIconError = () => {
		setFailedFavIconUrl(favIconUrl);
	};
	const handleSourceClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		setIsPanelOpenError(false);
		void bridge.request
			.OPEN_SIDE_PANEL_FROM_WEB()
			.then((response) => {
				const isSuccess = response?.success === true;
				void analytics.trackEvent({
					name: "highlight_panel_open_result",
					params: { is_success: isSuccess },
				});
				if (!isSuccess) setIsPanelOpenError(true);
			})
			.catch(() => {
				void analytics.trackEvent({
					name: "highlight_panel_open_result",
					params: { is_success: false },
				});
				setIsPanelOpenError(true);
			});
	};
	const headerContent = (
		<>
			{isFavIconVisible ? (
				<img
					src={favIconUrl}
					alt=""
					className="size-4 rounded"
					onError={handleFavIconError}
				/>
			) : null}
			<span className="truncate">{group.title ?? group.url}</span>
			<PanelRightOpen
				aria-hidden="true"
				className="size-3.5 shrink-0 text-muted-foreground"
			/>
			{count > 0 ? (
				<span className="shrink-0 text-xs text-muted-foreground">
					{t("highlight.count", { count })}
				</span>
			) : null}
		</>
	);

	return (
		<article className="w-full min-w-0 rounded-xl border border-border bg-card p-4">
			{sourceUrl !== "#" ? (
				<a
					href={sourceUrl}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={t("highlight.openSourceAndPanel")}
					title={t("highlight.openSourceAndPanel")}
					onClick={handleSourceClick}
					className="mb-3 flex items-center gap-2 text-sm font-medium hover:underline"
				>
					{headerContent}
				</a>
			) : (
				<div className="mb-3 flex items-center gap-2 text-sm font-medium">
					{headerContent}
				</div>
			)}
			{isPanelOpenError && (
				<p role="alert" className="mb-3 text-xs text-destructive">
					{t("highlight.panelOpenError")}
				</p>
			)}

			<ul className="divide-y divide-border">
				{group.highlights.map((highlight) => (
					<HighlightQuote
						key={highlight.id}
						highlight={highlight}
						lng={lng}
						link={links?.get(highlight.id)}
						isLinkLoading={isLinkLoading}
						isLinkError={isLinkError}
						onRetryLinks={onRetryLinks}
						isTarget={targetHighlightId === highlight.id}
					/>
				))}
			</ul>
		</article>
	);
}
