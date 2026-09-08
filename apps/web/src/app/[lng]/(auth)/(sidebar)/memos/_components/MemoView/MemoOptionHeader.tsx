import { MOTION_VARIANTS } from "@src/constants";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
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
				"bg-card",
				"fixed inset-x-0 top-0 z-50",
				"flex h-[3.5rem] w-full items-center justify-between",
				"px-4 md:px-6",
				"border-b border-border",
				"shadow-lg shadow-primary/5 dark:shadow-primary/10",
				"backdrop-blur-sm bg-card/95",
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
				className="hover:bg-muted transition-all duration-200 hover:scale-110 active:scale-95 rounded-full"
			>
				<XIcon className="h-5 w-5 text-muted-foreground" />
			</Button>
			<div className="flex items-center gap-3 px-4">
				<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
					<span className="text-sm font-bold text-primary">
						{selectedMemos.length}
					</span>
				</div>
				<span className="text-base font-semibold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
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
