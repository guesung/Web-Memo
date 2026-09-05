import {
	useSettingQuery,
	useSettingUpsertMutation,
} from "@web-memo/shared/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Label,
	Switch,
} from "@web-memo/ui";

export default function MemoFieldsOption() {
	const { showImpression, showActionItem } = useSettingQuery();
	const { mutate: upsertSetting } = useSettingUpsertMutation();

	return (
		<Card>
			<CardHeader>
				<CardTitle asChild>
					<h2 className="text-lg">{I18n.get("memo_fields_setting")}</h2>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 pb-6">
				<div className="flex items-center gap-3">
					<Switch
						id="show-impression"
						checked={showImpression}
						onCheckedChange={(checked) =>
							upsertSetting({ show_impression: checked })
						}
					/>
					<Label htmlFor="show-impression" className="text-sm font-normal">
						{I18n.get("show_impression_setting")}
					</Label>
				</div>
				<div className="flex items-center gap-3">
					<Switch
						id="show-action-item"
						checked={showActionItem}
						onCheckedChange={(checked) =>
							upsertSetting({ show_action_item: checked })
						}
					/>
					<Label htmlFor="show-action-item" className="text-sm font-normal">
						{I18n.get("show_action_item_setting")}
					</Label>
				</div>
			</CardContent>
		</Card>
	);
}
