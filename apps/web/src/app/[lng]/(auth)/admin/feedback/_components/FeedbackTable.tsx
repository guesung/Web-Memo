"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useFeedbackQuery, useFeedbacksQuery } from "@web-memo/shared/hooks";
import { FEEDBACK_PAGE_SIZE, type IFFeedback } from "@web-memo/shared/utils";
import {
	Badge,
	Button,
	Collapsible,
	CollapsibleContent,
	cn,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web-memo/ui";
import { ArrowDown, ArrowUp, ArrowUpDown, MessageSquare } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import FeedbackPagination from "./FeedbackPagination";
import FeedbackTableSkeleton from "./FeedbackTableSkeleton";

interface FeedbackTableProps extends LanguageType {}

/** 받은 날짜 정렬 방향 */
type TSortOrder = "asc" | "desc";

/**
 * 관리자 피드백 목록 표.
 * @description 여러 건을 연속으로 훑는 화면이라 행을 눌러 그 자리에서 펼친다(다이얼로그를 쓰지 않는다).
 * 검색어·페이지는 URL에 두고, 슬랙 알림이 준 `?id=`로 들어오면 해당 행을 펼친 채 강조한다.
 */
export default function FeedbackTable({ lng }: FeedbackTableProps) {
	const { t } = useTranslation(lng);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const searchQuery = searchParams.get("q") ?? "";
	const currentPage = Number(searchParams.get("page") ?? "1");
	const highlightedIdParam = searchParams.get("id");
	const highlightedId = highlightedIdParam ? Number(highlightedIdParam) : null;

	const [sortOrder, setSortOrder] = useState<TSortOrder>("desc");
	const [openIds, setOpenIds] = useState<number[]>(
		highlightedId === null ? [] : [highlightedId],
	);

	const { feedbacks, totalCount, isLoading } = useFeedbacksQuery({
		searchQuery: searchQuery || undefined,
		page: currentPage,
	});

	const isHighlightedMissing =
		highlightedId !== null &&
		!isLoading &&
		!feedbacks.some((feedback) => feedback.id === highlightedId);
	const { feedback: highlightedFeedback, isLoading: isHighlightedLoading } =
		useFeedbackQuery(isHighlightedMissing ? highlightedId : null);

	const handleSortOrderToggle = () => {
		setSortOrder(sortOrder === "desc" ? "asc" : "desc");
	};

	const handleRowToggle = (id: number) => {
		setOpenIds(
			openIds.includes(id)
				? openIds.filter((openId) => openId !== id)
				: [...openIds, id],
		);
	};

	const handlePageChange = (page: number) => {
		const nextSearchParams = new URLSearchParams();

		if (searchQuery) {
			nextSearchParams.set("q", searchQuery);
		}
		if (page > 1) {
			nextSearchParams.set("page", String(page));
		}

		const queryString = nextSearchParams.toString();
		router.replace(queryString ? `${pathname}?${queryString}` : pathname);
	};

	const handleSearchClearClick = () => {
		router.replace(pathname);
	};

	if (isLoading || (isHighlightedMissing && isHighlightedLoading)) {
		return <FeedbackTableSkeleton />;
	}

	if (isHighlightedMissing && highlightedFeedback) {
		return (
			<div className="space-y-4">
				<FeedbackRows
					lng={lng}
					feedbacks={[highlightedFeedback]}
					sortOrder={sortOrder}
					onSortOrderToggle={handleSortOrderToggle}
					openIds={openIds}
					highlightedId={highlightedId}
					onRowToggle={handleRowToggle}
				/>
				<Button variant="outline" size="sm" onClick={handleSearchClearClick}>
					{t("admin.feedback.back_to_list")}
				</Button>
			</div>
		);
	}

	if (feedbacks.length === 0 && searchQuery) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<p>{t("admin.feedback.search_empty", { query: searchQuery })}</p>
				<Button
					variant="outline"
					size="sm"
					className="mt-4"
					onClick={handleSearchClearClick}
				>
					{t("admin.feedback.clear_search")}
				</Button>
			</div>
		);
	}

	if (feedbacks.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<MessageSquare className="mx-auto mb-3 h-8 w-8" />
				<p>{t("admin.feedback.empty")}</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="text-sm text-muted-foreground">
				{t("admin.feedback.total", { count: totalCount })}
			</div>
			<FeedbackRows
				lng={lng}
				feedbacks={feedbacks}
				sortOrder={sortOrder}
				onSortOrderToggle={handleSortOrderToggle}
				openIds={openIds}
				highlightedId={highlightedId}
				onRowToggle={handleRowToggle}
			/>
			<FeedbackPagination
				lng={lng}
				currentPage={currentPage}
				totalPages={Math.ceil(totalCount / FEEDBACK_PAGE_SIZE)}
				onPageChange={handlePageChange}
			/>
		</div>
	);
}

interface FeedbackRowsProps extends LanguageType {
	feedbacks: IFFeedback[];
	sortOrder: TSortOrder;
	onSortOrderToggle: () => void;
	openIds: number[];
	highlightedId: number | null;
	onRowToggle: (id: number) => void;
}

/**
 * 표 본체. 목록과 단독 표시(`?id=`)가 같은 모양을 쓰도록 분리해 둔다.
 * @description 정렬은 현재 페이지 안에서만 다시 세운다. 서버는 항상 최신순으로 한 페이지를 주므로
 * 기본값(내림차순)이 곧 전체 정렬이고, 올림차순은 지금 보고 있는 페이지를 뒤집어 보는 용도다.
 */
function FeedbackRows({
	lng,
	feedbacks,
	sortOrder,
	onSortOrderToggle,
	openIds,
	highlightedId,
	onRowToggle,
}: FeedbackRowsProps) {
	const { t } = useTranslation(lng);
	const locale = lng === "ko" ? "ko-KR" : "en-US";

	const sortedFeedbacks = [...feedbacks].sort((a, b) => {
		const multiplier = sortOrder === "asc" ? 1 : -1;

		return (
			multiplier *
			(new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
		);
	});

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead
							className="w-40 cursor-pointer select-none"
							onClick={onSortOrderToggle}
						>
							<div className="flex items-center">
								{t("admin.feedback.received_at")}
								{sortOrder === "asc" ? (
									<ArrowUp className="ml-1 h-4 w-4" />
								) : (
									<ArrowDown className="ml-1 h-4 w-4" />
								)}
							</div>
						</TableHead>
						<TableHead>
							<div className="flex items-center">
								{t("admin.feedback.content")}
								<ArrowUpDown className="ml-1 h-4 w-4 opacity-0" />
							</div>
						</TableHead>
						<TableHead className="w-72">{t("admin.feedback.writer")}</TableHead>
					</TableRow>
				</TableHeader>
				{sortedFeedbacks.map((feedback) => (
					<Collapsible
						key={feedback.id}
						open={openIds.includes(feedback.id)}
						asChild
					>
						<TableBody>
							<TableRow
								className={cn(
									"cursor-pointer",
									feedback.id === highlightedId && "bg-accent animate-fade-in",
								)}
								onClick={() => onRowToggle(feedback.id)}
							>
								<TableCell className="align-top text-sm text-muted-foreground">
									{new Date(feedback.created_at).toLocaleString(locale)}
								</TableCell>
								<TableCell className="align-top">
									<span className="line-clamp-2">{feedback.content}</span>
								</TableCell>
								<TableCell className="align-top">
									{feedback.user_id ? (
										<span className="font-mono text-xs text-muted-foreground">
											{feedback.user_id}
										</span>
									) : (
										<Badge variant="secondary">
											{t("admin.feedback.anonymous")}
										</Badge>
									)}
									{feedback.email && (
										<p className="mt-1 text-xs text-muted-foreground">
											{t("admin.feedback.reply_to", { email: feedback.email })}
										</p>
									)}
								</TableCell>
							</TableRow>
							<CollapsibleContent asChild>
								<tr className="border-b bg-muted/50">
									<td colSpan={3} className="px-4 py-3">
										<p className="whitespace-pre-wrap text-sm">
											{feedback.content}
										</p>
									</td>
								</tr>
							</CollapsibleContent>
						</TableBody>
					</Collapsible>
				))}
			</Table>
		</div>
	);
}
