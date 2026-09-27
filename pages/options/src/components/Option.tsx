import { useSuspenseQuery } from "@tanstack/react-query";
import { analytics } from "@web-memo/shared/modules/analytics";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web-memo/ui";

import SaveStatus from "./SaveStatus";
import { useAutoSaveSetting } from "./useAutoSaveSetting";

/** AI 응답 언어 설정을 보여줍니다. */
const Option = () => {
	const storedSettings = useSuspenseQuery({
		queryKey: ["options", "ai-settings"],
		queryFn: async () => {
			const language = await ChromeSyncStorage.get<string>(
				STORAGE_KEYS.language,
			);

			return {
				language: language ?? "ko",
			};
		},
		staleTime: Number.POSITIVE_INFINITY,
	});

	const language = useAutoSaveSetting({
		initialValue: storedSettings.data.language,
		onSave: async (value: string) => {
			await ChromeSyncStorage.set(STORAGE_KEYS.language, value);
			analytics.trackEvent({
				name: "extension_setting_change",
				params: { keys: "language" },
			});
		},
	});

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle asChild>
						<h2 className="text-lg">{I18n.get("highlight_setting")}</h2>
					</CardTitle>
				</CardHeader>
				<CardContent className="pb-6 text-sm text-muted-foreground">
					{I18n.get("highlight_setting_description")}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle asChild>
						<h2 className="text-lg">{I18n.get("ai_setting")}</h2>
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-6 pb-6">
					<div className="flex flex-col gap-2">
						<Label htmlFor="response-language">
							{I18n.get("prompt_language_setting")}
						</Label>
						<div className="flex flex-wrap items-center gap-3">
							<Select
								value={language.value}
								onValueChange={language.changeValue}
							>
								<SelectTrigger id="response-language" className="w-40">
									<SelectValue
										placeholder={I18n.get("select_language_placeholder")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ko">한국어</SelectItem>
									<SelectItem value="en-US">English</SelectItem>
								</SelectContent>
							</Select>
							<SaveStatus
								status={language.status}
								onRetryClick={language.retrySave}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</>
	);
};

export default Option;
