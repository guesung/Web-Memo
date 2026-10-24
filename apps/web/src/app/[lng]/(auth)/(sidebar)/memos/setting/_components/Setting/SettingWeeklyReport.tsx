"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useSettingQuery,
	useSettingUpsertMutation,
	useSupabaseUserQuery,
	useWeeklyReportTestMutation,
	WeeklyReportTestError,
} from "@web-memo/shared/hooks";
import { Button, cn, Input, Switch, toast } from "@web-memo/ui";
import { Loader2, Mail } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import SettingRow from "./SettingRow";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TEmailError = "invalid" | "required";

interface IFSettingWeeklyReportProps extends LanguageType {}

/** 주간 리포트 메일을 받을지, 어느 주소로 받을지 정하고 테스트 메일을 보내 보는 설정 */
export default function SettingWeeklyReport({
	lng,
}: IFSettingWeeklyReportProps) {
	const { t } = useTranslation(lng);
	const { weeklyReportEnabled, weeklyReportEmail } = useSettingQuery();
	const { user } = useSupabaseUserQuery();
	const { mutate: upsertSetting, isPending } = useSettingUpsertMutation();

	const loginEmail = user.data.user?.email;

	const handleEnabledChange = (checked: boolean) => {
		// 저장된 주소는 유지한다. 주소가 없을 때만 로그인 이메일을 채워 넣는다.
		const shouldFillLoginEmail = checked && !weeklyReportEmail && loginEmail;

		upsertSetting(
			shouldFillLoginEmail
				? { weekly_report_enabled: true, weekly_report_email: loginEmail }
				: { weekly_report_enabled: checked },
			{
				onError: () =>
					toast({ title: t("setting.saveFailed"), variant: "destructive" }),
			},
		);
	};

	return (
		<>
			<SettingRow
				label={t("setting.weeklyReportEnable")}
				description={t("setting.weeklyReportEnableDescription")}
				htmlFor="weekly-report-enabled"
			>
				<Switch
					id="weekly-report-enabled"
					checked={weeklyReportEnabled}
					disabled={isPending}
					onCheckedChange={handleEnabledChange}
				/>
			</SettingRow>
			{weeklyReportEnabled && (
				// 주소를 저장하지 않았으면 발송도 로그인 이메일로 가므로 그 주소를 보여 준다
				<WeeklyReportEmailFields
					lng={lng}
					savedEmail={weeklyReportEmail ?? loginEmail ?? null}
				/>
			)}
		</>
	);
}

interface IFWeeklyReportEmailFieldsProps extends LanguageType {
	savedEmail: string | null;
}

/**
 * 리포트를 켠 동안만 보이는 받을 이메일 입력과 테스트 메일 발송.
 *
 * @description 켜졌는데 저장된 주소가 없으면(로그인 이메일도 없는 계정) 처음부터 빈칸 오류로
 * 열리고 입력칸에 포커스를 준다.
 */
function WeeklyReportEmailFields({
	lng,
	savedEmail,
}: IFWeeklyReportEmailFieldsProps) {
	const { t } = useTranslation(lng);
	const { mutate: upsertSetting, isPending: isSaving } =
		useSettingUpsertMutation();
	const { mutate: sendTestMail, isPending: isSending } =
		useWeeklyReportTestMutation();

	const inputRef = useRef<HTMLInputElement>(null);
	const [draft, setDraft] = useState(savedEmail ?? "");
	const [error, setError] = useState<TEmailError | null>(
		savedEmail ? null : "required",
	);

	useEffect(() => {
		if (!savedEmail) {
			inputRef.current?.focus();
		}
	}, [savedEmail]);

	const trimmedDraft = draft.trim();
	const isEdited = trimmedDraft !== (savedEmail ?? "");

	const commit = () => {
		if (isSaving) return;

		if (!isEdited && savedEmail) {
			setError(null);
			return;
		}
		if (!trimmedDraft) {
			setError("required");
			return;
		}
		if (!EMAIL_PATTERN.test(trimmedDraft)) {
			setError("invalid");
			return;
		}

		setError(null);
		upsertSetting(
			{ weekly_report_email: trimmedDraft },
			{
				onSuccess: () => toast({ title: t("toastTitle.successSave") }),
				onError: () =>
					toast({ title: t("setting.saveFailed"), variant: "destructive" }),
			},
		);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			commit();
		}
	};

	const handleSendTest = () => {
		sendTestMail(undefined, {
			onSuccess: ({ email }) =>
				toast({
					title: t("setting.weeklyReportTestSent", { email }),
					description: t("setting.weeklyReportTestSentDescription"),
				}),
			onError: (sendError) => {
				if (
					sendError instanceof WeeklyReportTestError &&
					sendError.reason === "rate_limited"
				) {
					toast({ title: t("setting.weeklyReportTestRateLimited") });
					return;
				}
				toast({
					title: t("setting.weeklyReportTestFailed"),
					description: t("setting.weeklyReportTestFailedDescription"),
					variant: "destructive",
				});
			},
		});
	};

	const errorMessage = error
		? t(
				error === "required"
					? "setting.weeklyReportEmailRequired"
					: "setting.weeklyReportEmailInvalid",
			)
		: null;
	const isTestDisabled = error !== null || isEdited || isSaving || isSending;

	return (
		<div className="flex animate-fade-in flex-col gap-4">
			<SettingRow
				label={t("setting.weeklyReportEmail")}
				description={errorMessage ?? t("setting.weeklyReportEmailDescription")}
				isDescriptionError={errorMessage !== null}
				htmlFor="weekly-report-email"
			>
				<div className="relative sm:w-64">
					<Input
						ref={inputRef}
						id="weekly-report-email"
						type="email"
						inputMode="email"
						autoComplete="email"
						value={draft}
						placeholder={t("setting.weeklyReportEmailPlaceholder")}
						disabled={isSaving}
						aria-invalid={error !== null}
						className={cn(
							"pr-9",
							error !== null &&
								"border-destructive focus-visible:ring-destructive",
						)}
						onChange={(event) => setDraft(event.target.value)}
						onBlur={commit}
						onKeyDown={handleKeyDown}
					/>
					{isSaving && (
						<Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
					)}
				</div>
			</SettingRow>
			<SettingRow
				label={t("setting.weeklyReportTest")}
				description={t("setting.weeklyReportTestDescription")}
			>
				<Button
					variant="outline"
					className="max-sm:w-full"
					disabled={isTestDisabled}
					onClick={handleSendTest}
				>
					{isSending ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Mail className="mr-2 h-4 w-4" />
					)}
					{isSending
						? t("setting.weeklyReportTestSending")
						: t("setting.weeklyReportTestButton")}
				</Button>
			</SettingRow>
		</div>
	);
}
