"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useSettingQuery,
	useSettingUpsertMutation,
} from "@web-memo/shared/hooks";
import { Label, Switch } from "@web-memo/ui";

export default function SettingMemoFields({ lng }: SettingMemoFieldsProps) {
	const { t } = useTranslation(lng);
	const { showImpression, showActionItem } = useSettingQuery();
	const { mutate: upsertSetting } = useSettingUpsertMutation();

	return (
		<div className="grid gap-3">
			<Label className="text-center">{t("setting.memoFields")}</Label>
			<div className="mx-auto flex w-full max-w-xs flex-col gap-3">
				<div className="flex items-center justify-between">
					<Label htmlFor="show-impression">{t("memoSection.impression")}</Label>
					<Switch
						id="show-impression"
						checked={showImpression}
						onCheckedChange={(checked) =>
							upsertSetting({ show_impression: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<Label htmlFor="show-action-item">
						{t("memoSection.actionItem")}
					</Label>
					<Switch
						id="show-action-item"
						checked={showActionItem}
						onCheckedChange={(checked) =>
							upsertSetting({ show_action_item: checked })
						}
					/>
				</div>
			</div>
		</div>
	);
}

interface SettingMemoFieldsProps extends LanguageType {}
