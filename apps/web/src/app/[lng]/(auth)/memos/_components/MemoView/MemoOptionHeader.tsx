import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { MOTION_VARIANTS } from "@web-memo/shared/constants";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { Button, cn } from "@web-memo/ui";
import { motion } from "framer-motion";
import { XIcon } from "lucide-react";

import MemoOption from "../MemoCardFooter/MemoOption";

interface MemoOptionHeaderProps extends LanguageType {
	selectedMemos: GetMemoResponse[];
	onXButtonClick: () => void;
	closeMemoOption: () => void;
}

export default function MemoOptionHeader({
	selectedMemos,
	lng,
	closeMemoOption,
}: MemoOptionHeaderProps) {
	const { t } = useTranslation(lng);

	if (selectedMemos.length === 0) return null;
	return (
		<motion.header
			className={cn(
				"bg-white dark:bg-gray-900",
				"fixed inset-x-0 top-0 z-50",
				"flex h-[3.5rem] w-full items-center justify-between",
				"px-4 md:px-6",
				"border-b border-gray-200 dark:border-gray-800",
				"shadow-lg shadow-purple-500/5 dark:shadow-purple-500/10",
				"backdrop-blur-sm bg-white/95 dark:bg-gray-900/95",
			)}
			variants={MOTION_VARIANTS.fadeInAndOut}
			initial="initial"
			animate="animate"
			exit="exit"
		>
			<Button
				variant="ghost"
				size="icon"
				onClick={closeMemoOption}
				className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-110 active:scale-95 rounded-full"
			>
				<XIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
			</Button>
			<div className="flex items-center gap-3 px-4">
				<div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30">
					<span className="text-sm font-bold text-purple-600 dark:text-purple-400">
						{selectedMemos.length}
					</span>
				</div>
				<span className="text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
					{t("memos.selected", { count: selectedMemos.length })}
				</span>
			</div>
			<div className="flex items-center gap-2 px-4">
				<MemoOption
					memos={selectedMemos}
					lng={lng}
					closeMemoOption={closeMemoOption}
				/>
			</div>
		</motion.header>
	);
}
