import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Textarea,
} from "@web-memo/ui";
import { useForm } from "react-hook-form";

interface FeedbackDialogProps extends LanguageType {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (content: string, email?: string) => void;
}

export default function FeedbackDialog({
	isOpen,
	onClose,
	onSubmit,
	lng,
}: FeedbackDialogProps) {
	const { t } = useTranslation(lng);
	const { register, handleSubmit, reset, watch } = useForm({
		defaultValues: {
			content: "",
			email: "",
		},
	});

	const onSubmitHandler = handleSubmit((data) => {
		onSubmit(data.content, data.email || undefined);
		reset();
	});

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t("feedback.title")}</DialogTitle>
					<DialogDescription>{t("feedback.description")}</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmitHandler} className="space-y-4">
					<div className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="content">{t("feedback.content-label")}</Label>
							<Textarea
								{...register("content")}
								placeholder={t("feedback.placeholder")}
								className="min-h-[100px]"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="email">{t("feedback.email-label")}</Label>
							<Input
								{...register("email")}
								type="email"
								placeholder={t("feedback.email-placeholder")}
							/>
							<p className="text-sm text-muted-foreground">
								{t("feedback.email-description")}
							</p>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={onClose}>
							{t("feedback.cancel")}
						</Button>
						<Button type="submit" disabled={watch("content").length === 0}>
							{t("feedback.submit")}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
