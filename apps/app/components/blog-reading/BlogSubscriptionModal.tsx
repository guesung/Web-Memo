import { BLOG_CATALOG } from "@web-memo/shared/constants/blog-catalog";
import type { TBlogId } from "@web-memo/shared/types/blog-reading";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BlogSubscriptionModalProps {
	visible: boolean;
	subscribedBlogIds: readonly TBlogId[];
	/** 구독 변경 요청 중이면 버튼을 잠근다 */
	isChanging: boolean;
	onClose: () => void;
	onToggleSubscription: (blogId: TBlogId, active: boolean) => void;
}

/**
 * 구독할 블로그를 고르는 바텀 시트 Modal.
 * @description 구독을 해제해도 작성한 메모는 남는다. 사용처: app/blog-reading.tsx
 */
export function BlogSubscriptionModal({
	visible,
	subscribedBlogIds,
	isChanging,
	onClose,
	onToggleSubscription,
}: BlogSubscriptionModalProps) {
	const insets = useSafeAreaInsets();

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View className="flex-1 justify-end">
				<Pressable
					className="absolute inset-0 bg-black/40"
					onPress={onClose}
					accessibilityLabel="블로그 선택 닫기"
				/>
				<View
					className="bg-white dark:bg-neutral-900 rounded-t-[20px] px-5 pt-5"
					style={{ paddingBottom: insets.bottom + 16 }}
					accessibilityViewIsModal
				>
					<Text className="text-lg font-bold text-foreground dark:text-white">
						블로그 선택
					</Text>
					<Text className="text-[13px] text-muted-foreground dark:text-neutral-400 mt-1 mb-2">
						토스와 당근의 공개된 글을 모아 정주행할 수 있어요.
					</Text>
					{BLOG_CATALOG.map((blog) => {
						const isSubscribed = subscribedBlogIds.includes(blog.blogId);

						return (
							<View
								key={blog.blogId}
								className="flex-row items-center justify-between gap-3 py-4 border-b border-border dark:border-neutral-800"
							>
								<View className="flex-1">
									<Text className="text-[15px] font-semibold text-foreground dark:text-white">
										{blog.displayName.ko}
									</Text>
									<Text className="text-xs text-muted-foreground dark:text-neutral-400">
										{blog.homeUrl
											.replace(/^https?:\/\//, "")
											.replace(/\/$/, "")}
									</Text>
								</View>
								<TouchableOpacity
									className={`px-3.5 py-2 rounded-lg border ${isSubscribed ? "border-border dark:border-neutral-700" : "bg-foreground border-foreground dark:bg-white dark:border-white"}`}
									onPress={() =>
										onToggleSubscription(blog.blogId, !isSubscribed)
									}
									disabled={isChanging}
									accessibilityRole="button"
									accessibilityLabel={`${blog.displayName.ko} ${isSubscribed ? "구독 해제" : "구독하기"}`}
								>
									<Text
										className={`text-[13px] font-semibold ${isSubscribed ? "text-foreground dark:text-white" : "text-white dark:text-neutral-900"}`}
									>
										{isSubscribed ? "구독 해제" : "구독하기"}
									</Text>
								</TouchableOpacity>
							</View>
						);
					})}
					<Text className="text-xs text-muted-foreground dark:text-neutral-400 mt-3">
						구독을 해제해도 작성한 메모는 남아요.
					</Text>
					<TouchableOpacity
						className="self-end mt-4 px-4 py-2 rounded-lg border border-border dark:border-neutral-700"
						onPress={onClose}
						accessibilityRole="button"
					>
						<Text className="text-[13px] text-foreground dark:text-white">
							닫기
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}
