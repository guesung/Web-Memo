import { BookOpen } from "lucide-react-native";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocalMemos } from "@/lib/hooks/useLocalMemos";
import { useMemosInfinite } from "@/lib/hooks/useMemos";
import type { MemoItem } from "./MemoCard";

interface TodayArticlesProps {
	onPressArticle: (url: string) => void;
}

/** 위시 메모 중 날짜 기반 랜덤으로 3개를 골라 보여주는 '오늘 읽을 아티클' 섹션 */
export function TodayArticles({ onPressArticle }: TodayArticlesProps) {
	const { isLoggedIn } = useAuth();
	const { data: supabaseWishData } = useMemosInfinite(
		isLoggedIn ? { isWish: true } : undefined,
	);
	const { data: localMemosData } = useLocalMemos();

	// ponytail: 최근 위시 메모(첫 페이지 20개) 풀에서 선정, 전체 풀이 필요해지면 별도 쿼리로 확장
	const wishMemos: MemoItem[] = isLoggedIn
		? (supabaseWishData?.pages.flatMap((p) => p.data) ?? [])
		: (localMemosData ?? []).filter((memo) => memo.isWish);

	const todayArticleList = pickTodayArticles(wishMemos);

	if (todayArticleList.length === 0) {
		return null;
	}

	return (
		<View className="mb-4">
			<View className="flex-row items-center gap-1.5 mb-2.5">
				<BookOpen size={16} color="#a855f7" />
				<Text className="text-[15px] font-bold text-foreground dark:text-white">
					오늘 읽을 아티클
				</Text>
			</View>
			<View className="gap-2">
				{todayArticleList.map((memo) => (
					<TouchableOpacity
						key={memo.id}
						className="flex-row items-center gap-2.5 rounded-xl border-2 border-muted dark:border-neutral-800 bg-card dark:bg-neutral-900 px-3.5 py-3"
						onPress={() => onPressArticle(memo.url)}
						activeOpacity={0.7}
					>
						{memo.favIconUrl ? (
							<Image
								source={{ uri: memo.favIconUrl }}
								style={{ width: 20, height: 20, borderRadius: 4 }}
							/>
						) : (
							<BookOpen size={20} color="#9ca3af" />
						)}
						<Text
							className="flex-1 text-sm text-secondary-foreground dark:text-neutral-300"
							numberOfLines={1}
						>
							{memo.title}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
}

/** 날짜(YYYY-MM-DD)를 seed로 한 결정적 셔플로 위시 메모에서 최대 3개를 고르는 함수 */
const pickTodayArticles = (memos: MemoItem[]): MemoItem[] => {
	const todaySeedText = new Date().toISOString().slice(0, 10);

	let seed = 0;
	for (const char of todaySeedText) {
		seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
	}

	const random = () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;

		return seed / 2 ** 32;
	};

	const shuffledMemoList = [...memos];
	for (let i = shuffledMemoList.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[shuffledMemoList[i], shuffledMemoList[j]] = [
			shuffledMemoList[j],
			shuffledMemoList[i],
		];
	}

	return shuffledMemoList.slice(0, 3);
};
