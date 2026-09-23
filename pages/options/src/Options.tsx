import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	ErrorBoundary,
	Skeleton,
	Toaster,
} from "@web-memo/ui";
import { Suspense } from "react";

import { Header, MemoFieldsOption, Option, QueryProvider } from "./components";

/** 옵션 화면의 조회 실패를 재시도합니다. */
interface IFOptionsErrorProps {
	error: Error;
	resetErrorBoundary: () => void;
}

/** 설정을 읽지 못했을 때 재시도 동작을 제공합니다. */
const OptionsError = (props: IFOptionsErrorProps) => {
	return (
		<Card role="alert">
			<CardContent className="flex items-center justify-between gap-4 pt-6">
				<p>{I18n.get("setting_load_failed")}</p>
				<Button type="button" onClick={props.resetErrorBoundary}>
					{I18n.get("retry")}
				</Button>
			</CardContent>
		</Card>
	);
};

/** 설정 카드의 첫 조회 자리입니다. */
interface IFOptionsSkeletonProps {
	cardCount: number;
}

/** 조회 중인 설정 카드의 자리입니다. */
const OptionsSkeleton = (props: IFOptionsSkeletonProps) => {
	return (
		<output
			aria-label={I18n.get("setting_loading")}
			className="flex flex-col gap-6"
		>
			{Array.from({ length: props.cardCount }, (_, index) => index).map(
				(index) => (
					<Card key={index}>
						<CardHeader>
							<Skeleton className="h-6 w-36" />
						</CardHeader>
						<CardContent className="flex flex-col gap-3 pb-6">
							<Skeleton className="h-5 w-52" />
							<Skeleton className="h-5 w-44" />
						</CardContent>
					</Card>
				),
			)}
		</output>
	);
};

/** 확장 프로그램의 옵션 페이지입니다. */
const Options = () => {
	return (
		<QueryProvider>
			<Header />
			<main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8 text-start text-base">
				<p className="text-sm text-muted-foreground">
					{I18n.get("settings_auto_save_description")}
				</p>
				<QueryErrorResetBoundary>
					{({ reset }) => (
						<ErrorBoundary onReset={reset} FallbackComponent={OptionsError}>
							<Suspense fallback={<OptionsSkeleton cardCount={1} />}>
								<MemoFieldsOption />
							</Suspense>
						</ErrorBoundary>
					)}
				</QueryErrorResetBoundary>
				<QueryErrorResetBoundary>
					{({ reset }) => (
						<ErrorBoundary onReset={reset} FallbackComponent={OptionsError}>
							<Suspense fallback={<OptionsSkeleton cardCount={2} />}>
								<Option />
							</Suspense>
						</ErrorBoundary>
					)}
				</QueryErrorResetBoundary>
			</main>
			<Toaster />
		</QueryProvider>
	);
};

export default Options;
