import { useSettingQuery } from "@web-memo/shared/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Label,
	Switch,
} from "@web-memo/ui";

import SaveStatus from "./SaveStatus";
import { useAutoSaveSetting } from "./useAutoSaveSetting";
import { useSaveSetting } from "./useSaveSetting";

/** 요약 진입 안내와 AI 채팅 표시 설정을 제공합니다. */
const AiFeaturesOption = () => {
	const setting = useSettingQuery();
	const saveSetting = useSaveSetting();

	const chat = useAutoSaveSetting({
		initialValue: setting.showAiChat,
		onSave: async (value: boolean) => {
			await saveSetting({ show_ai_chat: value });
		},
	});
	if (setting.data.error) {
		throw setting.data.error;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle asChild>
					<h2 className="text-lg">{I18n.get("ai_features_setting")}</h2>
				</CardTitle>
				<CardDescription>{I18n.get("ai_features_description")}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 pb-6">
				<p className="text-sm text-muted-foreground">
					{I18n.get("summary_panel_hint")}
				</p>
				<div className="flex flex-wrap items-center gap-3">
					<Switch
						id="ai-chat-enabled"
						checked={chat.value}
						onCheckedChange={chat.changeValue}
					/>
					<Label htmlFor="ai-chat-enabled" className="text-sm font-normal">
						{I18n.get("ai_chat_enabled_setting")}
					</Label>
					<SaveStatus status={chat.status} onRetryClick={chat.retrySave} />
				</div>
			</CardContent>
		</Card>
	);
};

export default AiFeaturesOption;
