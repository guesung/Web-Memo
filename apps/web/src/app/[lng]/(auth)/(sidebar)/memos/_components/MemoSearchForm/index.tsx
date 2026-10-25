"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { analytics } from "@web-memo/shared/modules/analytics";
import { cn } from "@web-memo/shared/utils";
import {
	Button,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web-memo/ui";
import { FileText, Search, StickyNote, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { isTypingTarget } from "../../_utils";
import type { SearchFormValues } from "../MemoSearchFormProvider";

/** 이 시간 동안 입력이 없으면 검색을 한 번 기록한다. */
const SEARCH_TRACK_DEBOUNCE_MS = 800;

interface MemoSearchFormProps extends LanguageType {}

export default function MemoSearchForm({ lng }: MemoSearchFormProps) {
	const { t } = useTranslation(lng);
	const {
		control,
		reset,
		watch,
		formState: { isDirty },
	} = useFormContext<SearchFormValues>();
	const searchQuery = watch("searchQuery");
	const { searchInputRef, isSearchFocused, setIsSearchFocused } =
		useSearchShortcut();

	/**
	 * 입력이 멈추면 검색을 한 번 기록한다.
	 * @description 검색어는 매 키 입력마다 갱신되므로 그대로 찍으면 글자 수만큼 쌓인다.
	 * 검색어 원문은 개인정보라 싣지 않고 길이만 남긴다.
	 */
	useEffect(() => {
		if (!searchQuery) return;

		const timer = setTimeout(() => {
			analytics.trackEvent({
				name: "memo_search",
				params: { query_length: searchQuery.length },
			});
		}, SEARCH_TRACK_DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	const handleSearchTargetChange = (
		searchTarget: string,
		onChange: (value: string) => void,
	) => {
		onChange(searchTarget);
		analytics.trackEvent({
			name: "memo_filter",
			params: { search_target: searchTarget },
		});
	};

	return (
		<form
			className="w-full max-w-4xl mx-auto"
			onSubmit={(e) => e.preventDefault()}
		>
			<div className="flex items-center gap-3">
				<Controller
					name="searchTarget"
					control={control}
					render={({ field }) => (
						<Select
							onValueChange={(searchTarget) =>
								handleSearchTargetChange(searchTarget, field.onChange)
							}
							value={field.value}
						>
							<SelectTrigger
								className={cn(
									"w-auto min-w-[130px] h-12",
									"rounded-xl",
									"border-2 border-border",
									"bg-card",
									"hover:border-primary/50",
									"transition-colors",
								)}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									<span className="flex items-center gap-2">
										<Search className="h-4 w-4" />
										{t("memos.searchTarget.all")}
									</span>
								</SelectItem>
								<SelectItem value="title">
									<span className="flex items-center gap-2">
										<FileText className="h-4 w-4" />
										{t("memos.searchTarget.title")}
									</span>
								</SelectItem>
								<SelectItem value="memo">
									<span className="flex items-center gap-2">
										<StickyNote className="h-4 w-4" />
										{t("memos.searchTarget.memo")}
									</span>
								</SelectItem>
							</SelectContent>
						</Select>
					)}
				/>

				<Controller
					name="searchQuery"
					control={control}
					render={({ field }) => (
						<div className="relative flex-1">
							<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
							<Input
								type="text"
								placeholder={t("memos.searchPlaceholder")}
								className={cn(
									"w-full h-12 pl-12 pr-12",
									"text-base",
									"rounded-xl",
									"border-2 border-border",
									"bg-card",
									"shadow-sm",
									"focus:border-primary",
									"focus:ring-4 focus:ring-primary/20",
									"transition-all",
								)}
								aria-keyshortcuts="/ Meta+K Control+K"
								{...field}
								ref={(element) => {
									field.ref(element);
									searchInputRef.current = element;
								}}
								onFocus={() => setIsSearchFocused(true)}
								onBlur={() => {
									field.onBlur();
									setIsSearchFocused(false);
								}}
								onKeyDown={(event) => {
									if (event.key === "Escape") event.currentTarget.blur();
								}}
							/>
							{!isDirty && (
								<kbd
									aria-hidden
									className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-b-2 border-border bg-muted px-1.5 font-sans text-xs text-muted-foreground sm:inline-block"
								>
									{isSearchFocused ? "Esc" : "/"}
								</kbd>
							)}
							{isDirty && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 p-0 rounded-full hover:bg-muted"
									onClick={() => reset()}
									aria-label="Clear search"
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>
					)}
				/>
			</div>
		</form>
	);
}

/**
 * 어디서든 / 나 ⌘K(Ctrl+K)로 검색창에 바로 간다.
 * @description /는 글을 쓰는 중이면 그 글자로 두고, ⌘K는 입력 중에도 동작한다. 다이얼로그가 떠 있으면
 * 뒤의 검색창으로 포커스를 빼앗지 않는다. 한글 자판에서도 같도록 key 대신 code로 판정한다.
 */
function useSearchShortcut() {
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const [isSearchFocused, setIsSearchFocused] = useState(false);

	useEffect(function focusSearchOnShortcut() {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.isComposing) return;
			if (document.querySelector('[role="dialog"], [role="alertdialog"]'))
				return;

			const isSlash =
				event.code === "Slash" &&
				!event.altKey &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.shiftKey &&
				!isTypingTarget(event.target);
			const isCommandK =
				event.code === "KeyK" &&
				(event.metaKey || event.ctrlKey) &&
				!event.altKey &&
				!event.shiftKey;
			if (!isSlash && !isCommandK) return;

			event.preventDefault();
			searchInputRef.current?.focus();
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	return { searchInputRef, isSearchFocused, setIsSearchFocused };
}
