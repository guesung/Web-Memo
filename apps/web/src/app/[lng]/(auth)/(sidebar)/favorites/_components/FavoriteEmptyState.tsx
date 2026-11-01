"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Button } from "@web-memo/ui";
import { Bookmark } from "lucide-react";

interface FavoriteEmptyStateProps {
	lng: Language;
	onAdd: () => void;
}

/** 서버에 저장된 즐겨찾기가 없을 때 앱에서 추가하거나 직접 추가하도록 안내한다. */
export function FavoriteEmptyState({ lng, onAdd }: FavoriteEmptyStateProps) {
	const { t } = useTranslation(lng);

	return (
		<div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center">
			<Bookmark className="size-8 text-muted-foreground" aria-hidden="true" />
			<p className="text-sm font-semibold text-foreground">
				{t("favorite.empty.title")}
			</p>
			<p className="text-xs text-muted-foreground">
				{t("favorite.empty.description")}
			</p>
			<Button type="button" onClick={onAdd}>
				{t("favorite.empty.add")}
			</Button>
		</div>
	);
}
