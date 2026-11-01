"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useSettingUpsertMutation } from "@web-memo/shared/hooks";
import { Button } from "@web-memo/ui";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useMemoSettings } from "./_hooks/useMemoSettings";
import { holdScrollPosition } from "./scrollPositionHold";

/** 목록 카드의 긴 내용을 말줄임으로 볼지 계정 설정에 저장하며 전환한다. */
export default function MemoTruncateToggle({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const {
		truncateMemoContent,
		isSettingReady,
		isSettingError,
		refetchSetting,
	} = useMemoSettings();
	const { mutate: upsertSetting, isPending } = useSettingUpsertMutation();

	const handleTruncateClick = () => {
		holdScrollPosition();
		upsertSetting({ truncate_memo_content: !truncateMemoContent });
	};

	return (
		<>
			<Button
				type="button"
				size="icon"
				variant="outline"
				aria-label={t("memos.view.truncateContent")}
				title={t("memos.view.truncateContent")}
				aria-pressed={truncateMemoContent}
				disabled={!isSettingReady || isPending}
				onClick={handleTruncateClick}
			>
				{truncateMemoContent ? (
					<ChevronsDownUp className="h-4 w-4" aria-hidden="true" />
				) : (
					<ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
				)}
			</Button>
			{isSettingError && (
				<div
					role="alert"
					className="flex items-center gap-2 text-xs text-destructive"
				>
					<span>
						{t("setting.header")}: {t("error.500.title")}
					</span>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => void refetchSetting()}
					>
						{t("error.500.retry")}
					</Button>
				</div>
			)}
		</>
	);
}
