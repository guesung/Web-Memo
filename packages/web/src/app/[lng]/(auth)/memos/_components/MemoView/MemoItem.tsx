import type { LanguageType } from "@src/modules/i18n";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { Card, CardContent } from "@web-memo/ui";
import type { HTMLAttributes, MouseEvent } from "react";
import { memo, useCallback, useState } from "react";

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
	const [isMemoHovering, setIsMemoHovering] = useState(false);

	const handleMouseEnter = useCallback(() => {
		setIsMemoHovering(true);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setIsMemoHovering(false);
	}, []);

	const handleMemoItemClick = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			const target = event.target as HTMLElement;
			const isMemoItem = target.closest(".memo-item");
			if (!isMemoItem) return;

			const id = event.currentTarget.id;

			if (isSelectingMode) {
				selectMemoItem(Number(id));
			} else {
				const currentUrl = new URL(window.location.href);
				currentUrl.searchParams.set("id", id);
				history.pushState(
					{ openedMemoId: Number(id) },
					"",
					currentUrl.toString(),
				);
			}
		},
		[isSelectingMode, selectMemoItem],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleMemoItemClick(e as unknown as MouseEvent<HTMLElement>);
			}
		},
		[handleMemoItemClick],
	);

	return (
		<div
			{...props}
			id={String(memo.id)}
			className={cn(
				"memo-item select-none transition-all [transform:translateZ(0)]",
				props.className,
			)}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onClick={handleMemoItemClick}
			onKeyDown={handleKeyDown}
			aria-label={`메모 ${memo.id}`}
			tabIndex={0}
			// biome-ignore lint/a11y/useSemanticElements: <explanation>
			role="button"
		>
			<Card
				className={cn("relative w-[300px] transition-all", {
					"border-primary": isMemoSelected,
				})}
				style={{
					borderLeftColor: memo.category?.color || undefined,
					borderLeftWidth: memo.category?.color ? "4px" : undefined,
				}}
			>
				<MemoCardHeader
					memo={memo}
					isMemoHovering={isMemoHovering}
					isMemoSelected={isMemoSelected}
					selectMemoItem={selectMemoItem}
				/>
				{memo.memo && (
					<CardContent className="whitespace-break-spaces break-all">
						{memo.memo}
					</CardContent>
				)}
				<MemoCardFooter
					memo={memo}
					lng={lng}
					isShowingOption={isMemoHovering && !isSelectingMode}
				/>
			</Card>
		</div>
	);
});
