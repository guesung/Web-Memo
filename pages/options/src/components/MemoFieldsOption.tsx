import {
	useSettingQuery,
	useSettingUpsertMutation,
} from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Label,
	Switch,
} from "@web-memo/ui";

import SaveStatus from "./SaveStatus";
import { useAutoSaveSetting } from "./useAutoSaveSetting";

/** 메모 작성 화면에서 표시할 입력 항목을 자동 저장합니다. */
const MemoFieldsOption = () => {
	const setting = useSettingQuery();
	const settingMutation = useSettingUpsertMutation();

	const saveSetting = async (request: {
		show_impression?: boolean;
		show_action_item?: boolean;
	}) => {
		const result = await settingMutation.mutateAsync(request);
		if (result.error) {
			throw result.error;
		}

		const userId = result.data?.user_id;
		if (userId) {
			try {
				await bridge.request.SETTING_UPDATED({ userId });
			} catch {
				// 열린 패널이 없어도 저장 결과는 성공입니다.
			}
		}
	};

	const impression = useAutoSaveSetting({
		initialValue: setting.showImpression,
		onSave: async (value: boolean) => {
			await saveSetting({ show_impression: value });
		},
	});
	const actionItem = useAutoSaveSetting({
		initialValue: setting.showActionItem,
		onSave: async (value: boolean) => {
			await saveSetting({ show_action_item: value });
		},
	});
	if (setting.data.error) {
		throw setting.data.error;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle asChild>
					<h2 className="text-lg">{I18n.get("memo_fields_setting")}</h2>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 pb-6">
				<div className="flex flex-wrap items-center gap-3">
					<Switch
						id="show-impression"
						checked={impression.value}
						onCheckedChange={impression.changeValue}
					/>
					<Label htmlFor="show-impression" className="text-sm font-normal">
						{I18n.get("show_impression_setting")}
					</Label>
					<SaveStatus
						status={impression.status}
						onRetryClick={impression.retrySave}
					/>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Switch
						id="show-action-item"
						checked={actionItem.value}
						onCheckedChange={actionItem.changeValue}
					/>
					<Label htmlFor="show-action-item" className="text-sm font-normal">
						{I18n.get("show_action_item_setting")}
					</Label>
					<SaveStatus
						status={actionItem.status}
						onRetryClick={actionItem.retrySave}
					/>
				</div>
			</CardContent>
		</Card>
	);
};

export default MemoFieldsOption;
