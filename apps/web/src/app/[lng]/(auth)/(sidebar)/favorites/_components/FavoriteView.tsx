"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import {
	useFavoriteDeleteMutation,
	useFavoritesQuery,
} from "@web-memo/shared/hooks";
import type { TFavoriteRow } from "@web-memo/shared/utils";
import { Button, toast } from "@web-memo/ui";
import { Plus } from "lucide-react";
import { Component, type ReactNode, useState } from "react";
import { FavoriteEmptyState } from "./FavoriteEmptyState";
import { FavoriteFormDialog } from "./FavoriteFormDialog";
import { FavoriteItem } from "./FavoriteItem";
import { FavoriteLoadError } from "./FavoriteLoadError";

interface FavoriteViewProps {
	lng: Language;
}

/** 서버에 저장된 즐겨찾기 목록. 첫 조회가 실패하면 목록 대신 오류 박스를 보여준다. */
export function FavoriteView({ lng }: FavoriteViewProps) {
	return (
		<QueryErrorResetBoundary>
			{({ reset }) => (
				<FavoriteErrorBoundary
					onReset={reset}
					renderFallback={(retry) => (
						<FavoriteLoadError lng={lng} onRetry={retry} centered />
					)}
				>
					<FavoriteList lng={lng} />
				</FavoriteErrorBoundary>
			)}
		</QueryErrorResetBoundary>
	);
}

/** 목록 헤더와 행을 그리고 추가 다이얼로그를 연다. 삭제 결과는 Toast로 알린다. */
function FavoriteList({ lng }: FavoriteViewProps) {
	const { t } = useTranslation(lng);
	const {
		data: favorites,
		isRefetchError,
		isFetching,
		refetch,
	} = useFavoritesQuery();
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const deleteMutation = useFavoriteDeleteMutation();

	function handleDelete({ id }: TFavoriteRow) {
		deleteMutation
			.mutateAsync(id)
			.then(() => toast({ title: t("favorite.deleteSuccess") }))
			.catch(() => toast({ title: t("favorite.deleteFailed") }));
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-lg font-semibold">{t("favorite.title")}</h1>
					<p className="text-xs text-muted-foreground">
						{t("favorite.subtitle", { count: favorites.length })}
					</p>
				</div>
				<Button
					type="button"
					size="sm"
					onClick={() => setIsAddDialogOpen(true)}
				>
					<Plus size={16} className="mr-1" aria-hidden="true" />
					{t("favorite.add")}
				</Button>
			</div>

			{isRefetchError && (
				<FavoriteLoadError
					lng={lng}
					isPending={isFetching}
					onRetry={() => {
						if (!isFetching) void refetch({ cancelRefetch: false });
					}}
				/>
			)}

			{favorites.length === 0 ? (
				<FavoriteEmptyState lng={lng} onAdd={() => setIsAddDialogOpen(true)} />
			) : (
				<ul className="divide-y divide-border rounded-xl border border-border bg-card">
					{favorites.map((favorite) => (
						<FavoriteItem
							key={favorite.id}
							lng={lng}
							favorite={favorite}
							onDelete={handleDelete}
						/>
					))}
				</ul>
			)}

			{isAddDialogOpen && (
				<FavoriteFormDialog
					lng={lng}
					open={isAddDialogOpen}
					onOpenChange={setIsAddDialogOpen}
				/>
			)}
		</div>
	);
}

interface FavoriteErrorBoundaryProps {
	children: ReactNode;
	onReset: () => void;
	renderFallback: (retry: () => void) => ReactNode;
}

/** Suspense 쿼리의 첫 조회 실패를 받아 다시 시도할 수 있는 화면으로 바꾼다. */
class FavoriteErrorBoundary extends Component<
	FavoriteErrorBoundaryProps,
	{ hasError: boolean }
> {
	state = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	retry = () => {
		this.props.onReset();
		this.setState({ hasError: false });
	};

	render() {
		return this.state.hasError
			? this.props.renderFallback(this.retry)
			: this.props.children;
	}
}
