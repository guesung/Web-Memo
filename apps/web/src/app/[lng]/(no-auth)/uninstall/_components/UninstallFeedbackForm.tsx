"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	Button,
	Input,
	Label,
	RadioGroup,
	RadioGroupItem,
	Textarea,
} from "@web-memo/ui";
import { Gift, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface UninstallFeedbackFormProps extends LanguageType {}

interface FormData {
	reason: string;
	feedback: string;
	phoneNumber: string;
}

const UNINSTALL_REASONS = [
	"not_useful",
	"hard_to_use",
	"found_alternative",
	"performance_issues",
	"privacy_concerns",
	"other",
] as const;

const KOREAN_PHONE_REGEX = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;

function validateKoreanPhoneNumber(phone: string): boolean {
	if (!phone) return true;
	const digitsOnly = phone.replace(/[^0-9]/g, "");
	return (
		KOREAN_PHONE_REGEX.test(phone) || /^01[0-9][0-9]{7,8}$/.test(digitsOnly)
	);
}

export default function UninstallFeedbackForm({
	lng,
}: UninstallFeedbackFormProps) {
	const { t } = useTranslation(lng);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [phoneError, setPhoneError] = useState<string | null>(null);

	const { register, handleSubmit, watch, setValue } = useForm<FormData>({
		defaultValues: {
			reason: "",
			feedback: "",
			phoneNumber: "",
		},
	});

	const selectedReason = watch("reason");
	const feedback = watch("feedback");
	const phoneNumber = watch("phoneNumber");

	const onSubmit = async (data: FormData) => {
		setPhoneError(null);

		if (data.phoneNumber && !validateKoreanPhoneNumber(data.phoneNumber)) {
			setPhoneError(t("uninstall.form.phoneError"));
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await fetch("/api/uninstall-feedback", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (response.ok) {
				setIsSubmitted(true);
			}
		} catch (error) {
			console.error("Failed to submit feedback:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setValue("phoneNumber", value);
		if (phoneError && validateKoreanPhoneNumber(value)) {
			setPhoneError(null);
		}
	};

	if (isSubmitted) {
		return (
			<div className="flex flex-col items-center justify-center text-center gap-6 py-8">
				<div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
					<Gift className="w-10 h-10 text-white" />
				</div>
				<div className="space-y-2">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						{t("uninstall.success.title")}
					</h2>
					<p className="text-gray-600 dark:text-gray-400 max-w-md">
						{t("uninstall.success.description")}
					</p>
				</div>
				<p className="text-sm text-gray-500 dark:text-gray-500">
					{t("uninstall.success.giftNote")}
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="space-y-4">
				<Label className="text-base font-semibold text-gray-900 dark:text-white">
					{t("uninstall.form.reasonLabel")}
				</Label>
				<RadioGroup
					value={selectedReason}
					onValueChange={(value) => setValue("reason", value)}
					className="grid gap-3"
				>
					{UNINSTALL_REASONS.map((reason) => (
						<Label
							key={reason}
							className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
								selectedReason === reason
									? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
									: "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
							}`}
						>
							<RadioGroupItem value={reason} id={reason} />
							<span className="text-gray-700 dark:text-gray-300">
								{t(`uninstall.reasons.${reason}`)}
							</span>
						</Label>
					))}
				</RadioGroup>
			</div>

			<div className="space-y-3">
				<Label
					htmlFor="feedback"
					className="text-base font-semibold text-gray-900 dark:text-white"
				>
					{t("uninstall.form.feedbackLabel")}
				</Label>
				<Textarea
					{...register("feedback")}
					id="feedback"
					placeholder={t("uninstall.form.feedbackPlaceholder")}
					className="min-h-[120px] resize-none"
				/>
			</div>

			<div className="space-y-3">
				<Label
					htmlFor="phoneNumber"
					className="text-base font-semibold text-gray-900 dark:text-white"
				>
					{t("uninstall.form.phoneLabel")}
					<span className="ml-2 text-sm font-normal text-gray-500">
						{t("uninstall.form.optional")}
					</span>
				</Label>
				<Input
					{...register("phoneNumber")}
					id="phoneNumber"
					type="tel"
					placeholder={t("uninstall.form.phonePlaceholder")}
					onChange={handlePhoneChange}
					className={phoneError ? "border-red-500 focus:border-red-500" : ""}
				/>
				{phoneError ? (
					<p className="text-sm text-red-500">{phoneError}</p>
				) : (
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{t("uninstall.form.phoneDescription")}
					</p>
				)}
			</div>

			<div className="pt-4">
				<Button
					type="submit"
					disabled={isSubmitting || (!selectedReason && !feedback)}
					className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isSubmitting ? (
						t("uninstall.form.submitting")
					) : (
						<>
							<MessageSquare className="w-5 h-5 mr-2" />
							{t("uninstall.form.submit")}
						</>
					)}
				</Button>
			</div>
		</form>
	);
}
