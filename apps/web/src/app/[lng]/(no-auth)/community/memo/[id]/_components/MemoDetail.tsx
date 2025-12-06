"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { usePublicMemoQuery, useSupabaseUserQuery } from "@web-memo/shared/hooks";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@web-memo/ui";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { ArrowLeft, ExternalLink, Globe, User } from "lucide-react";
import Link from "next/link";
import { CommentSection, MemoInteractionButtons } from "../../../_components";

export default function MemoDetail({ id, lng }: MemoDetailProps) {
	const { t } = useTranslation(lng);
	const { data: userResponse } = useSupabaseUserQuery();
	const currentUserId = userResponse?.data?.user?.id;
	const { data: memo, isLoading, error } = usePublicMemoQuery(id);

	if (isLoading) {
		return (
			<div className="flex justify-center py-20">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
			</div>
		);
	}

	if (error || !memo) {
		return (
			<div className="text-center py-20">
				<p className="text-gray-500 dark:text-gray-400">
					{t("community.empty.title")}
				</p>
				<Link href={`/${lng}/community`}>
					<Button variant="outline" className="mt-4">
						<ArrowLeft className="w-4 h-4 mr-2" />
						{t("community.title")}
					</Button>
				</Link>
			</div>
		);
	}

	const dateLocale = lng === "ko" ? ko : enUS;
	const sharedTime = memo.shared_at
		? formatDistanceToNow(new Date(memo.shared_at), {
				addSuffix: true,
				locale: dateLocale,
			})
		: null;

	return (
		<article className="max-w-3xl mx-auto">
			<Link
				href={`/${lng}/community`}
				className="inline-flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6"
			>
				<ArrowLeft className="w-4 h-4 mr-2" />
				{t("community.title")}
			</Link>

			<div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8">
				<header className="mb-6">
					<h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
						{memo.title}
					</h1>

					<div className="flex items-center justify-between flex-wrap gap-4">
						<Link
							href={`/${lng}/profile/${memo.user_id}`}
							className="flex items-center gap-3 hover:opacity-80 transition-opacity"
						>
							<Avatar className="h-10 w-10">
								<AvatarImage
									src={memo.author_avatar_url || undefined}
									alt={memo.author_nickname || "User"}
								/>
								<AvatarFallback>
									<User className="w-5 h-5" />
								</AvatarFallback>
							</Avatar>
							<div>
								<p className="font-medium text-gray-900 dark:text-white">
									{memo.author_nickname || "Anonymous"}
								</p>
								{sharedTime && (
									<p className="text-sm text-gray-500 dark:text-gray-400">
										{t("community.memo.sharedAt")} {sharedTime}
									</p>
								)}
							</div>
						</Link>

						{memo.url && (
							<a
								href={memo.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
							>
								<Globe className="w-4 h-4" />
								{t("community.memo.viewOriginal")}
								<ExternalLink className="w-3 h-3" />
							</a>
						)}
					</div>
				</header>

				<div className="prose prose-gray dark:prose-invert max-w-none">
					<div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
						{memo.memo}
					</div>
				</div>

				<div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
					<MemoInteractionButtons
						memo={memo}
						currentUserId={currentUserId}
						showCommentLink={false}
						lng={lng}
					/>
				</div>

				{memo.url && (
					<footer className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
						<div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
							{memo.fav_icon_url && (
								<img
									src={memo.fav_icon_url}
									alt=""
									className="w-4 h-4"
									onError={(e) => {
										e.currentTarget.style.display = "none";
									}}
								/>
							)}
							<span className="truncate">{new URL(memo.url).hostname}</span>
						</div>
					</footer>
				)}
			</div>

			<div className="mt-8 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8">
				<CommentSection
					memoId={id}
					currentUserId={currentUserId}
					lng={lng}
				/>
			</div>
		</article>
	);
}

interface MemoDetailProps {
	id: number;
	lng: Language;
}
