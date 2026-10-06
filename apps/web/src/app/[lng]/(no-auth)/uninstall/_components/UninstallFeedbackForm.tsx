"use client";

import { captureException } from "@sentry/nextjs";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useFeedbackMutation } from "@web-memo/shared/hooks";
import {
	Alert,
	AlertDescription,
	Button,
	Input,
	Label,
	Loading,
	RadioGroup,
	RadioGroupItem,
} from "@web-memo/ui";
import { CircleAlert, HeartCrack } from "lucide-react";
import { type FormEvent, useState } from "react";

import { UNINSTALL_REASON_VALUES } from "../_constants";
import UninstallThanks from "./UninstallThanks";

/**
 * 확장을 지운 사람이 이유를 남기는 설문 카드입니다.
 * @description 응답은 `{ type, reason, feedback, timestamp }` JSON 문자열로 피드백 테이블에 저장합니다.
 * 이름·연락처·이메일은 받지 않습니다. 저장에 실패하면 원문 에러는 Sentry로만 보내고,
 * 화면에는 다시 시도하라는 안내만 보여줍니다.
 */
const UninstallFeedbackForm = ({ lng }: IFUninstallFeedbackFormProps) => {
	const { t } = useTranslation(lng);
	const { mutateAsync: mutateFeedbackAsync } = useFeedbackMutation();
	const [selectedReason, setSelectedReason] = useState("");
	const [feedbackText, setFeedbackText] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [hasSubmitError, setHasSubmitError] = useState(false);

	const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isSubmitting || selectedReason === "") {
			return;
		}

		setIsSubmitting(true);
		setHasSubmitError(false);

		try {
			// FeedbackService는 저장 실패를 throw하지 않고 { error }로 돌려준다.
			const { error } = await mutateFeedbackAsync({
				content: JSON.stringify({
					type: "uninstall",
					reason: selectedReason,
					feedback: feedbackText.trim(),
					timestamp: new Date().toISOString(),
				}),
				email: null,
				feedbackType: "uninstall",
			});

			if (error) {
				throw error;
			}

			setIsSubmitted(true);
		} catch (error) {
			captureException(error, {
				tags: { feature: "uninstall-survey" },
			});
			setHasSubmitError(true);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isSubmitted) {
		return <UninstallThanks lng={lng} />;
	}

	return (
		<form className="flex flex-col gap-6" onSubmit={handleFormSubmit}>
			{hasSubmitError && (
				<Alert variant="destructive">
					<CircleAlert className="h-4 w-4" />
					<AlertDescription>{t("uninstall.error")}</AlertDescription>
				</Alert>
			)}

			<div className="flex flex-col gap-3">
				<HeartCrack className="text-primary" size={48} aria-hidden="true" />

				<h1 className="text-2xl font-bold text-foreground">
					{t("uninstall.title")}
				</h1>
				<p className="text-sm text-muted-foreground">
					{t("uninstall.description")}
				</p>
			</div>

			<RadioGroup
				value={selectedReason}
				onValueChange={setSelectedReason}
				disabled={isSubmitting}
				aria-label={t("uninstall.title")}
				className="gap-2"
			>
				{UNINSTALL_REASON_VALUES.map((reason) => (
					<Label
						key={reason}
						htmlFor={`uninstall-reason-${reason}`}
						className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border px-4 text-sm font-normal"
					>
						<RadioGroupItem value={reason} id={`uninstall-reason-${reason}`} />
						{t(`uninstall.reasons.${reason}`)}
					</Label>
				))}
			</RadioGroup>

			<div className="flex flex-col gap-2">
				<Label htmlFor="uninstall-feedback">
					{t("uninstall.form.feedbackLabel")}{" "}
					<span className="font-normal text-muted-foreground">
						{t("uninstall.form.optional")}
					</span>
				</Label>
				<Input
					id="uninstall-feedback"
					value={feedbackText}
					onChange={(event) => setFeedbackText(event.target.value)}
					maxLength={200}
					disabled={isSubmitting}
					placeholder={t("uninstall.form.feedbackPlaceholder")}
				/>
			</div>

			<div className="flex flex-col gap-3">
				<Button
					type="submit"
					className="h-12 w-full rounded-xl"
					disabled={selectedReason === "" || isSubmitting}
				>
					{isSubmitting ? (
						<>
							<Loading className="mr-2" />
							{t("uninstall.form.submitting")}
						</>
					) : (
						t("uninstall.form.submit")
					)}
				</Button>

				<p className="text-xs text-muted-foreground">
					{t("uninstall.form.notice")}
				</p>
			</div>
		</form>
	);
};

export default UninstallFeedbackForm;

/** UninstallFeedbackForm의 props입니다. */
interface IFUninstallFeedbackFormProps extends LanguageType {}
