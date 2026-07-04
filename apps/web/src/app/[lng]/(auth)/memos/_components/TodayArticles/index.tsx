"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemosInfiniteQuery } from "@web-memo/shared/hooks";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { BookOpen } from "lucide-react";

interface TodayArticlesProps extends LanguageType {}

/** 위시 메모 중 날짜 기반 랜덤으로 3개를 골라 보여주는 '오늘 읽을 아티클' 섹션 */
export default function TodayArticles({ lng }: TodayArticlesProps) {
	const { t } = useTranslation(lng);
	const { memos } = useMemosInfiniteQuery({ isWish: true });

	// ponytail: 최근 위시 메모(첫 페이지 20개) 풀에서 선정, 전체 풀이 필요해지면 별도 쿼리로 확장
	const todayArticleList = pickTodayArticles(memos ?? []);

	if (todayArticleList.length === 0) {
		return null;
	}

	return (
		<section className="w-full max-w-4xl mx-auto mb-6">
			<h2 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
				<BookOpen className="h-4 w-4 text-purple-500" />
				{t("memos.todayArticles.title")}
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				{todayArticleList.map((memo) => (
					<a
						key={memo.id}
						href={memo.url}
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-3 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
					>
						{memo.favIconUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={memo.favIconUrl}
								alt=""
								className="h-5 w-5 shrink-0 rounded"
							/>
						) : (
							<BookOpen className="h-5 w-5 shrink-0 text-gray-400" />
						)}
						<span className="truncate text-sm text-gray-800 dark:text-gray-200">
							{memo.title}
						</span>
					</a>
				))}
			</div>
		</section>
	);
}

/** 날짜(YYYY-MM-DD)를 seed로 한 결정적 셔플로 위시 메모에서 최대 3개를 고르는 함수 */
const pickTodayArticles = (memos: GetMemoResponse[]): GetMemoResponse[] => {
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
