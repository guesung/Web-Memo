"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Highlighter } from "lucide-react";

interface HighlightEmptyStateProps {
	lng: Language;
}

/** 하이라이트가 하나도 없을 때 보여주는 안내 화면 */
export function HighlightEmptyState({ lng }: HighlightEmptyStateProps) {
	const { t } = useTranslation(lng);

	return (
		<div className="flex flex-col items-center gap-3 py-20 text-center">
			<Highlighter className="size-8 text-muted-foreground" />
			<p className="text-sm text-muted-foreground">{t("highlight.empty.title")}</p>
			<p className="text-xs text-muted-foreground">{t("highlight.empty.description")}</p>
		</div>
	);
}
