"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { hasPaidSubscription } from "@web-memo/shared/hooks/billing";
import {
	Alert,
	AlertDescription,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Checkbox,
	Label,
	Skeleton,
} from "@web-memo/ui";
import Link from "next/link";
import Script from "next/script";
import { useState } from "react";
import { useBillingActions } from "../_hooks/useBillingActions";

/** 결제 성공을 추정하지 않고 서버 구독 상태와 다음 행동을 표시합니다. */
export const BillingOverview = (props: LanguageType) => {
	const { t } = useTranslation(props.lng);
	const billing = useBillingActions(props.lng);
	const [hasBillingConsent, setHasBillingConsent] = useState(false);
	const subscription = billing.subscriptionQuery.data?.subscription;
	const isPaid = hasPaidSubscription(subscription ?? null);
	const mutations = [
		billing.registerCardMutation,
		billing.issueKeyMutation,
		billing.subscribeMutation,
		billing.cancelMutation,
	];
	const isBillingBusy = mutations.some((mutation) => mutation.isPending);
	const billingError = mutations.find((mutation) => mutation.error)?.error;
	const periodEnd = subscription?.current_period_end;
	const isBillingReady =
		billing.configQuery.data?.billingEnabled &&
		!billing.configQuery.isError &&
		!billing.subscriptionQuery.isError;

	return (
		<main className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-12 pt-24 text-foreground">
			<h1 className="text-2xl font-semibold">{t("billing.manage")}</h1>
			{!billing.userId ? (
				<Card>
					<CardContent className="space-y-4 pt-6">
						<p>{t("billing.loginRequired")}</p>
						<Button asChild>
							<Link href={`/${props.lng}/login`}>{t("billing.login")}</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<>
					{billing.configQuery.data?.billingEnabled && (
						<Script
							src="https://js.tosspayments.com/v2/standard"
							strategy="afterInteractive"
						/>
					)}
					{(billing.subscriptionQuery.isLoading ||
						billing.configQuery.isLoading) && (
						<Skeleton className="h-48 w-full" />
					)}
					{(billing.subscriptionQuery.isError ||
						billing.configQuery.isError) && (
						<Alert variant="destructive">
							<AlertDescription>{t("billing.loadFailed")}</AlertDescription>
						</Alert>
					)}
					{billing.hasUnresolvedPayment && !isPaid && (
						<Alert>
							<AlertDescription>
								<output>{t("billing.paymentPending")}</output>
								{billing.canRetryPendingPayment && (
									<Button
										className="mt-3"
										variant="outline"
										disabled={isBillingBusy || !isBillingReady}
										onClick={() => billing.subscribeMutation.mutate(true)}
									>
										{t("billing.retryPendingPayment")}
									</Button>
								)}
							</AlertDescription>
						</Alert>
					)}
					{billing.callbackStatus === "failed" && (
						<Alert>
							<AlertDescription>
								{t("billing.registrationFailed")}
							</AlertDescription>
						</Alert>
					)}
					{billing.callbackStatus === "received" && (
						<Card>
							<CardContent className="space-y-4 pt-6">
								<p>{t("billing.registrationReceived")}</p>
								<Button
									disabled={isBillingBusy}
									onClick={() => billing.issueKeyMutation.mutate()}
								>
									{t("billing.confirmCard")}
								</Button>
							</CardContent>
						</Card>
					)}
					{billingError && (
						<Alert variant="destructive">
							<AlertDescription role="alert">
								{t(`billing.${billingError.message}`, {
									defaultValue: t("billing.actionFailed"),
								})}
							</AlertDescription>
						</Alert>
					)}
					{billing.subscriptionQuery.data && (
						<Card>
							<CardHeader className="space-y-3">
								<Badge className="w-fit">
									{isPaid ? t("billing.paid") : t("billing.free")}
								</Badge>
								<CardTitle>
									{isPaid ? t("billing.price") : t("billing.freePrice")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{isPaid && periodEnd && (
									<p>
										{t(
											subscription?.cancel_at_period_end
												? "billing.endsAt"
												: "billing.renewsAt",
											{
												date: new Intl.DateTimeFormat(props.lng, {
													dateStyle: "long",
												}).format(new Date(periodEnd)),
											},
										)}
									</p>
								)}
								{billing.subscriptionQuery.data.memoCount !== undefined && (
									<p>
										{t("billing.memoCount", {
											count: billing.subscriptionQuery.data.memoCount,
										})}
									</p>
								)}
								{!isPaid && (
									<p>
										{t("billing.freeLimit")} {t("billing.trashIncluded")}
									</p>
								)}
								{isPaid && (
									<p>
										{t("billing.aiUsage", {
											count: billing.subscriptionQuery.data.aiUsageCount,
											limit: billing.subscriptionQuery.data.aiUsageLimit,
										})}
									</p>
								)}
								<p className="text-sm text-muted-foreground">
									{t("billing.aiLimitDescription")}
								</p>
								<p className="text-sm text-muted-foreground">
									{t("billing.preservation")}
								</p>
							</CardContent>
						</Card>
					)}
					{!isPaid &&
						billing.subscriptionQuery.data &&
						!billing.hasUnresolvedPayment && (
							<Card>
								<CardContent className="space-y-4 pt-6">
									<h2 className="font-semibold">
										{t("billing.beforeSubscribe")}
									</h2>
									<p>{t("billing.renewalTerms")}</p>
									{!isBillingReady && (
										<output>{t("billing.billingUnavailable")}</output>
									)}
									<div className="flex items-start gap-3">
										<Checkbox
											id="billing-consent"
											checked={hasBillingConsent}
											onCheckedChange={(checked) =>
												setHasBillingConsent(checked === true)
											}
										/>
										<Label
											htmlFor="billing-consent"
											className="leading-relaxed"
										>
											{t("billing.consent")}
										</Label>
									</div>
									{billing.isCardRegistered ? (
										<>
											<p>{t("billing.cardRegistered")}</p>
											<Button
												disabled={
													!isBillingReady || !hasBillingConsent || isBillingBusy
												}
												onClick={() => billing.subscribeMutation.mutate(false)}
											>
												{t("billing.pay")}
											</Button>
										</>
									) : (
										<Button
											disabled={
												!isBillingReady ||
												!hasBillingConsent ||
												isBillingBusy ||
												billing.callbackStatus === "received"
											}
											onClick={() => billing.registerCardMutation.mutate()}
										>
											{t("billing.registerCard")}
										</Button>
									)}
								</CardContent>
							</Card>
						)}
					{isPaid && !subscription?.cancel_at_period_end && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="outline" disabled={isBillingBusy}>
									{t("billing.cancelRenewal")}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										{t("billing.cancelTitle")}
									</AlertDialogTitle>
									<AlertDialogDescription>
										{t("billing.cancelDescription")}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>
										{t("billing.keepSubscription")}
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => billing.cancelMutation.mutate()}
									>
										{t("billing.cancelRenewal")}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
					<Button
						variant="outline"
						disabled={billing.subscriptionQuery.isFetching || isBillingBusy}
						onClick={() => void billing.refreshBilling()}
					>
						{t("billing.refresh")}
					</Button>
				</>
			)}
			<nav className="flex flex-wrap gap-4 text-sm">
				<Link className="text-primary underline" href={`/${props.lng}/pricing`}>
					{t("billing.pricingTitle")}
				</Link>
				<Link className="text-primary underline" href={`/${props.lng}/memos`}>
					{t("billing.openMemos")}
				</Link>
			</nav>
		</main>
	);
};
