import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
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
	/** 느낀 점 설정이 켜져 있는지. 꺼져 있으면 내용이 있어도 표시하지 않는다 */
	showImpression: boolean;
	/** 액션 아이템 설정이 켜져 있는지. 꺼져 있으면 내용이 있어도 표시하지 않는다 */
	showActionItem: boolean;
	/** 목록에서의 순서. 등장 애니메이션을 계단식으로 미루는 데 쓴다 */
	index: number;
}

export default memo(function MemoItem({
	lng,
	memo,
	selectMemoItem,
	isSelectingMode,
	isMemoSelected,
	showImpression,
	showActionItem,
	index,
	...props
}: MemoItemProps) {
	const { t } = useTranslation(lng);
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
				// 20개 묶음 안에서만 계단을 만든다. 순서를 그대로 곱하면 무한 스크롤로
				// 뒤에 붙는 카드일수록 지연이 끝없이 길어진다.
				transition={{
					duration: 0.24,
					delay: (index % 20) * 0.025,
					ease: [0.22, 1, 0.36, 1],
				}}
				className="group"
			>
				<Card
					className={cn(
						"relative w-[300px]",
						"bg-card",
						"border border-border",
						"rounded-2xl shadow-sm",
						"transition-[box-shadow,transform,border-color] duration-base",
						// 그림자·이동·확대를 한꺼번에 주면 신호가 셋이라 산만하다. 들어올리기만 남긴다.
						"hover:shadow-lg hover:-translate-y-1",
						{
							"border-primary ring-4 ring-primary/20 shadow-lg": isMemoSelected,
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
						<CardContent className="px-5 py-3 text-foreground leading-relaxed whitespace-break-spaces break-all">
							{memo.memo}
						</CardContent>
					)}
					{showImpression && memo.impression && (
						<CardContent className="px-5 pb-3 text-foreground leading-relaxed whitespace-break-spaces break-all">
							<p className="mb-1 text-xs font-semibold text-muted-foreground">
								{t("memoSection.impression")}
							</p>
							{memo.impression}
						</CardContent>
					)}
					{showActionItem && memo.actionItem && (
						<CardContent className="px-5 pb-3 text-foreground leading-relaxed whitespace-break-spaces break-all">
							<p className="mb-1 text-xs font-semibold text-muted-foreground">
								{t("memoSection.actionItem")}
							</p>
							{memo.actionItem}
						</CardContent>
					)}
					<MemoCardFooter
						memo={memo}
						lng={lng}
						isShowingOption={isMemoHovering && !isSelectingMode}
					/>
					<div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-primary to-cyan-500 rounded-2xl opacity-0 group-hover:opacity-[0.08] blur transition-opacity duration-300 -z-10" />
				</Card>
			</motion.div>
		</div>
	);
});
