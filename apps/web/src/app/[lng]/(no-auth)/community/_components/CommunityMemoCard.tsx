"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { PublicMemo } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Card,
	CardContent,
} from "@web-memo/ui";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import {
	ExternalLink,
	Globe,
} from "lucide-react";
import Link from "next/link";
import { MemoInteractionButtons } from "./MemoInteractionButtons";

interface CommunityMemoCardProps {
	memo: PublicMemo;
	lng: Language;
	currentUserId?: string;
}

export default function CommunityMemoCard({
	memo,
	lng,
	currentUserId,
}: CommunityMemoCardProps) {
	const { t } = useTranslation(lng);
	const locale = lng === "ko" ? ko : enUS;
	const timeAgo = memo.shared_at
		? formatDistanceToNow(new Date(memo.shared_at), { addSuffix: true, locale })
		: null;

	const authorInitial = memo.author_nickname?.charAt(0).toUpperCase() || "U";

	return (
		<Card
			className={cn(
				"w-full max-w-[350px]",
				"bg-white dark:bg-gray-900",
				"border border-gray-200 dark:border-gray-800",
				"rounded-2xl shadow-sm",
				"transition-all duration-300",
				"hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5",
			)}
		>
			<div className="p-4">
				<div className="flex items-center gap-3 mb-3">
					<Link href={`/${lng}/profile/${memo.user_id}`}>
						<Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all">
							<AvatarImage src={memo.author_avatar_url || undefined} />
							<AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-sm font-medium">
								{authorInitial}
							</AvatarFallback>
						</Avatar>
					</Link>
					<div className="flex-1 min-w-0">
						<Link
							href={`/${lng}/profile/${memo.user_id}`}
							className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400 truncate block"
						>
							{memo.author_nickname || t("community.anonymous")}
						</Link>
						{timeAgo && (
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{timeAgo}
							</p>
						)}
					</div>
				</div>

				<Link href={`/${lng}/community/memo/${memo.id}`} className="block">
					<h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
						{memo.title}
					</h3>
				</Link>

				{memo.memo && (
					<CardContent className="p-0 text-sm text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap break-words">
						{memo.memo}
					</CardContent>
				)}

				<div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
					<div className="flex items-center justify-between">
						<a
							href={memo.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex-1 min-w-0"
						>
							{memo.fav_icon_url ? (
								<img
									src={memo.fav_icon_url}
									alt=""
									className="w-4 h-4 rounded flex-shrink-0"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
									}}
								/>
							) : (
								<Globe className="w-4 h-4 flex-shrink-0" />
							)}
							<span className="truncate">
								{new URL(memo.url).hostname}
							</span>
							<ExternalLink className="w-3 h-3 flex-shrink-0" />
						</a>
						<MemoInteractionButtons
							memo={memo}
							currentUserId={currentUserId}
							compact
						/>
					</div>
				</div>
			</div>
		</Card>
	);
}
