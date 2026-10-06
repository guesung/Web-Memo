"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Skeleton } from "@web-memo/ui";

/** 첫 로딩 중 실제 목록과 같은 모양(제목·블로그·게시일 줄)을 보여 주는 스켈레톤. */
export default function BlogReadingSkeleton({ lng }: LanguageType) {
	const { t } = useTranslation(lng);

	return (
		<output aria-busy="true" className="flex flex-col gap-4">
			<span className="sr-only">{t("blogs.loading.title")}</span>
			<Skeleton className="h-8 w-2/5" />
			<div className="overflow-hidden rounded-lg border border-border bg-card">
				{["first", "second", "third", "fourth"].map((rowId) => (
					<div
						key={rowId}
						className="flex items-start gap-3 border-b border-border p-4 last:border-b-0"
					>
						<Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-4/5" />
							<Skeleton className="h-3 w-3/5" />
						</div>
					</div>
				))}
			</div>
		</output>
	);
}
