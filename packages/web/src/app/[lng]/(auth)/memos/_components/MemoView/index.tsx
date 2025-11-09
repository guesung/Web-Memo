"use client";

import { useGuide } from "@src/modules/guide";
import type { LanguageType } from "@src/modules/i18n";
import { useDidMount, useInfiniteMemosQuery } from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import MemoGrid from "./MemoGrid";

const MemoRefreshButton = dynamic(() => import("./MemoRefreshButton"), {
	ssr: false,
});

export default function MemoView({ lng }: LanguageType) {
	const { data: infiniteMemos } = useInfiniteMemosQuery();

	// Calculate total memos count
	const totalMemos = useMemo(() => {
		if (!infiniteMemos || !infiniteMemos.pages) return 0;
		return infiniteMemos.pages.flat().length;
	}, [infiniteMemos]);

	useGuide({ lng });
	useDidMount(() => ExtensionBridge.requestSyncLoginStatus());

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex items-center">
				<div className="flex w-full items-center justify-between">
					<p className="text-muted-foreground select-none text-sm flex items-center gap-2">
						<span className="w-2 h-2 bg-primary rounded-full" />
						Total: {totalMemos} memos
					</p>
					<div className="flex">
						<MemoRefreshButton lng={lng} />
					</div>
				</div>
			</div>

			<MemoGrid lng={lng} />
		</div>
	);
}
