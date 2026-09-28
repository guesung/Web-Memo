import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { Commands, I18n, Tab } from "@web-memo/shared/utils/extension";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Skeleton,
	useToast,
} from "@web-memo/ui";
import { ExternalLink, Keyboard } from "lucide-react";

/** 사이드 패널을 여는 `_execute_action` 단축키를 보여주고, 변경 페이지로 이동시키는 설정 카드. */
const ShortcutOption = () => {
	const shortcut = useActionShortcut();

	return (
		<Card>
			<CardHeader>
				<CardTitle asChild>
					<h2 className="text-lg">{I18n.get("shortcut_setting")}</h2>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3 pb-6">
				<div className="flex items-center justify-between gap-3">
					<span className="text-sm">
						{I18n.get("shortcut_open_side_panel")}
					</span>
					<ShortcutBadge
						isPending={shortcut.isPending}
						isError={shortcut.isError}
						shortcutKey={shortcut.data}
					/>
				</div>
				<p className="text-xs text-muted-foreground">
					{I18n.get("shortcut_setting_description")}
				</p>
				<Button
					variant="outline"
					size="sm"
					className="w-fit"
					onClick={shortcut.handleChangeShortcutClick}
				>
					<Keyboard className="size-4" />
					{I18n.get("shortcut_change")}
					<ExternalLink className="size-4" />
				</Button>
			</CardContent>
		</Card>
	);
};

/** 조회 상태에 따라 단축키 배지 또는 안내 문구를 보여준다. */
const ShortcutBadge = (props: IFShortcutBadgeProps) => {
	if (props.isPending) {
		return <Skeleton className="h-5 w-12" />;
	}

	if (props.isError) {
		return (
			<span className="text-xs text-muted-foreground">
				{I18n.get("shortcut_load_failed")}
			</span>
		);
	}

	if (!props.shortcutKey) {
		return (
			<span className="text-xs text-muted-foreground">
				{I18n.get("shortcut_not_set")}
			</span>
		);
	}

	return <Badge variant="outline">{props.shortcutKey}</Badge>;
};

export default ShortcutOption;

/** 단축키를 조회하고, 단축키 변경 페이지로 이동한다. */
const useActionShortcut = () => {
	const { toast } = useToast();
	const query = useQuery({
		queryKey: QUERY_KEY.shortcut(),
		queryFn: () => Commands.getActionShortcut(),
	});

	const handleChangeShortcutClick = async () => {
		try {
			await Tab.create({ url: "chrome://extensions/shortcuts" });
		} catch {
			toast({ title: I18n.get("shortcut_open_settings_failed") });
		}
	};

	return {
		data: query.data,
		isPending: query.isPending,
		isError: query.isError,
		handleChangeShortcutClick,
	};
};

/** {@link ShortcutBadge}가 상태별로 표시할 값. */
interface IFShortcutBadgeProps {
	isPending: boolean;
	isError: boolean;
	shortcutKey: string | undefined;
}
