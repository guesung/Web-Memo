"use client";

import { useMemoSectionVisibility } from "@src/app/[lng]/(auth)/memos/_hooks";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Label, Switch } from "@web-memo/ui";

interface SettingMemoSectionProps extends LanguageType {}

/**
 * 메모 작성 화면의 느낀 점·액션 아이템 입력란 노출 여부를 켜고 끄는 설정.
 */
export default function SettingMemoSection({ lng }: SettingMemoSectionProps) {
	const { t } = useTranslation(lng);
	const {
		isImpressionSectionEnabled,
		isActionItemSectionEnabled,
		setImpressionSectionEnabled,
		setActionItemSectionEnabled,
	} = useMemoSectionVisibility();

	return (
		<div className="grid grid-cols-12">
			<Label className="col-span-4 grid place-items-center">
				{t("setting.memoSection")}
			</Label>
			<div className="col-span-8 flex flex-col gap-3">
				<div className="flex items-center gap-3">
					<Switch
						id="impression-section-enabled"
						checked={isImpressionSectionEnabled}
						onCheckedChange={setImpressionSectionEnabled}
					/>
					<Label
						htmlFor="impression-section-enabled"
						className="text-sm text-muted-foreground"
					>
						{t("setting.showImpressionSection")}
					</Label>
				</div>
				<div className="flex items-center gap-3">
					<Switch
						id="action-item-section-enabled"
						checked={isActionItemSectionEnabled}
						onCheckedChange={setActionItemSectionEnabled}
					/>
					<Label
						htmlFor="action-item-section-enabled"
						className="text-sm text-muted-foreground"
					>
						{t("setting.showActionItemSection")}
					</Label>
				</div>
			</div>
		</div>
	);
}
