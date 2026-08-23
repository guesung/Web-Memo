"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { HighlightGroup } from "@web-memo/shared/modules/highlight";
import { ExternalLink } from "lucide-react";
import { HighlightQuote } from "./HighlightQuote";

interface HighlightGroupCardProps {
	group: HighlightGroup;
	lng: Language;
	/** 이 URL에 저장된 하이라이트 총 개수. 카드에 보이는 문장 수와 다를 수 있다 */
	count: number;
}

/** 같은 URL에서 그은 하이라이트를 한 카드로 모아 보여준다 */
export function HighlightGroupCard({
	group,
	lng,
	count,
}: HighlightGroupCardProps) {
	const { t } = useTranslation(lng);

	return (
		<article className="rounded-xl border border-border bg-card p-4">
			<a
				href={group.url}
				target="_blank"
				rel="noreferrer"
				className="mb-3 flex items-center gap-2 text-sm font-medium hover:underline"
			>
				{group.favIconUrl ? (
					<img src={group.favIconUrl} alt="" className="size-4 rounded" />
				) : null}
				<span className="truncate">{group.title ?? group.url}</span>
				<ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
				{count > 0 ? (
					<span className="shrink-0 text-xs text-muted-foreground">
						{t("highlight.count", { count })}
					</span>
				) : null}
			</a>

			<ul className="divide-y divide-border">
				{group.highlights.map((highlight) => (
					<HighlightQuote key={highlight.id} highlight={highlight} lng={lng} />
				))}
			</ul>
		</article>
	);
}
