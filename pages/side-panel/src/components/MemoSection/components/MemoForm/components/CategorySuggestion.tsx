import type { TCategorySuggestionTrigger } from "@web-memo/shared/modules/analytics";
import { isMac } from "@web-memo/shared/utils";
import { I18n } from "@web-memo/shared/utils/extension";
import { CheckIcon, LightbulbIcon, Loader2Icon, XIcon } from "lucide-react";
import { type KeyboardEvent, useEffect } from "react";
import type { IFCategorySuggestion } from "../hooks/requestCategorySuggestion";
import { isAcceptShortcut } from "./isAcceptShortcut";

/** 메모 하단에 Jev가 선택한 기존 카테고리를 제안합니다. */
export const CategorySuggestion = (props: IFCategorySuggestionProps) => {
	const labelText = I18n.get("category_suggestion_existing");
	const isMacOS = isMac();
	const shortcutLabel = isMacOS ? "⌘↵" : "Ctrl↵";
	const acceptLabel = `${I18n.get("category_suggestion_accept")} (${isMacOS ? "⌘+Enter" : "Ctrl+Enter"})`;
	const { isAccepting, isShortcutDisabled, onAccept } = props;

	// 칩이 보이는 동안에는 메모·제목 입력에 포커스가 있어도 수락할 수 있어야 해서 window에서 받는다.
	useEffect(() => {
		if (isAccepting || isShortcutDisabled) return;

		const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
			if (!isAcceptShortcut(event, isMacOS)) return;
			event.preventDefault();
			onAccept("shortcut");
		};
		window.addEventListener("keydown", handleWindowKeyDown);
		return () => window.removeEventListener("keydown", handleWindowKeyDown);
	}, [isAccepting, isShortcutDisabled, isMacOS, onAccept]);

	const handleSuggestionKeyDown = (event: KeyboardEvent<HTMLOutputElement>) => {
		if (event.key === "Escape" && !props.isAccepting) {
			event.stopPropagation();
			props.onDismiss();
		}
	};

	return (
		<output
			aria-label={`${labelText} ${props.suggestion.categoryName}`}
			data-testid="category-suggestion"
			className="flex min-w-0 items-center gap-1 rounded-md border bg-background p-1 text-xs"
			onKeyDown={handleSuggestionKeyDown}
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
				onClick={() => props.onAccept("click")}
				aria-label={acceptLabel}
				title={acceptLabel}
				className="flex shrink-0 items-center gap-1 rounded p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
			>
				{props.isAccepting ? (
					<Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
				) : (
					<CheckIcon className="size-3.5" aria-hidden="true" />
				)}
				{/* 버튼 이름은 aria-label이 정하므로 kbd는 스크린 리더에 따로 읽히지 않는다. */}
				<kbd className="rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
					{shortcutLabel}
				</kbd>
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
	/** # 카테고리 팝업처럼 Enter를 다른 곳에서 쓰는 동안 단축키를 끈다. */
	isShortcutDisabled: boolean;
	onAccept: (trigger: TCategorySuggestionTrigger) => void;
	onDismiss: () => void;
}
