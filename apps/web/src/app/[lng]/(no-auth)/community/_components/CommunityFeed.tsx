"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useCommunityMemosInfiniteQuery,
	useSupabaseUserQuery,
} from "@web-memo/shared/hooks";
import { Button } from "@web-memo/ui";
import { Loader2, RefreshCw } from "lucide-react";

import CommunityMemoCard from "./CommunityMemoCard";

interface CommunityFeedProps {
	lng: Language;
}

export default function CommunityFeed({ lng }: CommunityFeedProps) {
	const { t } = useTranslation(lng);
	const { data: userResponse } = useSupabaseUserQuery();
	const currentUserId = userResponse?.data?.user?.id;
	const { memos, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
		useCommunityMemosInfiniteQuery();

	const handleLoadMore = () => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	};

	if (!memos || memos.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
					<RefreshCw className="w-8 h-8 text-gray-400" />
				</div>
				<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
					{t("community.empty.title")}
				</h3>
				<p className="text-gray-500 dark:text-gray-400 max-w-sm">
					{t("community.empty.description")}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="flex justify-end">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => refetch()}
					disabled={isRefetching}
				>
					<RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
					{t("community.refresh")}
				</Button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
				{memos.map((memo) => (
					<CommunityMemoCard
						key={memo.id}
						memo={memo}
						lng={lng}
						currentUserId={currentUserId}
					/>
				))}
			</div>

			{hasNextPage && (
				<div className="flex justify-center pt-8">
					<Button
						variant="outline"
						size="lg"
						onClick={handleLoadMore}
						disabled={isFetchingNextPage}
					>
						{isFetchingNextPage ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								{t("community.loading")}
							</>
						) : (
							t("community.loadMore")
						)}
					</Button>
				</div>
			)}
		</div>
	);
}
