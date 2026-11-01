"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useFavoriteAddMutation,
	useFavoriteUpdateMutation,
} from "@web-memo/shared/hooks";
import {
	isFavoriteDuplicateError,
	normalizeFavoriteUrl,
	type TFavoriteRow,
} from "@web-memo/shared/utils";
import {
	Button,
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Loading,
	toast,
} from "@web-memo/ui";
import { useForm } from "react-hook-form";

interface FavoriteFormDialogProps {
	lng: Language;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** 있으면 수정 모드, 없으면 추가 모드 */
	favorite?: TFavoriteRow;
}

interface FavoriteFormValues {
	url: string;
	title: string;
}

const URL_ERROR_ID = "favorite-url-error";

/** 즐겨찾기를 직접 추가하거나 URL·제목을 수정하는 다이얼로그. 저장 응답을 받은 뒤에 닫는다. */
export function FavoriteFormDialog({
	lng,
	open,
	onOpenChange,
	favorite,
}: FavoriteFormDialogProps) {
	const { t } = useTranslation(lng);
	const addMutation = useFavoriteAddMutation();
	const updateMutation = useFavoriteUpdateMutation();
	const {
		register,
		handleSubmit,
		setError,
		setFocus,
		formState: { errors },
	} = useForm<FavoriteFormValues>({
		defaultValues: { url: favorite?.url ?? "", title: favorite?.title ?? "" },
	});
	const isEditMode = !!favorite;
	const isPending = addMutation.isPending || updateMutation.isPending;
	const urlError = errors.url?.message;

	const saveCallbacks = {
		onSuccess: () => {
			toast({
				title: t(isEditMode ? "favorite.editSuccess" : "favorite.addSuccess"),
			});
			onOpenChange(false);
		},
		onError: (error: Error) => {
			if (isFavoriteDuplicateError(error)) {
				setError("url", { message: t("favorite.form.duplicate") });
				setFocus("url");
				return;
			}

			toast({ title: t("favorite.saveFailed") });
		},
	};

	const handleFormSubmit = handleSubmit(({ url, title }) => {
		const normalizedUrl = normalizeFavoriteUrl(url);

		if (!normalizedUrl) {
			setError("url", { message: t("favorite.form.invalidUrl") });
			setFocus("url");
			return;
		}

		if (!favorite) {
			addMutation.mutate({ url: normalizedUrl, title }, saveCallbacks);
			return;
		}

		const isUrlUnchanged = normalizeFavoriteUrl(favorite.url) === normalizedUrl;

		if (isUrlUnchanged && favorite.title === title.trim()) {
			onOpenChange(false);
			return;
		}

		updateMutation.mutate(
			{
				id: favorite.id,
				url: isUrlUnchanged ? favorite.url : normalizedUrl,
				title,
				previousUrl: favorite.url,
			},
			saveCallbacks,
		);
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-[480px]"
				aria-describedby={undefined}
				onClose={() => onOpenChange(false)}
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					setFocus(isEditMode ? "title" : "url");
				}}
			>
				<DialogHeader>
					<DialogTitle>
						{t(
							isEditMode ? "favorite.form.editTitle" : "favorite.form.addTitle",
						)}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleFormSubmit} className="grid gap-4" noValidate>
					<div className="grid gap-2">
						<Label htmlFor="favorite-url">{t("favorite.form.urlLabel")}</Label>
						<Input
							id="favorite-url"
							placeholder="https://example.com/article"
							aria-invalid={!!urlError}
							aria-describedby={urlError ? URL_ERROR_ID : undefined}
							{...register("url")}
						/>
						{urlError && (
							<p id={URL_ERROR_ID} className="text-sm text-destructive">
								{urlError}
							</p>
						)}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="favorite-title">
							{t("favorite.form.titleLabel")}
						</Label>
						<Input
							id="favorite-title"
							placeholder={t("favorite.form.titlePlaceholder")}
							{...register("title")}
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							{t("favorite.form.cancel")}
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending && <Loading className="mr-2" />}
							{t(isEditMode ? "favorite.form.save" : "favorite.form.add")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
