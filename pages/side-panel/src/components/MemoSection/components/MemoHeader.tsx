import { getMemoUrl, getOfflineControlDisabledReason } from "@src/utils";
import { analytics } from "@web-memo/shared/modules/analytics";
import type { Database } from "@web-memo/shared/types";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { Button, ErrorBoundary } from "@web-memo/ui";
import { ExternalLinkIcon } from "lucide-react";
import { Suspense } from "react";

/** 메모 헤더에 현재 편집 중인 메모 ID를 전달한다. */
export default function MemoHeader({
	memoData,
	isOffline = false,
	isSyncing = false,
}: IFMemoHeaderProps) {
	return (
		<div className="flex items-center gap-1">
			<span className="whitespace-nowrap font-bold">{I18n.get("memo")}</span>
			<ErrorBoundary>
				<Suspense fallback={<ExternalLinkIcon size={16} />}>
					<MemoLink
						memoData={memoData}
						isOffline={isOffline}
						isSyncing={isSyncing}
					/>
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}

function MemoLink({ memoData, isOffline, isSyncing }: IFMemoHeaderProps) {
	const openDisabledReason = getOfflineControlDisabledReason({
		isOffline: !!isOffline,
		isSyncing: !!isSyncing,
		kind: "open",
	});

	const handleMemoClick = () => {
		analytics.trackEvent({
			name: "open_web_from_extension",
			params: { from: "side_panel_memo" },
		});
		Tab.create({
			url: getMemoUrl({ id: memoData?.id, isWish: !!memoData?.isWish }),
		});
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			className="size-8 disabled:cursor-not-allowed disabled:opacity-50"
			onClick={handleMemoClick}
			tabIndex={0}
			aria-label="새 탭 열기"
			title={openDisabledReason}
			disabled={!!openDisabledReason}
			onKeyDown={(e) => e.key === "Enter" && handleMemoClick()}
		>
			<ExternalLinkIcon className="size-4" />
		</Button>
	);
}

/** 메모 헤더의 현재 편집 대상. */
interface IFMemoHeaderProps {
	memoData?: Database["memo"]["Tables"]["memo"]["Row"];
	isOffline?: boolean;
	isSyncing?: boolean;
}
