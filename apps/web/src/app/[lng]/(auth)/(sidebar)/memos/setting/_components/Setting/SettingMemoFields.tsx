"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useSettingQuery,
	useSettingUpsertMutation,
} from "@web-memo/shared/hooks";
import { Switch } from "@web-memo/ui";

import SettingRow from "./SettingRow";

/** 메모 표시 설정 화면의 언어. */
interface IFSettingMemoFieldsProps extends LanguageType {}

/** 메모 입력란과 목록 내용의 표시 방식을 설정한다. */
const SettingMemoFields = ({ lng }: IFSettingMemoFieldsProps) => {
	const { t } = useTranslation(lng);
	const { showImpression, showActionItem, truncateMemoContent } =
		useSettingQuery();
	const { mutate: upsertSetting, isPending } = useSettingUpsertMutation();

	const handleTruncateMemoContentChange = (checked: boolean) => {
		upsertSetting({ truncate_memo_content: checked });
	};

	return (
		<>
			<SettingRow
				label={t("setting.truncateMemoContent")}
				description={t("setting.truncateMemoContentDescription")}
				htmlFor="truncate-memo-content"
			>
				<Switch
					id="truncate-memo-content"
					checked={truncateMemoContent}
					disabled={isPending}
					onCheckedChange={handleTruncateMemoContentChange}
				/>
			</SettingRow>
			<SettingRow
				label={t("memoSection.impression")}
				description={t("setting.showImpressionSection")}
				htmlFor="show-impression"
			>
				<Switch
					id="show-impression"
					checked={showImpression}
					onCheckedChange={(checked) =>
						upsertSetting({ show_impression: checked })
					}
				/>
			</SettingRow>
			<SettingRow
				label={t("memoSection.actionItem")}
				description={t("setting.showActionItemSection")}
				htmlFor="show-action-item"
			>
				<Switch
					id="show-action-item"
					checked={showActionItem}
					onCheckedChange={(checked) =>
						upsertSetting({ show_action_item: checked })
					}
				/>
			</SettingRow>
		</>
	);
};

export default SettingMemoFields;
