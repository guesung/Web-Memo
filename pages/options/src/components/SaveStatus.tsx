import { I18n } from "@web-memo/shared/utils/extension";
import { Button } from "@web-memo/ui";

import type { TSaveStatus } from "./useAutoSaveSetting";

/** 설정 항목의 저장 결과와 재시도 버튼에 전달하는 값입니다. */
interface IFSaveStatusProps {
	status: TSaveStatus;
	onRetryClick: () => void;
}

/** 자동 저장 진행 상태를 항목 옆에 표시합니다. */
const SaveStatus = (props: IFSaveStatusProps) => {
	return (
		<span aria-live="polite" className="text-muted-foreground text-sm">
			{props.status === "saving" && I18n.get("setting_saving")}
			{props.status === "saved" && I18n.get("setting_saved")}
			{props.status === "failed" && (
				<span className="flex items-center gap-2">
					<span className="text-destructive">
						{I18n.get("setting_save_failed")}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={props.onRetryClick}
					>
						{I18n.get("retry")}
					</Button>
				</span>
			)}
		</span>
	);
};

export default SaveStatus;
