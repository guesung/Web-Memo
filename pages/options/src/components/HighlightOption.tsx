import { analytics } from "@web-memo/shared/modules/analytics";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
	type StorageKeyType,
} from "@web-memo/shared/modules/chrome-storage";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Label,
	Switch,
	useToast,
} from "@web-memo/ui";
import { useEffect, useState } from "react";

/** 하이라이트 팝업의 표시 여부·위치와 사이트별 예외를 즉시 저장하는 설정 카드. */
const HighlightOption = () => {
	const setting = useHighlightBubbleSetting();

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
						checked={setting.isBubbleEnabled}
						disabled={!setting.isLoaded || setting.isSaving}
						onCheckedChange={setting.handleBubbleEnabledChange}
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
				<div className="flex flex-col gap-2">
					<Label htmlFor="highlight-bubble-position">
						{I18n.get("highlight_bubble_position_setting")}
					</Label>
					<select
						id="highlight-bubble-position"
						className="h-10 rounded-md border border-input bg-background px-3 text-sm"
						value={setting.bubblePosition}
						disabled={!setting.isLoaded || setting.isSaving}
						onChange={(event) =>
							setting.handleBubblePositionChange(event.target.value)
						}
					>
						<option value="below">
							{I18n.get("highlight_bubble_position_below")}
						</option>
						<option value="above">
							{I18n.get("highlight_bubble_position_above")}
						</option>
					</select>
				</div>
				<div className="flex flex-col gap-2">
					<h3 className="text-sm font-medium">
						{I18n.get("highlight_disabled_sites_setting")}
					</h3>
					{setting.disabledSites.length === 0 && (
						<p className="text-xs text-muted-foreground">
							{I18n.get("highlight_disabled_sites_empty")}
						</p>
					)}
					<ul className="space-y-2">
						{setting.disabledSites.map((hostname) => (
							<li
								key={hostname}
								className="flex items-center justify-between gap-3"
							>
								<span className="min-w-0 break-all text-sm">{hostname}</span>
								<Button
									variant="outline"
									size="sm"
									className="shrink-0"
									disabled={!setting.isLoaded || setting.isSaving}
									aria-label={`${hostname}: ${I18n.get("highlight_site_enable")}`}
									onClick={() => setting.handleSiteEnableClick(hostname)}
								>
									{I18n.get("highlight_site_enable")}
								</Button>
							</li>
						))}
					</ul>
				</div>
			</CardContent>
		</Card>
	);
};

export default HighlightOption;

/** sync 설정을 구독하고 저장 실패 시 기존 UI 값을 유지한다. */
const useHighlightBubbleSetting = () => {
	const { toast } = useToast();
	const [isBubbleEnabled, setIsBubbleEnabled] = useState(true);
	const [bubblePosition, setBubblePosition] = useState("below");
	const [disabledSites, setDisabledSites] = useState<string[]>([]);
	const [isLoaded, setIsLoaded] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	useEffect(() => {
		let isStopped = false;
		const readSettings = async () => {
			try {
				const [enabled, position, sites] = await Promise.all([
					ChromeSyncStorage.get<boolean | undefined>(
						STORAGE_KEYS.highlightBubbleEnabled,
					),
					ChromeSyncStorage.get<string | undefined>(
						STORAGE_KEYS.highlightBubblePosition,
					),
					ChromeSyncStorage.get<string[] | undefined>(
						STORAGE_KEYS.highlightDisabledSites,
					),
				]);
				if (isStopped) {
					return;
				}
				setIsBubbleEnabled(enabled ?? true);
				setBubblePosition(position === "above" ? "above" : "below");
				setDisabledSites(sites ?? []);
				setIsLoaded(true);
			} catch {
				/** 읽지 못한 설정을 기본값으로 덮어쓰지 않도록 입력을 잠근다. */
			}
		};
		void readSettings();
		const unsubscribers = [
			ChromeSyncStorage.subscribe<boolean>(
				STORAGE_KEYS.highlightBubbleEnabled,
				(value) => setIsBubbleEnabled(value ?? true),
			),
			ChromeSyncStorage.subscribe<string>(
				STORAGE_KEYS.highlightBubblePosition,
				(value) => setBubblePosition(value === "above" ? "above" : "below"),
			),
			ChromeSyncStorage.subscribe<string[]>(
				STORAGE_KEYS.highlightDisabledSites,
				(value) => setDisabledSites(value ?? []),
			),
		];

		return () => {
			isStopped = true;
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
		};
	}, []);
	const saveSetting = async (options: IFSaveHighlightSettingOptions) => {
		setIsSaving(true);
		try {
			await ChromeSyncStorage.set(options.key, options.value);
			options.onSaved();
			analytics.trackEvent({
				name: "extension_setting_change",
				params: { keys: options.key },
			});
		} catch {
			toast({ title: I18n.get("highlight_bubble_setting_save_failed") });
		} finally {
			setIsSaving(false);
		}
	};
	const handleBubbleEnabledChange = async (checked: boolean) => {
		await saveSetting({
			key: STORAGE_KEYS.highlightBubbleEnabled,
			value: checked,
			onSaved: () => setIsBubbleEnabled(checked),
		});
	};
	const handleBubblePositionChange = async (position: string) => {
		if (position !== "above" && position !== "below") {
			return;
		}
		await saveSetting({
			key: STORAGE_KEYS.highlightBubblePosition,
			value: position,
			onSaved: () => setBubblePosition(position),
		});
	};
	const handleSiteEnableClick = async (hostname: string) => {
		const nextDisabledSites = disabledSites.filter((site) => site !== hostname);
		await saveSetting({
			key: STORAGE_KEYS.highlightDisabledSites,
			value: nextDisabledSites,
			onSaved: () => setDisabledSites(nextDisabledSites),
		});
	};

	return {
		isBubbleEnabled,
		bubblePosition,
		disabledSites,
		isLoaded,
		isSaving,
		handleBubbleEnabledChange,
		handleBubblePositionChange,
		handleSiteEnableClick,
	};
};

/** 즉시 저장할 설정과 저장 성공 후 UI 반영 함수. */
interface IFSaveHighlightSettingOptions {
	key: StorageKeyType;
	value: unknown;
	onSaved: () => void;
}
