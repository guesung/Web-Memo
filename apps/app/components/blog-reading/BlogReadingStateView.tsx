import { RotateCw } from "lucide-react-native";
import {
	ActivityIndicator,
	Text,
	TouchableOpacity,
	useColorScheme,
	View,
} from "react-native";

/** 목록 대신 전체 화면으로 보여 주는 상태 */
export type TBlogReadingFullState =
	| "loading"
	| "login"
	| "empty"
	| "error"
	| "offline";

interface BlogReadingStateViewProps {
	state: TBlogReadingFullState;
	onLogin: () => void;
	onSelectBlog: () => void;
	onRetry: () => void;
}

/**
 * 로딩·로그인 필요·구독 없음·오류·오프라인 상태 화면.
 * @description 오류/오프라인은 구독이 저장되어 있다는 사실을 함께 알리고 다시 시도를 제공한다.
 * 사용처: app/blog-reading.tsx
 */
export function BlogReadingStateView({
	state,
	onLogin,
	onSelectBlog,
	onRetry,
}: BlogReadingStateViewProps) {
	const isDark = useColorScheme() === "dark";

	if (state === "loading") {
		return (
			<View
				className="px-5 pt-4 gap-3"
				accessibilityLabel="글을 불러오고 있어요"
			>
				<Text className="text-[15px] font-semibold text-foreground dark:text-white">
					글을 불러오고 있어요
				</Text>
				<ActivityIndicator />
				{[0, 1, 2, 3].map((key) => (
					<View key={key} className="gap-2 py-3">
						<View className="h-4 w-3/4 rounded bg-muted dark:bg-neutral-800" />
						<View className="h-3 w-1/3 rounded bg-muted dark:bg-neutral-800" />
					</View>
				))}
			</View>
		);
	}

	const content = {
		login: {
			title: "로그인하고 이어서 읽어요",
			description: "앱과 웹에서 같은 체크리스트를 볼 수 있어요.",
			actionLabel: "로그인하기",
			onAction: onLogin,
		},
		empty: {
			title: "아직 구독한 블로그가 없어요",
			description: "읽고 싶은 블로그를 골라보세요.",
			actionLabel: "블로그 선택",
			onAction: onSelectBlog,
		},
		error: {
			title: "글 목록을 가져오지 못했어요",
			description: "구독은 저장되어 있어요. 잠시 후 다시 시도해 주세요.",
			actionLabel: "다시 시도",
			onAction: onRetry,
		},
		offline: {
			title: "네트워크에 연결되어 있지 않아요",
			description:
				"구독은 저장되어 있어요. 연결을 확인하고 다시 시도해 주세요.",
			actionLabel: "다시 시도",
			onAction: onRetry,
		},
	}[state];

	return (
		<View className="items-center px-6 pt-16 gap-3">
			{state === "error" || state === "offline" ? (
				<RotateCw size={28} color={isDark ? "#737373" : "#999"} />
			) : null}
			<Text className="text-lg font-bold text-foreground dark:text-white text-center">
				{content.title}
			</Text>
			<Text className="text-[13px] text-muted-foreground dark:text-neutral-400 text-center">
				{content.description}
			</Text>
			<TouchableOpacity
				className="mt-2 px-5 py-3 rounded-3xl bg-foreground dark:bg-neutral-700"
				onPress={content.onAction}
				accessibilityRole="button"
			>
				<Text className="text-sm font-semibold text-white">
					{content.actionLabel}
				</Text>
			</TouchableOpacity>
		</View>
	);
}
