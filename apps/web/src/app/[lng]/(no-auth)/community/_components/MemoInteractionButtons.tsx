"use client";

import {
	useLikeMemoMutation,
	useUnlikeMemoMutation,
	useBookmarkMemoMutation,
	useUnbookmarkMemoMutation,
} from "@web-memo/shared/hooks";
import type { PublicMemo } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Button } from "@web-memo/ui";
import { Bookmark, Heart, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useOptimistic } from "react";

interface MemoInteractionButtonsProps {
	memo: PublicMemo;
	currentUserId?: string;
	compact?: boolean;
	showCommentLink?: boolean;
	lng?: string;
}

export function MemoInteractionButtons({
	memo,
	currentUserId,
	compact = false,
	showCommentLink = true,
	lng = "ko",
}: MemoInteractionButtonsProps) {
	const likeMutation = useLikeMemoMutation();
	const unlikeMutation = useUnlikeMemoMutation();
	const bookmarkMutation = useBookmarkMemoMutation();
	const unbookmarkMutation = useUnbookmarkMemoMutation();

	const [optimisticLiked, setOptimisticLiked] = useOptimistic(memo.is_liked);
	const [optimisticLikeCount, setOptimisticLikeCount] = useOptimistic(
		memo.like_count,
	);
	const [optimisticBookmarked, setOptimisticBookmarked] = useOptimistic(
		memo.is_bookmarked,
	);
	const [optimisticBookmarkCount, setOptimisticBookmarkCount] = useOptimistic(
		memo.bookmark_count,
	);

	const handleLike = async () => {
		if (!currentUserId) return;

		if (optimisticLiked) {
			setOptimisticLiked(false);
			setOptimisticLikeCount(Math.max(0, optimisticLikeCount - 1));
			await unlikeMutation.mutateAsync({
				memoId: memo.id,
				userId: currentUserId,
			});
		} else {
			setOptimisticLiked(true);
			setOptimisticLikeCount(optimisticLikeCount + 1);
			await likeMutation.mutateAsync({
				memoId: memo.id,
				userId: currentUserId,
			});
		}
	};

	const handleBookmark = async () => {
		if (!currentUserId) return;

		if (optimisticBookmarked) {
			setOptimisticBookmarked(false);
			setOptimisticBookmarkCount(Math.max(0, optimisticBookmarkCount - 1));
			await unbookmarkMutation.mutateAsync({
				memoId: memo.id,
				userId: currentUserId,
			});
		} else {
			setOptimisticBookmarked(true);
			setOptimisticBookmarkCount(optimisticBookmarkCount + 1);
			await bookmarkMutation.mutateAsync({
				memoId: memo.id,
				userId: currentUserId,
			});
		}
	};

	const buttonSize = compact ? "h-7 px-2" : "h-8 px-3";
	const iconSize = compact ? "w-3.5 h-3.5" : "w-4 h-4";
	const textSize = compact ? "text-xs" : "text-sm";

	return (
		<div className="flex items-center gap-1">
			<Button
				variant="ghost"
				size="sm"
				className={cn(
					buttonSize,
					"gap-1",
					optimisticLiked
						? "text-red-500 hover:text-red-600"
						: "text-gray-500 hover:text-red-500",
				)}
				onClick={handleLike}
				disabled={!currentUserId}
			>
				<Heart
					className={cn(iconSize, optimisticLiked && "fill-current")}
				/>
				{optimisticLikeCount > 0 && (
					<span className={textSize}>{optimisticLikeCount}</span>
				)}
			</Button>

			<Button
				variant="ghost"
				size="sm"
				className={cn(
					buttonSize,
					"gap-1",
					optimisticBookmarked
						? "text-yellow-500 hover:text-yellow-600"
						: "text-gray-500 hover:text-yellow-500",
				)}
				onClick={handleBookmark}
				disabled={!currentUserId}
			>
				<Bookmark
					className={cn(iconSize, optimisticBookmarked && "fill-current")}
				/>
				{optimisticBookmarkCount > 0 && (
					<span className={textSize}>{optimisticBookmarkCount}</span>
				)}
			</Button>

			{showCommentLink && (
				<Link href={`/${lng}/community/memo/${memo.id}#comments`}>
					<Button
						variant="ghost"
						size="sm"
						className={cn(buttonSize, "gap-1 text-gray-500 hover:text-purple-500")}
					>
						<MessageCircle className={iconSize} />
						{memo.comment_count > 0 && (
							<span className={textSize}>{memo.comment_count}</span>
						)}
					</Button>
				</Link>
			)}
		</div>
	);
}
