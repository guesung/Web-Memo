"use client";

import type { LanguageType } from "@src/modules/i18n";
import { isMac } from "@web-memo/shared/utils";
import { useTranslation } from "react-i18next";

interface MemoEmptyStateProps extends LanguageType {}

export default function MemoEmptyState({ lng }: MemoEmptyStateProps) {
	const { t } = useTranslation(lng);

	return (
		<div className="relative h-full w-full flex items-center justify-center">
			<div className="text-center text-muted-foreground">
				<p className="mb-2">{t("memos.emptyState.message")}</p>
				<p className="text-sm">
					{t("memos.emptyState.description", {
						key: isMac() ? "Option" : "Alt",
					})}
				</p>
			</div>
		</div>
	);
}
