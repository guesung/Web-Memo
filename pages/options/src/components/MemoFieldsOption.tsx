import {
	useSettingQuery,
	useSettingUpsertMutation,
} from "@web-memo/shared/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import { Label, Switch } from "@web-memo/ui";

export default function MemoFieldsOption() {
	const { showImpression, showActionItem } = useSettingQuery();
	const { mutate: upsertSetting } = useSettingUpsertMutation();

	return (
		<section className="mb-8">
			<h2 className="mb-4 text-xl font-semibold">
				{I18n.get("memo_fields_setting")}
			</h2>
			<div className="flex flex-col gap-3">
				<div className="flex items-center space-x-3">
					<Switch
						id="show-impression"
						checked={showImpression}
						onCheckedChange={(checked) =>
							upsertSetting({ show_impression: checked })
						}
					/>
					<Label
						htmlFor="show-impression"
						className="text-sm text-muted-foreground"
					>
						{I18n.get("show_impression_setting")}
					</Label>
				</div>
				<div className="flex items-center space-x-3">
					<Switch
						id="show-action-item"
						checked={showActionItem}
						onCheckedChange={(checked) =>
							upsertSetting({ show_action_item: checked })
						}
					/>
					<Label
						htmlFor="show-action-item"
						className="text-sm text-muted-foreground"
					>
						{I18n.get("show_action_item_setting")}
					</Label>
				</div>
			</div>
		</section>
	);
}
