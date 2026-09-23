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
	Switch,
	useToast,
} from "@web-memo/ui";
import { useEffect, useState } from "react";

/** 드래그할 때 하이라이트 버블을 띄울지 정하는 카드. 폼 저장 버튼 없이 바로 저장한다. */
export default function HighlightOption() {
	const { isBubbleEnabled, isLoaded, handleBubbleEnabledChange } =
		useHighlightBubbleSetting();

	return (
		<Card>
			<CardHeader>
				<CardTitle asChild>
					<h2 className="text-lg">{I18n.get("highlight_setting")}</h2>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 pb-6">
				<div className="flex items-start gap-3">
					<Switch
						id="highlight-bubble-enabled"
						checked={isBubbleEnabled}
						disabled={!isLoaded}
						onCheckedChange={handleBubbleEnabledChange}
					/>
					<div className="flex flex-col gap-1">
						<Label
							htmlFor="highlight-bubble-enabled"
							className="text-sm font-normal"
						>
							{I18n.get("highlight_bubble_setting")}
						</Label>
						<p className="text-xs text-muted-foreground">
							{I18n.get("highlight_bubble_setting_description")}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/** 버블 설정을 sync에서 읽고 구독하며, 바꾸면 즉시 저장하고 실패하면 되돌린다. */
function useHighlightBubbleSetting() {
	const { toast } = useToast();
	const [isBubbleEnabled, setIsBubbleEnabled] = useState(true);
	const [isLoaded, setIsLoaded] = useState(false);
	useEffect(() => {
		let isStopped = false;
		const readBubbleEnabled = async () => {
			try {
				const storedBubbleEnabled = await ChromeSyncStorage.get<
					boolean | undefined
				>(STORAGE_KEYS.highlightBubbleEnabled);
				if (isStopped) {
					return;
				}
				setIsBubbleEnabled(storedBubbleEnabled ?? true);
				setIsLoaded(true);
			} catch {
				/** 읽지 못하면 잘못된 값을 덮어쓰지 않도록 스위치를 잠가 둔다. */
			}
		};
		void readBubbleEnabled();
		const unsubscribe = ChromeSyncStorage.subscribe<boolean>(
			STORAGE_KEYS.highlightBubbleEnabled,
			(value) => setIsBubbleEnabled(value ?? true),
		);

		return () => {
			isStopped = true;
			unsubscribe();
		};
	}, []);
	const handleBubbleEnabledChange = async (checked: boolean) => {
		const previousBubbleEnabled = isBubbleEnabled;
		setIsBubbleEnabled(checked);
		try {
			await ChromeSyncStorage.set(STORAGE_KEYS.highlightBubbleEnabled, checked);
		} catch {
			setIsBubbleEnabled(previousBubbleEnabled);
			toast({ title: I18n.get("highlight_bubble_setting_save_failed") });

			return;
		}
		analytics.trackEvent({
			name: "extension_setting_change",
			params: { keys: STORAGE_KEYS.highlightBubbleEnabled },
		});
	};

	return { isBubbleEnabled, isLoaded, handleBubbleEnabledChange };
}
