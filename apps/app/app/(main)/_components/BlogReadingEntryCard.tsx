import { useBlogReadingSummaryQuery } from "@web-memo/shared/hooks/blog-reading";
import { useRouter } from "expo-router";
import { ChevronRight, ListChecks } from "lucide-react-native";
import { Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getBlogSummaryTotals } from "@/lib/blogReadingSummary";
import { supabase } from "@/lib/supabase/client";

/**
 * 메모 홈 상단의 '블로그 정주행' 진입 카드.
 * @description 로그인 전에도 눌러 들어갈 수 있다(정주행 화면이 로그인 안내를 보여 준다).
 * 로그인하고 구독이 있으면 진행 요약을 함께 보여 주며, 수집 중에는 분모를 표시하지 않는다.
 * 사용처: app/(main)/index.tsx
 */
export function BlogReadingEntryCard() {
	const router = useRouter();
	const isDark = useColorScheme() === "dark";
	const { session } = useAuth();
	const { data: summary } = useBlogReadingSummaryQuery({
		supabaseClient: supabase,
		userId: session?.user.id,
	});
	const totals = getBlogSummaryTotals(summary?.sources ?? []);
	const hasSubscription = (summary?.sources.length ?? 0) > 0;

	let progressText: string | null = null;
	if (hasSubscription && totals.confirmedTotal !== null) {
		progressText = `메모할 글 ${totals.confirmedTotal - totals.completedCount}개`;
	} else if (hasSubscription) {
		progressText = `현재 수집한 글 ${totals.collectedCount}개 · 메모 완료 ${totals.completedCount}개`;
	}

	return (
		<TouchableOpacity
			className="flex-row items-center gap-3 mx-5 mb-3 px-4 py-3.5 bg-card dark:bg-neutral-900 rounded-xl border border-border dark:border-neutral-800"
			onPress={() => router.navigate("/blog-reading")}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel="블로그 정주행 체크리스트 보기"
		>
			<ListChecks size={20} color={isDark ? "#a78bfa" : "#7c3aed"} />
			<View className="flex-1">
				<Text className="text-[15px] font-bold text-foreground dark:text-white">
					블로그 정주행
				</Text>
				{progressText ? (
					<Text className="text-xs font-semibold text-accent dark:text-violet-400 mt-0.5">
						{progressText}
					</Text>
				) : null}
				<Text className="text-[13px] text-muted-foreground dark:text-neutral-400 mt-0.5">
					공개된 글을 처음부터 읽고 메모를 남겨요.
				</Text>
			</View>
			<ChevronRight size={18} color={isDark ? "#737373" : "#999"} />
		</TouchableOpacity>
	);
}
