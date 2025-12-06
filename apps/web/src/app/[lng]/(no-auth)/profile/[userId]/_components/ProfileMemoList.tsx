"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useUserPublicMemosInfiniteQuery } from "@web-memo/shared/hooks";
import { Button } from "@web-memo/ui";
import { CommunityMemoCard } from "@src/app/[lng]/(no-auth)/community/_components";

export default function ProfileMemoList({ userId, lng }: ProfileMemoListProps) {
	const { t } = useTranslation(lng);
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useUserPublicMemosInfiniteQuery(userId);

	if (isLoading) {
		return (
			<div className="mt-8">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
					{t("profile.publicMemos")}
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={`skeleton-${i}`}
							className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 animate-pulse"
						>
							<div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
							<div className="space-y-2">
								<div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
								<div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	const allMemos = data?.pages.flatMap((page) => page.memos) ?? [];

	if (allMemos.length === 0) {
		return (
			<div className="mt-8">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
					{t("profile.publicMemos")}
				</h2>
				<div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
					<p className="text-gray-500 dark:text-gray-400">
						{t("profile.noMemos")}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mt-8">
			<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
				{t("profile.publicMemos")}
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{allMemos.map((memo) => (
					<CommunityMemoCard key={memo.id} memo={memo} lng={lng} />
				))}
			</div>

			{hasNextPage && (
				<div className="flex justify-center mt-8">
					<Button
						variant="outline"
						onClick={() => fetchNextPage()}
						disabled={isFetchingNextPage}
					>
						{isFetchingNextPage
							? t("community.loading")
							: t("community.loadMore")}
					</Button>
				</div>
			)}
		</div>
	);
}

interface ProfileMemoListProps {
	userId: string;
	lng: Language;
}
