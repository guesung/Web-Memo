import { getMemoUrl } from "@src/utils";
import { useMemoQuery, useTabQuery } from "@web-memo/shared/hooks";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { Button, ErrorBoundary } from "@web-memo/ui";
import { ExternalLinkIcon } from "lucide-react";
import { Suspense } from "react";

export default function MemoHeader() {
	return (
		<div className="flex items-center gap-1">
			<span className="whitespace-nowrap font-bold">{I18n.get("memo")}</span>
			<ErrorBoundary>
				<Suspense fallback={<ExternalLinkIcon size={16} />}>
					<MemoLink />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}

function MemoLink() {
	const { data: tab } = useTabQuery();
	const { memo: memoData } = useMemoQuery({
		url: tab?.url ?? "",
	});

	const handleMemoClick = () => {
		Tab.create({
			url: getMemoUrl({ id: memoData?.id, isWish: !!memoData?.isWish }),
		});
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			className="size-8"
			onClick={handleMemoClick}
			tabIndex={0}
			aria-label="새 탭 열기"
			onKeyDown={(e) => e.key === "Enter" && handleMemoClick()}
		>
			<ExternalLinkIcon className="size-4" />
		</Button>
	);
}
