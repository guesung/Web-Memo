import { DEFAULT_PROMPTS } from "@web-memo/shared/constants";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Button,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Textarea,
	useToast,
} from "@web-memo/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

export default function Option() {
	const { toast } = useToast();

	const { register, handleSubmit, setValue, watch } = useForm({
		defaultValues: {
			youtubePrompt: "",
			webPrompt: "",
			language: "ko",
		},
	});

	const onSubmit = handleSubmit(async (data) => {
		await ChromeSyncStorage.set(
			STORAGE_KEYS.youtubePrompts,
			data.youtubePrompt,
		);
		await ChromeSyncStorage.set(STORAGE_KEYS.webPrompts, data.webPrompt);
		await ChromeSyncStorage.set(STORAGE_KEYS.language, data.language);

		toast({
			title: I18n.get("settings_saved"),
		});
	});

	const onReset = async () => {
		const currentLanguage = watch("language");
		const languageKey = currentLanguage === "ko" ? "ko" : "en";

		const defaultYoutubePrompt = DEFAULT_PROMPTS.youtube[languageKey];
		const defaultWebPrompt = DEFAULT_PROMPTS.web[languageKey];

		setValue("youtubePrompt", defaultYoutubePrompt);
		setValue("webPrompt", defaultWebPrompt);

		toast({
			title: I18n.get("settings_reset"),
		});
	};

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

			setValue("language", language);
			setValue("youtubePrompt", youtubePrompts);
			setValue("webPrompt", webPrompts);
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

			<form onSubmit={onSubmit} className="space-y-8">
				<section>
					<h2 className="mb-4 text-xl font-semibold">
						{I18n.get("youtube_prompt_setting")}
					</h2>
					<div className="space-y-2 rounded-lg p-4">
						<div className="flex-1">
							<Textarea
								placeholder={I18n.get("enter_prompt")}
								{...register("youtubePrompt")}
								className="min-h-[200px]"
							/>
						</div>
					</div>
				</section>

				<section>
					<h2 className="mb-4 text-xl font-semibold">
						{I18n.get("website_prompt_setting")}
					</h2>
					<div className="space-y-2 rounded-lg p-4">
						<div className="flex-1">
							<Textarea
								placeholder={I18n.get("enter_prompt")}
								{...register("webPrompt")}
								className="min-h-[200px]"
							/>
						</div>
					</div>
				</section>

				<div className="flex gap-2">
					<Button type="button" variant="outline" onClick={onReset}>
						{I18n.get("reset")}
					</Button>
					<Button type="submit">{I18n.get("save")}</Button>
				</div>
			</form>
		</div>
	);
}
