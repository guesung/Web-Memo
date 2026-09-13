import { CONFIG } from "@web-memo/env";
import {
	hasPaidSubscription,
	useSubscriptionQuery,
} from "@web-memo/shared/hooks/billing";
import { I18n } from "@web-memo/shared/utils/extension";
import { Button } from "@web-memo/ui";

/** AI 제한과 신규 메모 제한을 메모 편집기를 가리지 않고 안내합니다. */
export const BillingNotice = () => {
	const subscriptionQuery = useSubscriptionQuery(CONFIG.webUrl);
	const isPaid = hasPaidSubscription(
		subscriptionQuery.data?.subscription ?? null,
	);
	const memoCount = subscriptionQuery.data?.memoCount ?? 0;

	return (
		<aside className="shrink-0 space-y-2 rounded-md border p-2 text-xs">
			{subscriptionQuery.isLoading && (
				<output className="block">{I18n.get("billing_loading")}</output>
			)}
			{subscriptionQuery.isError && (
				<output className="block">{I18n.get("billing_load_failed")}</output>
			)}
			{subscriptionQuery.data && (
				<>
					{isPaid ? (
						<p>
							{I18n.get("billing_ai_usage")}{" "}
							{subscriptionQuery.data.aiUsageCount} /{" "}
							{subscriptionQuery.data.aiUsageLimit}
						</p>
					) : (
						<p>{I18n.get("billing_ai_paid")}</p>
					)}
					{!isPaid && memoCount >= 50 && (
						<output className="block">{I18n.get("billing_memo_limit")}</output>
					)}
					<p className="text-muted-foreground">
						{I18n.get("billing_ai_safety")}
					</p>
				</>
			)}
			<div className="flex flex-wrap gap-2">
				<Button
					asChild
					variant="link"
					size="sm"
					className="h-auto whitespace-normal p-0"
				>
					<a href={`${CONFIG.webUrl}/pricing`} target="_blank" rel="noreferrer">
						{I18n.get("billing_view_pricing")}
					</a>
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="h-auto whitespace-normal p-0"
					disabled={subscriptionQuery.isFetching}
					onClick={() => void subscriptionQuery.refetch()}
				>
					{I18n.get("billing_refresh")}
				</Button>
			</div>
		</aside>
	);
};
