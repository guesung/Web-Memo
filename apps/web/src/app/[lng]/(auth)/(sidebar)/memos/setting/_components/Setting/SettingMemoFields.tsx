"use client";

import { SettingSaveStatus } from "@src/app/[lng]/(no-auth)/settings/_components/SettingSaveStatus";
import { withSettingsTimeout } from "@src/app/[lng]/(no-auth)/settings/_hooks/useExtensionSettings";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useSettingQuery,
	useSettingUpsertMutation,
	useSupabaseUserQuery,
} from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { Switch } from "@web-memo/ui";
import { useState } from "react";

import SettingRow from "./SettingRow";

/** 메모를 쓸 때 느낀 점·액션 아이템 칸을 표시할지 계정에 저장합니다. */
const SettingMemoFields = (props: LanguageType) => {
	const { t } = useTranslation(props.lng);
	const setting = useSettingQuery();

	return (
		<>
			<MemoFieldSetting
				lng={props.lng}
				field="show_impression"
				checked={setting.showImpression}
				label={t("memoSection.impression")}
				description={t("setting.showImpressionSection")}
			/>
			<MemoFieldSetting
				lng={props.lng}
				field="show_action_item"
				checked={setting.showActionItem}
				label={t("memoSection.actionItem")}
				description={t("setting.showActionItemSection")}
			/>
		</>
	);
};

export default SettingMemoFields;

/** 저장·재시도 상태를 서로 공유하지 않는 메모 입력 항목입니다. */
const MemoFieldSetting = (props: IFMemoFieldSettingProps) => {
	const save = useMemoFieldSave(props.field);

	return (
		<SettingRow
			label={props.label}
			description={props.description}
			htmlFor={props.field}
		>
			<div className="space-y-2">
				<Switch
					id={props.field}
					checked={props.checked}
					disabled={save.status === "saving"}
					onCheckedChange={save.handleValueChange}
				/>
				<SettingSaveStatus
					lng={props.lng}
					status={save.status}
					onRetryClick={save.handleRetryClick}
				/>
			</div>
		</SettingRow>
	);
};

/** 서버 저장 성공과 확장의 보조 갱신 알림을 분리합니다. */
const useMemoFieldSave = (field: TFieldKey) => {
	const mutation = useSettingUpsertMutation();
	const account = useSupabaseUserQuery();
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">(
		"idle",
	);
	const [pendingValue, setPendingValue] = useState<boolean | null>(null);

	const notifyExtension = async () => {
		const userId = account.data.data.user?.id;
		if (!userId) {
			return;
		}

		try {
			await withSettingsTimeout(
				bridge.request.NOTIFY_SETTING_UPDATED({ userId }),
			);
		} catch {
			/** 확장 미연결은 이미 성공한 계정 저장에 영향을 주지 않습니다. */
		}
	};

	const handleValueChange = async (value: boolean) => {
		setPendingValue(value);
		setStatus("saving");
		try {
			await mutation.mutateAsync({ [field]: value });
			setStatus("saved");
			void notifyExtension();
		} catch {
			setStatus("failed");
		}
	};

	const handleRetryClick = () => {
		if (pendingValue !== null) {
			void handleValueChange(pendingValue);
		}
	};

	return { status, handleValueChange, handleRetryClick };
};

/** 계정 메모 입력 설정 키입니다. */
type TFieldKey = "show_impression" | "show_action_item";

/** 개별 메모 입력 항목에 표시하는 내용과 서버 값입니다. */
interface IFMemoFieldSettingProps extends LanguageType {
	field: TFieldKey;
	checked: boolean;
	label: string;
	description: string;
}
