"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useMemoCommentsInfiniteQuery,
	useCreateCommentMutation,
	useDeleteCommentMutation,
	useUpdateCommentMutation,
} from "@web-memo/shared/hooks";
import type { MemoComment } from "@web-memo/shared/types";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Button,
	Textarea,
} from "@web-memo/ui";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { Loader2, Pencil, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface CommentSectionProps {
	memoId: number;
	currentUserId?: string;
	lng: Language;
}

export function CommentSection({
	memoId,
	currentUserId,
	lng,
}: CommentSectionProps) {
	const { t } = useTranslation(lng);
	const locale = lng === "ko" ? ko : enUS;
	const [newComment, setNewComment] = useState("");
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editContent, setEditContent] = useState("");

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
	} = useMemoCommentsInfiniteQuery(memoId);
	const createMutation = useCreateCommentMutation();
	const updateMutation = useUpdateCommentMutation();
	const deleteMutation = useDeleteCommentMutation();

	const comments = data?.pages.flat() ?? [];

	const handleSubmit = async () => {
		if (!currentUserId || !newComment.trim()) return;

		await createMutation.mutateAsync({
			memoId,
			userId: currentUserId,
			content: newComment.trim(),
		});
		setNewComment("");
	};

	const handleUpdate = async (commentId: number) => {
		if (!editContent.trim()) return;

		await updateMutation.mutateAsync({
			commentId,
			memoId,
			content: editContent.trim(),
		});
		setEditingId(null);
		setEditContent("");
	};

	const handleDelete = async (commentId: number) => {
		await deleteMutation.mutateAsync({ commentId, memoId });
	};

	const startEditing = (comment: MemoComment) => {
		setEditingId(comment.id);
		setEditContent(comment.content);
	};

	return (
		<div id="comments" className="space-y-6">
			<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
				{t("community.comments.title")} ({comments.length})
			</h3>

			{currentUserId ? (
				<div className="flex gap-3">
					<Textarea
						value={newComment}
						onChange={(e) => setNewComment(e.target.value)}
						placeholder={t("community.comments.placeholder")}
						className="min-h-[80px] resize-none"
					/>
					<Button
						onClick={handleSubmit}
						disabled={!newComment.trim() || createMutation.isPending}
						className="self-end"
					>
						{createMutation.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Send className="w-4 h-4" />
						)}
					</Button>
				</div>
			) : (
				<p className="text-sm text-gray-500 dark:text-gray-400">
					{t("community.comments.loginRequired")}
				</p>
			)}

			{isLoading ? (
				<div className="flex justify-center py-8">
					<Loader2 className="w-6 h-6 animate-spin text-gray-400" />
				</div>
			) : comments.length === 0 ? (
				<p className="text-center text-gray-500 dark:text-gray-400 py-8">
					{t("community.comments.empty")}
				</p>
			) : (
				<div className="space-y-4">
					{comments.map((comment) => (
						<CommentItem
							key={comment.id}
							comment={comment}
							currentUserId={currentUserId}
							lng={lng}
							locale={locale}
							isEditing={editingId === comment.id}
							editContent={editContent}
							onEditContentChange={setEditContent}
							onStartEditing={() => startEditing(comment)}
							onCancelEditing={() => {
								setEditingId(null);
								setEditContent("");
							}}
							onSaveEdit={() => handleUpdate(comment.id)}
							onDelete={() => handleDelete(comment.id)}
							isUpdating={updateMutation.isPending}
							isDeleting={deleteMutation.isPending}
							t={t}
						/>
					))}

					{hasNextPage && (
						<div className="flex justify-center pt-4">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => fetchNextPage()}
								disabled={isFetchingNextPage}
							>
								{isFetchingNextPage ? (
									<Loader2 className="w-4 h-4 animate-spin mr-2" />
								) : null}
								{t("community.comments.loadMore")}
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

interface CommentItemProps {
	comment: MemoComment;
	currentUserId?: string;
	lng: Language;
	locale: typeof ko | typeof enUS;
	isEditing: boolean;
	editContent: string;
	onEditContentChange: (value: string) => void;
	onStartEditing: () => void;
	onCancelEditing: () => void;
	onSaveEdit: () => void;
	onDelete: () => void;
	isUpdating: boolean;
	isDeleting: boolean;
	t: (key: string) => string;
}

function CommentItem({
	comment,
	currentUserId,
	lng,
	locale,
	isEditing,
	editContent,
	onEditContentChange,
	onStartEditing,
	onCancelEditing,
	onSaveEdit,
	onDelete,
	isUpdating,
	isDeleting,
	t,
}: CommentItemProps) {
	const isOwner = currentUserId === comment.user_id;
	const authorInitial =
		comment.author_nickname?.charAt(0).toUpperCase() || "U";
	const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
		addSuffix: true,
		locale,
	});

	return (
		<div className="flex gap-3">
			<Link href={`/${lng}/profile/${comment.user_id}`}>
				<Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all">
					<AvatarImage src={comment.author_avatar_url || undefined} />
					<AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-medium">
						{authorInitial}
					</AvatarFallback>
				</Avatar>
			</Link>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<Link
						href={`/${lng}/profile/${comment.user_id}`}
						className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400"
					>
						{comment.author_nickname || t("community.anonymous")}
					</Link>
					<span className="text-xs text-gray-500 dark:text-gray-400">
						{timeAgo}
					</span>
				</div>

				{isEditing ? (
					<div className="space-y-2">
						<Textarea
							value={editContent}
							onChange={(e) => onEditContentChange(e.target.value)}
							className="min-h-[60px] resize-none"
						/>
						<div className="flex gap-2">
							<Button
								size="sm"
								onClick={onSaveEdit}
								disabled={!editContent.trim() || isUpdating}
							>
								{isUpdating ? (
									<Loader2 className="w-3 h-3 animate-spin mr-1" />
								) : null}
								{t("community.comments.save")}
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={onCancelEditing}
							>
								{t("community.comments.cancel")}
							</Button>
						</div>
					</div>
				) : (
					<p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
						{comment.content}
					</p>
				)}

				{isOwner && !isEditing && (
					<div className="flex gap-2 mt-2">
						<Button
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-xs text-gray-500 hover:text-purple-600"
							onClick={onStartEditing}
						>
							<Pencil className="w-3 h-3 mr-1" />
							{t("community.comments.edit")}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-xs text-gray-500 hover:text-red-600"
							onClick={onDelete}
							disabled={isDeleting}
						>
							{isDeleting ? (
								<Loader2 className="w-3 h-3 animate-spin mr-1" />
							) : (
								<Trash2 className="w-3 h-3 mr-1" />
							)}
							{t("community.comments.delete")}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
