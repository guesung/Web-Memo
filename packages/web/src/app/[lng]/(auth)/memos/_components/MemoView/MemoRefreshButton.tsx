import { useGuide } from "@src/modules/guide";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { setLocalStorageTrue } from "@web-memo/shared/modules/local-storage";
import { Button, toast } from "@web-memo/ui";
import { RefreshCwIcon } from "lucide-react";
import { memo } from "react";

interface RefreshButtonProps extends LanguageType {}

export default memo(function MemoRefreshButton({ lng }: RefreshButtonProps) {
	const { t } = useTranslation(lng);
	const queryClient = useQueryClient();
	const { driverObj } = useGuide({ lng });

	const handleRefreshClick = async () => {
		driverObj.moveNext();
		setLocalStorageTrue("guide");

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
