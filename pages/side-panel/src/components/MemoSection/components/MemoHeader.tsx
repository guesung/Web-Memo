import { getMemoUrl } from "@src/utils";
import { useDidMount, useMemoQuery, useTabQuery } from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { Button, ErrorBoundary, Skeleton } from "@web-memo/ui";
import { ExternalLinkIcon } from "lucide-react";
import { Suspense } from "react";

export default function MemoHeader() {
	return (
		<div className="flex items-center">
			<div className="flex items-center gap-1">
				<span className="whitespace-nowrap font-bold">{I18n.get("memo")}</span>
				<ErrorBoundary>
					<Suspense fallback={<ExternalLinkIcon size={16} />}>
						<MemoLink />
					</Suspense>
				</ErrorBoundary>
			</div>
			<span className="w-4" />
			<ErrorBoundary>
				<Suspense fallback={<Skeleton className="ml-auto h-full w-32" />}>
					<TabTitle />
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

function TabTitle() {
	const { data: tab, refetch: refetchTab } = useTabQuery();

	useDidMount(() =>
		bridge.handle.UPDATE_SIDE_PANEL(() => {
			refetchTab();
		}),
	);

	return (
		<span className="w-full truncate text-right" title={String(tab?.index)}>
			{tab?.title}
		</span>
	);
}
