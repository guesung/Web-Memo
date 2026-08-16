"use client";

import type { Language } from "@src/modules/i18n";
import { ExternalLink } from "lucide-react";
import type { HighlightGroup } from "../_utils";
import { HighlightQuote } from "./HighlightQuote";

interface HighlightGroupCardProps {
	group: HighlightGroup;
	lng: Language;
}

/** 같은 URL에서 그은 하이라이트를 한 카드로 모아 보여준다 */
export function HighlightGroupCard({ group, lng }: HighlightGroupCardProps) {
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
			</a>

			<ul className="divide-y divide-border">
				{group.highlights.map((highlight) => (
					<HighlightQuote key={highlight.id} highlight={highlight} lng={lng} />
				))}
			</ul>
		</article>
	);
}
