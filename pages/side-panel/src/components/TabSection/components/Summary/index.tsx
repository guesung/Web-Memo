import LoginRequiredNotice from "@src/components/LoginRequiredNotice";
import { usePageContentContext } from "@src/components/PageContentProvider";
import { useIsGuest } from "@src/hooks";
import { useSupabaseUserQuery, useTabQuery } from "@web-memo/shared/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Button,
	ErrorBoundary,
	ErrorFallback,
	TextShimmer,
} from "@web-memo/ui";
import { Sparkles } from "lucide-react";
import { Suspense } from "react";
import { formatSummaryText } from "../../../../hooks/useSummary/util";
import { useSummaryContext } from "./components/SummaryProvider";

export default function Summary({
	isAwaitingSummary,
}: {
	isAwaitingSummary: boolean;
}) {
	const { content, isLoading, error } = usePageContentContext();
	const { data: tab } = useTabQuery();
	const { isAuthPending } = useSummaryContext();
	const isGuest = useIsGuest();

	// 요약은 AI를 부르므로 비로그인에서는 페이지 상태와 무관하게 로그인 안내만 보여 준다.
	if (isGuest) {
		return <LoginRequiredNotice />;
	}

	if (isLoading) {
		return (
			<div className="flex h-full flex-1 items-center justify-center">
				<TextShimmer className="text-sm">
					{I18n.get("summary_page_loading_message")}
				</TextShimmer>
			</div>
		);
	}

	if (error || !content.trim()) {
		const isWebPage = /^https?:\/\//i.test(tab?.url ?? "");
		return (
			<p className="pt-4 text-sm text-muted-foreground">
				{I18n.get(
					error && isWebPage
						? "summary_page_read_failed_message"
						: "summary_unavailable_message",
				)}
			</p>
		);
	}

	if (isAwaitingSummary) {
		return (
			<div className="flex h-full flex-1 items-center justify-center">
				<TextShimmer className="text-sm">
					{I18n.get(
						isAuthPending ? "summary_login_message" : "summary_loading_message",
					)}
				</TextShimmer>
			</div>
		);
	}

	return (
		<ErrorBoundary FallbackComponent={ErrorFallback}>
			<Suspense
				fallback={
					<p className="pt-4 text-sm text-muted-foreground">
						{I18n.get("summary_login_message")}
					</p>
				}
			>
				<AuthenticatedSummary />
			</Suspense>
		</ErrorBoundary>
	);
}

function AuthenticatedSummary() {
	const { user } = useSupabaseUserQuery();
	const { summary, errorMessage, isSummaryLoading, generateSummary } =
		useSummaryContext();

	if (!user?.data.user) {
		return <LoginRequiredNotice />;
	}

	if (errorMessage) {
		return (
			<div className="flex flex-col items-start gap-3 pt-4 text-sm">
				<p className="text-destructive whitespace-pre-wrap">{errorMessage}</p>
				<Button
					variant="outline"
					disabled={isSummaryLoading}
					onClick={() => generateSummary("empty_state")}
				>
					{I18n.get("summary_retry_label")}
				</Button>
			</div>
		);
	}

	if (isSummaryLoading && !summary) {
		return (
			<div className="flex h-full flex-1 items-center justify-center">
				<TextShimmer className="text-sm">
					{I18n.get("summary_loading_message")}
				</TextShimmer>
			</div>
		);
	}

	if (!summary && !isSummaryLoading) {
		return (
			<div className="flex h-full flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
				<p className="text-center text-sm">
					{I18n.get("summary_empty_message")}
				</p>
				<Button
					variant="outline"
					onClick={() => generateSummary("empty_state")}
				>
					<Sparkles />
					{I18n.get("summary_generate_label")}
				</Button>
			</div>
		);
	}

	return (
		<div className="break-words pt-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
			{formatSummaryText(summary)}
		</div>
	);
}
