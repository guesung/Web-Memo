"use client";

import type { LanguageType } from "@src/modules/i18n";
import { motion } from "framer-motion";
import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MemoSearchEmptyStateProps extends LanguageType {
	searchQuery: string;
}

/**
 * 검색 결과가 없을 때 보여주는 빈 상태.
 * @description 메모가 하나도 없을 때(MemoEmptyState)와 구분한다. 확장 설치 유도 CTA는
 * 검색 중인 사용자에게는 답이 아니라서 넣지 않는다.
 */
export default function MemoSearchEmptyState({
	lng,
	searchQuery,
}: MemoSearchEmptyStateProps) {
	const { t } = useTranslation(lng);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex flex-col items-center justify-center min-h-[60vh] px-4"
		>
			<div className="w-20 h-20 mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
				<SearchX className="h-10 w-10 text-gray-400" />
			</div>

			<h3 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
				{t("memos.searchEmptyState.title")}
			</h3>

			<p className="text-gray-600 dark:text-gray-400 text-center max-w-md break-all">
				{t("memos.searchEmptyState.message", { query: searchQuery })}
			</p>

			<p className="mt-2 text-sm text-gray-500 dark:text-gray-500 text-center">
				{t("memos.searchEmptyState.hint")}
			</p>
		</motion.div>
	);
}
