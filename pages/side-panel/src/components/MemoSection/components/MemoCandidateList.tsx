import type { Database } from "@web-memo/shared/types";
import { I18n } from "@web-memo/shared/utils/extension";

/** 저장된 메모 행. */
type TMemo = Database["memo"]["Tables"]["memo"]["Row"];

/** 같은 페이지의 메모 후보를 고르는 화면의 입력. */
interface IFMemoCandidateListProps {
	memos: TMemo[];
	onMemoSelect: (memoId: number) => void;
}

/** 같은 페이지에 저장된 여러 메모를 모두 표시한다. */
export default function MemoCandidateList({
	memos,
	onMemoSelect,
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
				{memos.map((memo) => (
					<button
						key={memo.id}
						type="button"
						className="rounded-md border p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={() => onMemoSelect(memo.id)}
					>
						<span className="block truncate text-sm font-semibold">
							{memo.title}
						</span>
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
				))}
			</div>
		</div>
	);
}
