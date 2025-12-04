import type { LanguageType } from "@src/modules/i18n";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Card, CardContent } from "@web-memo/ui";
import { motion } from "framer-motion";
import type { HTMLAttributes, MouseEvent } from "react";
import { memo, useState } from "react";

import MemoCardFooter from "../MemoCardFooter";
import MemoCardHeader from "../MemoCardHeader";

interface MemoItemProps extends HTMLAttributes<HTMLElement>, LanguageType {
	memo: GetMemoResponse;
	isSelectingMode: boolean;
	selectMemoItem: (id: number) => void;
	isMemoSelected: boolean;
}

export default memo(function MemoItem({
	lng,
	memo,
	selectMemoItem,
	isSelectingMode,
	isMemoSelected,
	...props
}: MemoItemProps) {
	const searchParams = useSearchParams();
	const [isMemoHovering, setIsMemoHovering] = useState(false);

	const handleMouseEnter = () => {
		setIsMemoHovering(true);
	};
	const handleMouseLeave = () => {
		setIsMemoHovering(false);
	};

	const handleMemoItemClick = (event: MouseEvent<HTMLElement>) => {
		const target = event.target as HTMLElement;
		const isMemoItem = target.closest(".memo-item");
		if (!isMemoItem) return;

		const id = event.currentTarget.id;

		if (isSelectingMode) selectMemoItem(Number(id));
		else {
			searchParams.set("id", id);
			history.pushState(
				{ openedMemoId: Number(id) },
				"",
				searchParams.getUrl(),
			);
		}
	};

	return (
		<div
			{...props}
			id={String(memo.id)}
			className={cn(
				"memo-item select-none transition-all duration-300 [transform:translateZ(0)]",
				props.className,
			)}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onClick={handleMemoItemClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleMemoItemClick(e as unknown as MouseEvent<HTMLElement>);
				}
			}}
			aria-label={`메모 ${memo.id}`}
			tabIndex={0}
			// biome-ignore lint/a11y/useSemanticElements: Using div with role="button" for complex interaction patterns
			role="button"
		>
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -10 }}
				transition={{ duration: 0.2 }}
				className="group"
			>
				<Card
					className={cn(
						"relative w-[300px]",
						"bg-white dark:bg-gray-900",
						"border-2 border-gray-200 dark:border-gray-800",
						"rounded-2xl shadow-md",
						"transition-all duration-300",
						"hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1",
						{
							"border-purple-500 dark:border-purple-500 ring-4 ring-purple-500/20 shadow-lg":
								isMemoSelected,
						},
					)}
					style={{
						borderLeftColor: memo.category?.color || undefined,
						borderLeftWidth: memo.category?.color ? "5px" : undefined,
					}}
				>
					{memo.category?.color && (
						<div
							className="absolute inset-0 opacity-[0.03] rounded-2xl pointer-events-none"
							style={{
								background: `linear-gradient(135deg, ${memo.category.color} 0%, transparent 100%)`,
							}}
						/>
					)}
					<MemoCardHeader
						memo={memo}
						isMemoHovering={isMemoHovering}
						isMemoSelected={isMemoSelected}
						selectMemoItem={selectMemoItem}
					/>
					{memo.memo && (
						<CardContent className="px-5 py-3 text-gray-700 dark:text-gray-300 leading-relaxed whitespace-break-spaces break-all">
							{memo.memo}
						</CardContent>
					)}
					<MemoCardFooter
						memo={memo}
						lng={lng}
						isShowingOption={isMemoHovering && !isSelectingMode}
					/>
					<div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-[0.08] blur transition-opacity duration-300 -z-10" />
				</Card>
			</motion.div>
		</div>
	);
});
