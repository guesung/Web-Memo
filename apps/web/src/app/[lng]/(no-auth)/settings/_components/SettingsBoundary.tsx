"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Button, ErrorBoundary, Skeleton } from "@web-memo/ui";
import { type PropsWithChildren, Suspense } from "react";

/** 설정 구역의 실패·대기를 다른 구역으로 전파하지 않는 경계입니다. */
export const SettingsBoundary = (props: PropsWithChildren<LanguageType>) => {
	const { t } = useTranslation(props.lng);

	return (
		<QueryErrorResetBoundary>
			{({ reset }) => (
				<ErrorBoundary
					onReset={reset}
					FallbackComponent={({ resetErrorBoundary }) => (
						<div
							role="alert"
							className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
						>
							<p className="text-sm">{t("setting.unified.loadFailed")}</p>
							<Button variant="outline" onClick={resetErrorBoundary}>
								{t("setting.unified.retry")}
							</Button>
						</div>
					)}
				>
					<Suspense fallback={<SettingsSkeleton lng={props.lng} />}>
						{props.children}
					</Suspense>
				</ErrorBoundary>
			)}
		</QueryErrorResetBoundary>
	);
};

/** 실제 값을 읽기 전에는 기본값 대신 로딩 자리를 표시합니다. */
export const SettingsSkeleton = (props: LanguageType) => {
	const { t } = useTranslation(props.lng);

	return (
		<output
			aria-label={t("setting.unified.loading")}
			className="block space-y-3 rounded-lg border p-4"
		>
			<Skeleton className="h-5 w-1/3" />
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-2/3" />
		</output>
	);
};
