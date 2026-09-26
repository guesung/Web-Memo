import { I18n } from "@web-memo/shared/utils/extension";
import { CheckIcon, LightbulbIcon, Loader2Icon, XIcon } from "lucide-react";
import {
	type FocusEvent,
	type KeyboardEvent,
	type MouseEvent,
	useRef,
} from "react";
import type { IFCategorySuggestion } from "../hooks/requestCategorySuggestion";

/** 메모 하단에 기존 카테고리 또는 새 카테고리 이름을 제안합니다. */
export const CategorySuggestion = (props: IFCategorySuggestionProps) => {
	const isHoveredRef = useRef(false);
	const hasFocusRef = useRef(false);
	const isNewCategory = !props.suggestion.isExisting;
	const labelText = isNewCategory
		? I18n.get("category_suggestion_new")
		: I18n.get("category_suggestion_existing");

	const handleSuggestionKeyDown = (event: KeyboardEvent<HTMLOutputElement>) => {
		if (event.key === "Escape" && !props.isAccepting) {
			event.stopPropagation();
			props.onDismiss();
		}
	};

	const handleSuggestionFocus = () => {
		hasFocusRef.current = true;
		props.onPauseDismiss();
	};

	const handleSuggestionBlur = (event: FocusEvent<HTMLOutputElement>) => {
		if (!event.currentTarget.contains(event.relatedTarget)) {
			hasFocusRef.current = false;
			if (!isHoveredRef.current) {
				props.onResumeDismiss();
			}
		}
	};

	const handleSuggestionMouseEnter = () => {
		isHoveredRef.current = true;
		props.onPauseDismiss();
	};

	const handleSuggestionMouseLeave = (event: MouseEvent<HTMLOutputElement>) => {
		isHoveredRef.current = false;
		if (
			!hasFocusRef.current &&
			!event.currentTarget.contains(document.activeElement)
		) {
			props.onResumeDismiss();
		}
	};

	return (
		<output
			aria-label={`${labelText} ${props.suggestion.categoryName}`}
			data-testid="category-suggestion"
			className="flex min-w-0 items-center gap-1 rounded-md border bg-background p-1 text-xs"
			onKeyDown={handleSuggestionKeyDown}
			onFocus={handleSuggestionFocus}
			onBlur={handleSuggestionBlur}
			onMouseEnter={handleSuggestionMouseEnter}
			onMouseLeave={handleSuggestionMouseLeave}
		>
			<LightbulbIcon
				className="size-3.5 shrink-0 text-muted-foreground"
				aria-hidden="true"
			/>
			<span className="shrink-0 text-muted-foreground">{labelText}</span>
			<span
				className="max-w-32 truncate font-medium"
				title={props.suggestion.categoryName}
			>
				{props.suggestion.categoryName}
			</span>
			<button
				type="button"
				data-testid="category-suggestion-accept"
				disabled={props.isAccepting}
				onClick={props.onAccept}
				aria-label={
					isNewCategory
						? I18n.get("category_suggestion_create")
						: I18n.get("category_suggestion_accept")
				}
				className="flex shrink-0 items-center gap-1 rounded p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
			>
				{props.isAccepting ? (
					<Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
				) : isNewCategory ? (
					I18n.get("category_suggestion_create")
				) : (
					<CheckIcon className="size-3.5" aria-hidden="true" />
				)}
			</button>
			<button
				type="button"
				disabled={props.isAccepting}
				onClick={props.onDismiss}
				aria-label={I18n.get("category_suggestion_dismiss")}
				className="shrink-0 rounded p-1 hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
			>
				<XIcon className="size-3.5" aria-hidden="true" />
			</button>
		</output>
	);
};

/** 카테고리 제안 칩의 입력입니다. */
interface IFCategorySuggestionProps {
	suggestion: IFCategorySuggestion;
	isAccepting: boolean;
	onAccept: () => void;
	onDismiss: () => void;
	onPauseDismiss: () => void;
	onResumeDismiss: () => void;
}
