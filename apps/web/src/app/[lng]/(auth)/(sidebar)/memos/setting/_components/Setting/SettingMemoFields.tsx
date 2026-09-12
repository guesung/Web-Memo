"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useSettingQuery,
	useSettingUpsertMutation,
} from "@web-memo/shared/hooks";
import { Switch } from "@web-memo/ui";

import SettingRow from "./SettingRow";

interface IFSettingMemoFieldsProps extends LanguageType {}

/** 메모를 쓸 때 느낀 점·액션 아이템 칸을 보여줄지 정하는 설정 */
export default function SettingMemoFields({ lng }: IFSettingMemoFieldsProps) {
	const { t } = useTranslation(lng);
	const { showImpression, showActionItem } = useSettingQuery();
	const { mutate: upsertSetting } = useSettingUpsertMutation();

	return (
		<>
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
}
