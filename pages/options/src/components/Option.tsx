import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Button,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Switch,
	useToast,
} from "@web-memo/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

export default function Option() {
	const { toast } = useToast();

	const { handleSubmit, setValue, watch } = useForm({
		defaultValues: {
			youtubePrompt: "",
			webPrompt: "",
			language: "ko",
			autoApplyCategory: true,
			textSelectionEnabled: false,
			impressionSectionEnabled: true,
			actionItemSectionEnabled: true,
		},
	});

	const onSubmit = handleSubmit(async (data) => {
		await ChromeSyncStorage.set(
			STORAGE_KEYS.youtubePrompts,
			data.youtubePrompt,
		);
		await ChromeSyncStorage.set(STORAGE_KEYS.webPrompts, data.webPrompt);
		await ChromeSyncStorage.set(STORAGE_KEYS.language, data.language);
		await ChromeSyncStorage.set(
			STORAGE_KEYS.autoApplyCategory,
			data.autoApplyCategory,
		);
		await ChromeSyncStorage.set(
			STORAGE_KEYS.textSelectionEnabled,
			data.textSelectionEnabled,
		);
		await ChromeSyncStorage.set(
			STORAGE_KEYS.impressionSectionEnabled,
			data.impressionSectionEnabled,
		);
		await ChromeSyncStorage.set(
			STORAGE_KEYS.actionItemSectionEnabled,
			data.actionItemSectionEnabled,
		);

		toast({
			title: I18n.get("settings_saved"),
		});
	});

	useEffect(() => {
		const fetchStorage = async () => {
			const language = await ChromeSyncStorage.get<string>(
				STORAGE_KEYS.language,
			);
			const youtubePrompts = await ChromeSyncStorage.get<string>(
				STORAGE_KEYS.youtubePrompts,
			);
			const webPrompts = await ChromeSyncStorage.get<string>(
				STORAGE_KEYS.webPrompts,
			);
			const autoApplyCategory = await ChromeSyncStorage.get<boolean>(
				STORAGE_KEYS.autoApplyCategory,
			);
			const textSelectionEnabled = await ChromeSyncStorage.get<boolean>(
				STORAGE_KEYS.textSelectionEnabled,
			);
			const impressionSectionEnabled = await ChromeSyncStorage.get<boolean>(
				STORAGE_KEYS.impressionSectionEnabled,
			);
			const actionItemSectionEnabled = await ChromeSyncStorage.get<boolean>(
				STORAGE_KEYS.actionItemSectionEnabled,
			);

			setValue("language", language);
			setValue("youtubePrompt", youtubePrompts);
			setValue("webPrompt", webPrompts);
			setValue("autoApplyCategory", autoApplyCategory ?? true);
			setValue("textSelectionEnabled", textSelectionEnabled ?? false);
			setValue("impressionSectionEnabled", impressionSectionEnabled ?? true);
			setValue("actionItemSectionEnabled", actionItemSectionEnabled ?? true);
		};

		fetchStorage();
	}, [setValue]);

	return (
		<div className="container mx-auto space-y-8 p-4">
			<section className="mb-8">
				<h2 className="mb-4 text-xl font-semibold">
					{I18n.get("prompt_language_setting")}
				</h2>
				<Select
					value={watch("language")}
					onValueChange={(value) => setValue("language", value)}
				>
					<SelectTrigger className="w-32">
						<SelectValue
							placeholder={I18n.get("select_language_placeholder")}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ko">한국어</SelectItem>
						<SelectItem value="en-US">English</SelectItem>
					</SelectContent>
				</Select>
			</section>

			<section className="mb-8">
				<h2 className="mb-4 text-xl font-semibold">
					{I18n.get("auto_apply_category_setting")}
				</h2>
				<div className="flex items-center space-x-3">
					<Switch
						id="auto-apply-category"
						checked={watch("autoApplyCategory")}
						onCheckedChange={(checked) =>
							setValue("autoApplyCategory", checked)
						}
					/>
					<Label
						htmlFor="auto-apply-category"
						className="text-sm text-muted-foreground"
					>
						{I18n.get("auto_apply_category_description")}
					</Label>
				</div>
			</section>

			<section className="mb-8">
				<h2 className="mb-4 text-xl font-semibold">
					{I18n.get("memo_section_setting")}
				</h2>
				<div className="flex flex-col gap-3">
					<div className="flex items-center space-x-3">
						<Switch
							id="impression-section-enabled"
							checked={watch("impressionSectionEnabled")}
							onCheckedChange={(checked) =>
								setValue("impressionSectionEnabled", checked)
							}
						/>
						<Label
							htmlFor="impression-section-enabled"
							className="text-sm text-muted-foreground"
						>
							{I18n.get("impression_section_description")}
						</Label>
					</div>
					<div className="flex items-center space-x-3">
						<Switch
							id="action-item-section-enabled"
							checked={watch("actionItemSectionEnabled")}
							onCheckedChange={(checked) =>
								setValue("actionItemSectionEnabled", checked)
							}
						/>
						<Label
							htmlFor="action-item-section-enabled"
							className="text-sm text-muted-foreground"
						>
							{I18n.get("action_item_section_description")}
						</Label>
					</div>
				</div>
			</section>

			<div className="flex gap-2">
				<Button type="submit" onClick={onSubmit}>
					{I18n.get("save")}
				</Button>
			</div>
		</div>
	);
}
