import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { Button, toast } from "@web-memo/ui";
import { RefreshCwIcon } from "lucide-react";
import { memo } from "react";

interface RefreshButtonProps extends LanguageType {
	/** 가이드가 진행 중일 때만 다음 단계로 넘긴다. */
	onGuideNext: () => void;
}

export default memo(function MemoRefreshButton({
	lng,
	onGuideNext,
}: RefreshButtonProps) {
	const { t } = useTranslation(lng);
	const queryClient = useQueryClient();

	const handleRefreshClick = async () => {
		onGuideNext();

		await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
		toast({ title: t("toastTitle.refresh") });
	};

	return (
		<Button
			size="icon"
			variant="outline"
			id="refresh"
			onClick={handleRefreshClick}
		>
			<RefreshCwIcon size={16} />
		</Button>
	);
});
