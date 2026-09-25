import type { Database } from "@web-memo/shared/types";
import { I18n } from "@web-memo/shared/utils/extension";
import { PlusIcon, Trash2Icon } from "lucide-react";

/** 저장된 메모 행. */
type TMemo = Database["memo"]["Tables"]["memo"]["Row"];

/** 같은 페이지의 메모 후보를 고르는 화면의 입력. */
interface IFMemoCandidateListProps {
	/** 현재 주소와 페이지 키가 같은 메모 */
	memos: TMemo[];
	/** 경로는 같고 쿼리만 다른 주소에 남긴 메모 */
	otherUrlMemos: TMemo[];
	onMemoSelect: (memoId: number) => void;
	/** 후보 메모를 휴지통으로 옮길 때 */
	onMemoDelete: (memoId: number) => void;
	/** 현재 주소에 새 메모를 쓸 때. 현재 주소에 메모가 없을 때만 넘긴다 */
	onNewMemoClick?: () => void;
}

/** 같은 페이지에 저장된 메모와 쿼리만 다른 주소의 메모를 모두 표시한다. */
export default function MemoCandidateList({
	memos,
	otherUrlMemos,
	onMemoSelect,
	onMemoDelete,
	onNewMemoClick,
}: IFMemoCandidateListProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2 py-2">
			<p className="text-sm font-semibold">
				{I18n.get("memo_candidates_title")}
			</p>
			<p className="text-xs text-muted-foreground">
				{I18n.get("memo_candidates_description")}
			</p>
			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
				{onNewMemoClick && (
					<button
						type="button"
						className="flex items-center gap-2 rounded-md border border-dashed p-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={onNewMemoClick}
					>
						<PlusIcon className="size-4 shrink-0" aria-hidden="true" />
						{I18n.get("memo_candidates_new")}
					</button>
				)}
				{memos.map((memo) => (
					<MemoCandidateItem
						key={memo.id}
						memo={memo}
						onMemoSelect={onMemoSelect}
						onMemoDelete={onMemoDelete}
					/>
				))}
				{otherUrlMemos.length > 0 && (
					<p className="pt-1 text-xs font-semibold text-muted-foreground">
						{I18n.get("memo_candidates_other_url")}
					</p>
				)}
				{otherUrlMemos.map((memo) => (
					<MemoCandidateItem
						key={memo.id}
						memo={memo}
						urlLabel={getUrlLabel(memo.url)}
						onMemoSelect={onMemoSelect}
						onMemoDelete={onMemoDelete}
					/>
				))}
			</div>
		</div>
	);
}

/**
 * 후보 메모 한 행. 다른 주소의 메모면 어느 주소인지 함께 보여 준다.
 * @description 버튼 안에 버튼을 둘 수 없어 선택과 삭제를 형제 버튼으로 나눈다.
 */
const MemoCandidateItem = ({
	memo,
	urlLabel,
	onMemoSelect,
	onMemoDelete,
}: IFMemoCandidateItemProps) => (
	<div className="relative rounded-md border hover:bg-accent">
		<button
			type="button"
			className="w-full rounded-md p-3 pr-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onClick={() => onMemoSelect(memo.id)}
		>
			<span className="block truncate text-sm font-semibold">{memo.title}</span>
			{urlLabel && (
				<span
					className="mt-1 block truncate text-xs text-muted-foreground"
					title={memo.url}
				>
					{urlLabel}
				</span>
			)}
			<span className="mt-1 block line-clamp-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
				{memo.memo || I18n.get("memo_candidates_empty_preview")}
			</span>
			{memo.updated_at && (
				<time
					className="mt-2 block text-xs text-muted-foreground"
					dateTime={memo.updated_at}
				>
					{new Date(memo.updated_at).toLocaleString()}
				</time>
			)}
		</button>
		<button
			type="button"
			aria-label={I18n.get("memo_candidates_delete")}
			title={I18n.get("memo_candidates_delete")}
			className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground hover:bg-background hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onClick={() => onMemoDelete(memo.id)}
		>
			<Trash2Icon className="size-4" aria-hidden="true" />
		</button>
	</div>
);

/** 경로가 같은 후보끼리 구분되는 부분(쿼리)만 보여 준다. 쿼리가 없으면 경로를 보여 준다. */
const getUrlLabel = (url: string) => {
	try {
		const parsedUrl = new URL(url);

		return parsedUrl.search || parsedUrl.pathname;
	} catch {
		return url;
	}
};

/** 후보 메모 한 행의 입력. */
interface IFMemoCandidateItemProps {
	memo: TMemo;
	/** 다른 주소의 메모일 때 보여 줄 주소 구분 표시 */
	urlLabel?: string;
	onMemoSelect: (memoId: number) => void;
	onMemoDelete: (memoId: number) => void;
}
