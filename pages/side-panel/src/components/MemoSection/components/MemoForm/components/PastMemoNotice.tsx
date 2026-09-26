import { analytics } from "@web-memo/shared/modules/analytics";
import type {
	IFPastMemoDuplicate,
	IFPastMemoRelated,
	TPastMemoSource,
} from "@web-memo/shared/types";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import {
	Button,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@web-memo/ui";
import {
	ChevronDownIcon,
	ChevronRightIcon,
	HistoryIcon,
	XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePastMemoMatch } from "../hooks";
import PastMemoNoticeItem from "./PastMemoNoticeItem";

/**
 * 메모 폼 위에 과거 메모(같은 글·관련 글)를 알려 주는 배너.
 * @description 결과가 없거나 로딩·실패·무시한 URL이면 아무것도 그리지 않아 자리를 차지하지 않는다.
 * 같은 글이 있으면 그 아래에 접힌 관련 메모 줄을 붙이고, 닫기(X)는 하나만 둔다.
 * 현재 사용처: MemoForm/index.tsx
 */
const PastMemoNotice = (props: IFPastMemoNoticeProps) => {
	const pastMemoMatch = usePastMemoMatch({ hasMemoData: props.hasMemoData });
	const shownUrlsRef = useRef(new Set<string>());

	const duplicate = pastMemoMatch.duplicate;
	const relatedMemos = pastMemoMatch.relatedMemos;
	const isNoticeVisible = !!duplicate || relatedMemos.length > 0;

	// 배너가 실제로 그려진 URL마다 한 번만 보낸다.
	useEffect(() => {
		const normalizedUrl = pastMemoMatch.normalizedUrl;

		if (
			!isNoticeVisible ||
			!normalizedUrl ||
			shownUrlsRef.current.has(normalizedUrl)
		) {
			return;
		}

		shownUrlsRef.current.add(normalizedUrl);
		analytics.trackEvent({
			name: "past_memo_show",
			params: getEventParams(duplicate),
		});
	}, [isNoticeVisible, pastMemoMatch.normalizedUrl, duplicate]);

	if (!isNoticeVisible) {
		return null;
	}

	const handleDismissButtonClick = () => {
		analytics.trackEvent({
			name: "past_memo_dismiss",
			params: getEventParams(duplicate),
		});
		void pastMemoMatch.dismissCurrentUrl();
	};

	const handleDuplicateOpenClick = (pastMemoDuplicate: IFPastMemoDuplicate) => {
		analytics.trackEvent({
			name: "past_memo_open",
			params: { kind: "duplicate", source: pastMemoDuplicate.source },
		});
		void Tab.create({ url: pastMemoDuplicate.url });
	};

	const handleRelatedItemClick = (relatedMemo: IFPastMemoRelated) => {
		analytics.trackEvent({
			name: "past_memo_open",
			params: { kind: "related", source: "jev" },
		});
		void Tab.create({ url: relatedMemo.url });
	};

	const dismissButton = (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className="size-8 shrink-0"
			aria-label={I18n.get("past_memo_dismiss")}
			title={I18n.get("past_memo_dismiss")}
			onClick={handleDismissButtonClick}
		>
			<XIcon aria-hidden="true" />
		</Button>
	);

	return (
		<div
			// URL이 바뀌면 관련 메모 펼침 상태를 새로 시작한다.
			key={pastMemoMatch.normalizedUrl}
			// biome-ignore lint/a11y/useSemanticElements: output은 phrasing content만 담을 수 있어 문단·목록·버튼 묶음을 넣지 못한다
			role="status"
			aria-live="polite"
			className="min-w-0 shrink-0 animate-in fade-in rounded-md border bg-background px-2 py-1 text-xs"
		>
			{duplicate && (
				<PastMemoDuplicate
					duplicate={duplicate}
					dismissButton={dismissButton}
					onOpenClick={() => handleDuplicateOpenClick(duplicate)}
				/>
			)}
			{relatedMemos.length > 0 && (
				<PastMemoRelatedList
					relatedMemos={relatedMemos}
					dismissButton={duplicate ? null : dismissButton}
					onItemClick={handleRelatedItemClick}
				/>
			)}
		</div>
	);
};

export default PastMemoNotice;

/** 같은 글로 판정된 기존 메모 안내. 두 번째 줄에 제목·열기·닫기를 둔다. */
const PastMemoDuplicate = (props: IFPastMemoDuplicateProps) => {
	const messageKey =
		props.duplicate.source === "rule"
			? "past_memo_duplicate_rule"
			: "past_memo_duplicate_jev";

	return (
		<div className="min-w-0">
			<p className="flex items-center gap-1 text-muted-foreground">
				<HistoryIcon
					className="size-4 shrink-0 text-muted-foreground"
					aria-hidden="true"
				/>
				{I18n.get(messageKey)}
			</p>
			<div className="flex min-w-0 items-center gap-2">
				<span
					className="min-w-0 flex-1 truncate font-medium"
					title={props.duplicate.title}
				>
					{props.duplicate.title}
				</span>
				<Button
					type="button"
					variant="link"
					className="h-auto shrink-0 p-0 text-xs"
					onClick={props.onOpenClick}
				>
					{I18n.get("past_memo_open")}
				</Button>
				{props.dismissButton}
			</div>
		</div>
	);
};

/** 관련 메모 목록. 기본은 접혀 있고 머리줄을 누르면 펼친다. */
const PastMemoRelatedList = (props: IFPastMemoRelatedListProps) => {
	const [isRelatedListOpen, setIsRelatedListOpen] = useState(false);

	const ChevronIcon = isRelatedListOpen ? ChevronDownIcon : ChevronRightIcon;

	return (
		<Collapsible open={isRelatedListOpen} onOpenChange={setIsRelatedListOpen}>
			<div className="flex min-h-8 min-w-0 items-center gap-2">
				<CollapsibleTrigger className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-1 rounded-sm text-left text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1">
					<ChevronIcon className="size-4 shrink-0" aria-hidden="true" />
					<span className="truncate">
						{I18n.get("past_memo_related", String(props.relatedMemos.length))}
					</span>
				</CollapsibleTrigger>
				{props.dismissButton}
			</div>
			<CollapsibleContent>
				<ul className="min-w-0">
					{props.relatedMemos.map((relatedMemo) => (
						<PastMemoNoticeItem
							key={relatedMemo.id}
							relatedMemo={relatedMemo}
							onItemClick={() => props.onItemClick(relatedMemo)}
						/>
					))}
				</ul>
			</CollapsibleContent>
		</Collapsible>
	);
};

/** 표시·닫기 이벤트의 kind/source. 같은 글이 있으면 그쪽을 기준으로 한다. */
const getEventParams = (
	duplicate: IFPastMemoDuplicate | null,
): IFPastMemoEventParams => {
	if (duplicate) {
		return { kind: "duplicate", source: duplicate.source };
	}

	return { kind: "related", source: "jev" };
};

/** past_memo_* GA 이벤트 파라미터 */
interface IFPastMemoEventParams {
	kind: "duplicate" | "related";
	source: TPastMemoSource;
}

/** PastMemoNotice props */
interface IFPastMemoNoticeProps {
	/** 현재 URL에 저장된 메모가 있는지. 있으면 판정을 요청하지 않는다 */
	hasMemoData: boolean;
}

/** PastMemoDuplicate props */
interface IFPastMemoDuplicateProps {
	/** 같은 글로 판정된 기존 메모 */
	duplicate: IFPastMemoDuplicate;
	/** 둘째 줄 끝에 둘 닫기 버튼 */
	dismissButton: ReactNode;
	/** 열기를 눌렀을 때 */
	onOpenClick: () => void;
}

/** PastMemoRelatedList props */
interface IFPastMemoRelatedListProps {
	/** 보여 줄 관련 메모(최대 3개) */
	relatedMemos: IFPastMemoRelated[];
	/** 머리줄 끝에 둘 닫기 버튼. 같은 글 안내가 이미 닫기를 갖고 있으면 null */
	dismissButton: ReactNode;
	/** 관련 메모 행을 눌렀을 때 */
	onItemClick: (relatedMemo: IFPastMemoRelated) => void;
}
