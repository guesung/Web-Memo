import { analytics } from "@web-memo/shared/modules/analytics";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import {
	Button,
	CardHeader,
	Input,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web-memo/ui";
import { CheckIcon, ExternalLink, Globe, PencilIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { KeyboardEvent, MouseEvent } from "react";
import { memo, useCallback, useEffect, useState } from "react";

interface MemoCardHeaderProps {
	memo: GetMemoResponse;
	selectMemoItem?: (id: number) => void;
	isMemoHovering?: boolean;
	isMemoSelected?: boolean;
	/**
	 * 제목 인라인 편집을 켠다. 넘기지 않으면 제목은 원문 링크로만 동작한다.
	 * 목록 카드처럼 편집이 필요 없는 곳에서 실수로 제목이 바뀌는 것을 막기 위해 선택 prop이다.
	 */
	onTitleChange?: (title: string) => void;
}

export default memo(function MemoCardHeader({
	memo,
	selectMemoItem,
	isMemoHovering = false,
	isMemoSelected,
	onTitleChange,
}: MemoCardHeaderProps) {
	const [isTitleEditing, setIsTitleEditing] = useState(false);
	const [editedTitle, setEditedTitle] = useState(memo.title);
	// 저장은 디바운스로 나가고 목록 쿼리가 무효화된 뒤에야 memo.title이 새 값으로 바뀐다.
	// 그 사이에 이전 제목이 다시 보이는 깜빡임을 막으려고 방금 저장한 값을 잠시 들고 있는다.
	const [committedTitle, setCommittedTitle] = useState<string | null>(null);

	useEffect(
		function clearCommittedTitleOnSync() {
			if (committedTitle === null) return;
			if (committedTitle !== memo.title) return;

			setCommittedTitle(null);
		},
		[committedTitle, memo.title],
	);

	const displayedTitle = committedTitle ?? memo.title;

	const handleCheckButtonClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			event.stopPropagation();

			selectMemoItem?.(memo.id);
		},
		[selectMemoItem, memo.id],
	);

	const handleTitleEditButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		setEditedTitle(displayedTitle);
		setIsTitleEditing(true);
	};

	/** 메모에서 원본 페이지로 돌아가는 동작. 메모가 실제로 쓰였다는 가장 강한 신호입니다. */
	const handleSourceLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
		event.stopPropagation();
		analytics.trackEvent({ name: "memo_source_open" });
	};

	const handleTitleEditFinish = () => {
		setIsTitleEditing(false);

		const nextTitle = editedTitle.trim();
		if (!onTitleChange) return;
		if (!nextTitle || nextTitle === displayedTitle) return;

		setCommittedTitle(nextTitle);
		onTitleChange(nextTitle);
	};

	const handleTitleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.preventDefault();
			handleTitleEditFinish();
			return;
		}

		if (event.key === "Escape") {
			setEditedTitle(displayedTitle);
			setIsTitleEditing(false);
		}
	};

	const isShowingSelectButton = isMemoHovering || isMemoSelected;
	return (
		<CardHeader className="relative px-5 py-4 border-b border-border">
			<Button
				variant="outline"
				size="sm"
				className={cn(
					"absolute -left-3 -top-3 z-20",
					"w-7 h-7 p-0 rounded-full",
					"bg-card",
					"border-2 border-border",
					"shadow-md hover:shadow-lg",
					"transition-all duration-200",
					{
						"opacity-100 scale-100": isShowingSelectButton,
						"opacity-0 scale-75 pointer-events-none": !isShowingSelectButton,
						"bg-purple-600 border-purple-600 text-white hover:bg-purple-700 hover:text-white":
							isMemoSelected,
					},
				)}
				onClick={handleCheckButtonClick}
			>
				<CheckIcon
					size={12}
					className={cn("transition-all", { "scale-110": isMemoSelected })}
				/>
			</Button>

			{isTitleEditing ? (
				<div className="flex items-center gap-2.5">
					<MemoFavIcon favIconUrl={memo.favIconUrl} />
					<Input
						autoFocus
						value={editedTitle}
						onChange={(event) => setEditedTitle(event.target.value)}
						onBlur={handleTitleEditFinish}
						onKeyDown={handleTitleInputKeyDown}
						onClick={(event) => event.stopPropagation()}
						className="h-8 font-bold"
						data-testid="memo-title-input"
					/>
				</div>
			) : (
				<div className="group/link flex items-center gap-2.5">
					<Link
						href={memo.url}
						target="_blank"
						className="flex min-w-0 items-center gap-2.5 hover:translate-x-0.5 transition-transform"
						onClick={handleSourceLinkClick}
					>
						<MemoFavIcon favIconUrl={memo.favIconUrl} />
						<TooltipProvider delayDuration={200}>
							<Tooltip>
								<TooltipTrigger asChild>
									<span
										className="line-clamp-1 font-bold text-foreground group-hover/link:text-purple-600 dark:group-hover/link:text-purple-400 transition-colors"
										data-testid="memo-title"
									>
										{displayedTitle}
									</span>
								</TooltipTrigger>
								<TooltipContent side="top" className="max-w-xs">
									<p className="text-sm">{displayedTitle}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
					</Link>
					{onTitleChange ? (
						<Button
							variant="ghost"
							size="icon"
							className="size-6 flex-shrink-0 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity"
							aria-label="제목 수정"
							onClick={handleTitleEditButtonClick}
							data-testid="memo-title-edit-button"
						>
							<PencilIcon className="w-3.5 h-3.5" />
						</Button>
					) : null}
				</div>
			)}
		</CardHeader>
	);
});

function MemoFavIcon({ favIconUrl }: { favIconUrl?: string | null }) {
	if (!favIconUrl) {
		return <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0" />;
	}

	return (
		<div className="flex-shrink-0 w-5 h-5 rounded overflow-hidden">
			<Image
				src={favIconUrl}
				width={20}
				height={20}
				alt="favicon"
				className="w-full h-full object-contain"
				priority
			/>
		</div>
	);
}
