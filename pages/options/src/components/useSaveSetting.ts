import { useSettingUpsertMutation } from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { SettingTable } from "@web-memo/shared/types";

type SettingRequest = Partial<
	Pick<
		SettingTable["Insert"],
		"show_impression" | "show_action_item" | "show_summary" | "show_ai_chat"
	>
>;

/**
 * 설정을 저장하고 열려 있는 사이드 패널에 변경을 알린다.
 * @description 저장 실패는 던진다. 사이드 패널이 닫혀 있어 알림을 받을 곳이 없는 경우는 실패로 보지 않는다.
 */
export const useSaveSetting = () => {
	const settingMutation = useSettingUpsertMutation();

	return async (request: SettingRequest) => {
		const result = await settingMutation.mutateAsync(request);
		if (result.error) {
			throw result.error;
		}

		const userId = result.data?.user_id;
		if (userId) {
			try {
				await bridge.request.SETTING_UPDATED({ userId });
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.includes("Receiving end does not exist")
				) {
					return;
				}
				console.error("Setting update notification failed", error);
			}
		}
	};
};
