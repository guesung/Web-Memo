"use client";

import LocalizedLink from "@src/components/LocalizedLink";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import { Button, Loading } from "@web-memo/ui";
import { Check, CircleAlert } from "lucide-react";
import { useState } from "react";

import { requestUnsubscribe, type TUnsubscribeResult } from "../_utils";

/** 요청 결과를 화면 상태로 옮깁니다. */
const STATUS_BY_RESULT: Record<TUnsubscribeResult, TUnsubscribeStatus> = {
	ok: "success",
	invalidToken: "invalidLink",
	failed: "error",
};

/**
 * 주간 메모 메일 수신 거부 확인 카드입니다.
 * @description 메일 스캐너가 링크를 GET으로 열어도 꺼지지 않도록, 페이지를 열 때는 아무것도
 * 보내지 않고 버튼을 눌렀을 때만 POST합니다. 토큰이 없으면 처음부터 잘못된 링크로 보여줍니다.
 */
const UnsubscribeCard = ({ lng, token }: IFUnsubscribeCardProps) => {
	const { t } = useTranslation(lng);
	const [status, setStatus] = useState<TUnsubscribeStatus>(
		token ? "idle" : "invalidLink",
	);

	const handleConfirmClick = async () => {
		if (!token || status === "pending") return;

		setStatus("pending");
		const result = await requestUnsubscribe(token);
		analytics.trackEvent({ name: "email_unsubscribe", params: { result } });
		setStatus(STATUS_BY_RESULT[result]);
	};

	if (status === "success") {
		return (
			<div className="flex animate-fade-in flex-col gap-3">
				<Check className="text-primary" size={48} aria-hidden="true" />
				<h1 className="text-2xl font-bold text-foreground">
					{t("unsubscribe.success.title")}
				</h1>
				<p className="text-sm text-muted-foreground">
					{t("unsubscribe.success.description")}
				</p>
				<LocalizedLink
					lng={lng}
					href={PATHS.memosSetting}
					className="text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					{t("unsubscribe.success.enableAgain")}
				</LocalizedLink>
			</div>
		);
	}

	if (status === "invalidLink") {
		return (
			<div className="flex flex-col gap-3" role="alert">
				<CircleAlert
					className="text-destructive"
					size={48}
					aria-hidden="true"
				/>
				<h1 className="text-2xl font-bold text-foreground">
					{t("unsubscribe.invalidLink.title")}
				</h1>
				<p className="text-sm text-muted-foreground">
					{t("unsubscribe.invalidLink.description")}
				</p>
			</div>
		);
	}

	const isPending = status === "pending";
	const buttonLabel = isPending
		? t("unsubscribe.pending")
		: status === "error"
			? t("unsubscribe.error.retry")
			: t("unsubscribe.confirm");

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3">
				<h1 className="text-2xl font-bold text-foreground">
					{t("unsubscribe.title")}
				</h1>
				<p className="text-sm text-muted-foreground">
					{t("unsubscribe.description")}
				</p>
			</div>

			{status === "error" && (
				<p role="alert" className="text-sm text-destructive">
					{t("unsubscribe.error.title")}. {t("unsubscribe.error.description")}
				</p>
			)}

			<Button
				onClick={handleConfirmClick}
				disabled={isPending}
				className="h-12 gap-2 rounded-xl"
			>
				{isPending && <Loading className="m-0" />}
				{buttonLabel}
			</Button>
		</div>
	);
};

export default UnsubscribeCard;

/** 수신 거부 카드가 그리는 상태입니다. */
type TUnsubscribeStatus =
	| "idle"
	| "pending"
	| "success"
	| "error"
	| "invalidLink";

/** UnsubscribeCard의 props입니다. */
interface IFUnsubscribeCardProps extends LanguageType {
	/** 메일 링크 쿼리의 토큰. 없으면 잘못된 링크로 처리합니다 */
	token?: string;
}
