import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { MOTION_VARIANTS } from "@web-memo/shared/constants";
import type { CategoryRow, GetMemoResponse } from "@web-memo/shared/types";
import { Button } from "@web-memo/ui";
import { motion } from "framer-motion";
import { XIcon } from "lucide-react";

import MemoOption from "../MemoCardFooter/MemoOption";

interface MemoOptionHeaderProps extends LanguageType {
	categories: CategoryRow[];
	selectedMemos: GetMemoResponse[];
	onXButtonClick: () => void;
	closeMemoOption: () => void;
}

export default function MemoOptionHeader({
	lng,
	selectedMemos,
	categories,
	closeMemoOption,
}: MemoOptionHeaderProps) {
	const { t } = useTranslation(lng);

	if (selectedMemos.length === 0) return null;
	return (
		<motion.header
			className="bg-background fixed inset-x-0 top-0 z-50 flex h-[3.5rem] w-full items-center justify-between px-4 shadow-sm"
			variants={MOTION_VARIANTS.fadeInAndOut}
			initial="initial"
			animate="animate"
			exit="exit"
		>
			<Button variant="ghost" size="icon" onClick={closeMemoOption}>
				<XIcon className="h-6 w-6" />
			</Button>
			<div className="flex items-center gap-2 px-4">
				<span className="text-md select-none font-semibold">
					{t("memos.selected", { count: selectedMemos.length })}
				</span>
			</div>
			<div className="flex items-center gap-2 px-4">
				<MemoOption
					categories={categories}
					memos={selectedMemos}
					lng={lng}
					closeMemoOption={closeMemoOption}
				/>
			</div>
		</motion.header>
	);
}
