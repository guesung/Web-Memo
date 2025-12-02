import { I18n } from "@web-memo/shared/utils/extension";
import { cn } from "@web-memo/ui";
import { CheckIcon, LightbulbIcon, Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";

export function CategorySuggestion({
	isLoading,
	suggestion,
	onAccept,
	onDismiss,
}: CategorySuggestionProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	// Handle keyboard events
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (!suggestion) return;

			if (event.key === "Escape") {
				onDismiss();
			} else if (event.key === "Enter" && event.target === containerRef.current) {
				onAccept();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [suggestion, onAccept, onDismiss]);

	// Loading state - subtle indicator
	if (isLoading) {
		return (
			<output className="flex items-center gap-1 text-muted-foreground">
				<Loader2Icon className="h-3 w-3 animate-spin" aria-hidden="true" />
				<span className="text-xs">{I18n.get("category_suggesting")}</span>
			</output>
		);
	}

	// No suggestion
	if (!suggestion) {
		return null;
	}

	const isNewCategory = !suggestion.isExisting;
	const labelText = isNewCategory
		? I18n.get("category_suggestion_new")
		: I18n.get("category_suggestion_existing");

	return (
		<div
			ref={containerRef}
			role="alert"
			aria-live="polite"
			aria-label={`${labelText}: ${suggestion.categoryName}`}
			className={cn(
				"flex items-center gap-2 rounded-md border bg-background/95 px-2 py-1 shadow-sm",
				"animate-in fade-in slide-in-from-bottom-1 duration-200",
			)}
		>
			<LightbulbIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />

			<div className="flex items-center gap-1 text-xs min-w-0">
				<span className="text-muted-foreground flex-shrink-0">
					{isNewCategory ? I18n.get("category_suggestion_new") : I18n.get("category_suggestion_existing")}
				</span>
				<span className="font-medium truncate max-w-[120px]" title={suggestion.categoryName}>
					{suggestion.categoryName}
				</span>
			</div>

			<div className="flex items-center gap-0.5 flex-shrink-0">
				<button
					type="button"
					onClick={onAccept}
					className={cn(
						"rounded p-0.5 transition-colors",
						"hover:bg-green-100 hover:text-green-700",
						"focus:outline-none focus:ring-1 focus:ring-green-500",
					)}
					aria-label={I18n.get("category_suggestion_accept")}
					title={I18n.get("category_suggestion_accept")}
				>
					<CheckIcon className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onClick={onDismiss}
					className={cn(
						"rounded p-0.5 transition-colors",
						"hover:bg-red-100 hover:text-red-700",
						"focus:outline-none focus:ring-1 focus:ring-red-500",
					)}
					aria-label={I18n.get("category_suggestion_dismiss")}
					title={I18n.get("category_suggestion_dismiss")}
				>
					<XIcon className="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	);
}

interface CategorySuggestionData {
	categoryName: string;
	isExisting: boolean;
	existingCategoryId: number | null;
	confidence: number;
}

interface CategorySuggestionProps {
	isLoading: boolean;
	suggestion: CategorySuggestionData | null;
	onAccept: () => void;
	onDismiss: () => void;
}
