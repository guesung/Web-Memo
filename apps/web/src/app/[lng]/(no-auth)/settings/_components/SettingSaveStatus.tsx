import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Button } from "@web-memo/ui";

/** 저장 실패한 항목의 재시도 동작과 저장 상태입니다. */
interface IFSettingSaveStatusProps extends LanguageType {
	status: "idle" | "saving" | "saved" | "failed";
	isRetryDisabled?: boolean;
	onRetryClick: () => void;
}

/** 항목 옆에서 저장 실패를 알리고 직접 재시도하게 합니다. */
export const SettingSaveStatus = (props: IFSettingSaveStatusProps) => {
	const { t } = useTranslation(props.lng);

	return (
		<output
			aria-live="polite"
			data-status={props.status}
			className="block text-xs text-muted-foreground"
		>
			{props.status === "failed" && (
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-destructive">
						{t("setting.unified.saveFailed")}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={props.isRetryDisabled}
						onClick={props.onRetryClick}
					>
						{t("setting.unified.retry")}
					</Button>
				</div>
			)}
		</output>
	);
};
