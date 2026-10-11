"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { TFavoriteRow } from "@web-memo/shared/utils";
import { Button } from "@web-memo/ui";
import { Globe, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { FavoriteDeleteDialog } from "./FavoriteDeleteDialog";
import { FavoriteTitleInput } from "./FavoriteTitleInput";

interface FavoriteItemProps {
	lng: Language;
	favorite: TFavoriteRow;
	onTitleChange: (id: TFavoriteRow["id"], title: string) => void;
	onDelete: (favorite: TFavoriteRow) => void;
}

/** `www.`를 뗀 도메인. URL로 읽을 수 없으면 원문을 그대로 쓴다. */
function getDisplayDomain(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

/** 즐겨찾기 한 행. 원문 링크와 제목 수정·삭제 액션을 보여준다. */
export function FavoriteItem({
	lng,
	favorite,
	onTitleChange,
	onDelete,
}: FavoriteItemProps) {
	const { t } = useTranslation(lng);
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [failedFavIconUrl, setFailedFavIconUrl] = useState<string | null>(null);
	const { favIconUrl } = favorite;
	const isFavIconVisible = !!favIconUrl && failedFavIconUrl !== favIconUrl;
	const domain = getDisplayDomain(favorite.url);
	const displayTitle = favorite.title || domain;

	function handleTitleSubmit(value: string) {
		const nextTitle = value.trim();
		setIsEditing(false);

		if (nextTitle && nextTitle !== favorite.title) {
			onTitleChange(favorite.id, nextTitle);
		}
	}

	return (
		<li className="flex items-center gap-3 px-4 py-3">
			{isEditing ? (
				<FavoriteTitleInput
					title={favorite.title}
					ariaLabel={t("favorite.editTitle")}
					onSubmit={handleTitleSubmit}
					onCancel={() => setIsEditing(false)}
				/>
			) : (
				<>
					<a
						href={favorite.url}
						target="_blank"
						rel="noreferrer"
						className="group flex min-w-0 flex-1 items-center gap-3"
					>
						{isFavIconVisible ? (
							<img
								src={favIconUrl}
								alt=""
								className="size-4 shrink-0 rounded"
								onError={() => setFailedFavIconUrl(favIconUrl)}
							/>
						) : (
							<Globe
								className="size-4 shrink-0 text-muted-foreground"
								aria-hidden="true"
							/>
						)}
						<span className="flex min-w-0 flex-col">
							<span className="truncate text-sm font-medium group-hover:underline">
								{displayTitle}
							</span>
							<span className="truncate text-xs text-muted-foreground">
								{domain}
							</span>
						</span>
					</a>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={t("favorite.editTitle")}
						onClick={() => setIsEditing(true)}
					>
						<Pencil size={16} className="text-muted-foreground" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={t("favorite.delete")}
						onClick={() => setIsDeleteDialogOpen(true)}
					>
						<Trash2 size={16} className="text-muted-foreground" />
					</Button>
					<FavoriteDeleteDialog
						lng={lng}
						open={isDeleteDialogOpen}
						onOpenChange={setIsDeleteDialogOpen}
						title={displayTitle}
						onConfirm={() => onDelete(favorite)}
					/>
				</>
			)}
		</li>
	);
}
