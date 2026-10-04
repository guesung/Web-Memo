import type { IFBlogArticleItem } from "@web-memo/shared/types/blog-reading";
import { hasMemoContent } from "@web-memo/shared/utils/blog-reading";
import { X } from "lucide-react-native";
import { type ComponentProps, useEffect, useState } from "react";
import { Modal, Pressable, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MemoDetailModal } from "@/app/(main)/_components/MemoDetailModal";
import { MemoCandidateChooser } from "@/app/(main)/browser/_components/MemoCandidateChooser";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseMemoByUrl } from "@/lib/hooks/useMemoByUrl";

interface BlogMemoViewerProps {
	/** 메모를 볼 글. null이면 닫힌 상태 */
	article: IFBlogArticleItem | null;
	onClose: () => void;
	onNavigate: (url: string) => void;
	/** 조회를 마쳤는데 볼 메모가 없을 때 */
	onMemoNotFound: () => void;
	onSave: ComponentProps<typeof MemoDetailModal>["onSave"];
}

/**
 * 정주행 글의 메모를 기존 `MemoDetailModal`로 보여 준다.
 * @description 유효한 메모가 여러 개면 브라우저 메모 패널과 같은 `MemoCandidateChooser`로 먼저 고르게 한다.
 * 글이 바뀔 때 선택 상태가 남지 않도록 부모가 `key`로 글을 구분해야 한다. 사용처: app/blog-reading.tsx
 */
export function BlogMemoViewer({
	article,
	onClose,
	onNavigate,
	onMemoNotFound,
	onSave,
}: BlogMemoViewerProps) {
	const insets = useSafeAreaInsets();
	const { isLoggedIn } = useAuth();
	const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null);
	const { data: memos, isSuccess } = useSupabaseMemoByUrl(
		article?.url ?? "",
		Boolean(article) && isLoggedIn,
	);
	const validMemos = (memos ?? []).filter(hasMemoContent);
	const candidates = validMemos.length > 0 ? validMemos : (memos ?? []);
	const selectedMemo =
		candidates.length === 1
			? candidates[0]
			: (candidates.find((memo) => memo.id === selectedMemoId) ?? null);
	const isChoosing = candidates.length > 1 && selectedMemo === null;
	const isMemoMissing = isSuccess && candidates.length === 0;

	useEffect(() => {
		if (article && isMemoMissing) {
			onMemoNotFound();
		}
	}, [article, isMemoMissing, onMemoNotFound]);

	return (
		<>
			<Modal
				visible={Boolean(article) && isChoosing}
				transparent
				animationType="slide"
				statusBarTranslucent
				onRequestClose={onClose}
			>
				<View className="flex-1 justify-end">
					<Pressable
						className="absolute inset-0 bg-black/40"
						onPress={onClose}
					/>
					<View
						className="bg-white dark:bg-neutral-900 rounded-t-[20px] max-h-[70%]"
						style={{ paddingBottom: insets.bottom + 16 }}
					>
						<TouchableOpacity
							className="self-end p-4"
							onPress={onClose}
							accessibilityRole="button"
							accessibilityLabel="닫기"
						>
							<X size={20} color="#999" />
						</TouchableOpacity>
						<MemoCandidateChooser
							selectedMemoId={selectedMemoId}
							pendingLocalCount={0}
							hasPendingShare={false}
							candidates={candidates}
							isPending={false}
							onSelectionChange={(id) =>
								setSelectedMemoId(typeof id === "number" ? id : null)
							}
						/>
					</View>
				</View>
			</Modal>
			<MemoDetailModal
				memo={article ? selectedMemo : null}
				onClose={onClose}
				onNavigate={onNavigate}
				onSave={onSave}
			/>
		</>
	);
}
