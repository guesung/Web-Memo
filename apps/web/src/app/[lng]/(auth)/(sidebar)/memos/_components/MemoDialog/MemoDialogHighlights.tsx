import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemoHighlights } from "../MemoView/_hooks/useMemoHighlights";
import { MemoHighlights } from "../MemoView/MemoHighlights";

export function MemoDialogHighlights({
	lng,
	url,
	omitHighlightId,
}: HighlightsProps) {
	const { t } = useTranslation(lng);
	const { highlightsByUrl, isHighlightLoadError, refetchHighlights } =
		useMemoHighlights([url]);
	const highlights = (highlightsByUrl.get(url) ?? []).filter(
		(highlight) => highlight.id !== omitHighlightId,
	);

	if (isHighlightLoadError) {
		return (
			<div
				role="alert"
				className="flex items-center gap-2 text-sm text-destructive"
			>
				<p>{t("highlight.loadError")}</p>
				<button
					type="button"
					onClick={() => void refetchHighlights()}
					className="underline"
				>
					{t("error.500.retry")}
				</button>
			</div>
		);
	}
	if (highlights.length === 0) return null;

	return (
		<MemoHighlights
			highlights={highlights}
			label={t("highlight.memo.related")}
			className="pt-2"
		/>
	);
}

interface HighlightsProps extends LanguageType {
	url: string;
	omitHighlightId?: number | null;
}
