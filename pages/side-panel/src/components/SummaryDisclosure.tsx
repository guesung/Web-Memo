import { I18n } from "@web-memo/shared/utils/extension";
import { ChevronDown, Sparkles } from "lucide-react";
import { useRef } from "react";

interface SummaryDisclosureProps {
	isOpen: boolean;
	onToggle: () => void;
}

export const SUMMARY_PANEL_ID = "side-panel-summary";

export default function SummaryDisclosure({
	isOpen,
	onToggle,
}: SummaryDisclosureProps) {
	const buttonRef = useRef<HTMLButtonElement>(null);
	return (
		<div className="mt-3 shrink-0">
			<button
				ref={buttonRef}
				type="button"
				aria-expanded={isOpen}
				aria-controls={SUMMARY_PANEL_ID}
				onClick={() => {
					if (
						isOpen &&
						document.activeElement?.closest(`#${SUMMARY_PANEL_ID}`)
					) {
						buttonRef.current?.focus();
					}
					onToggle();
				}}
				className="flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
			>
				<Sparkles aria-hidden="true" className="size-4 shrink-0" />
				<span className="flex-1">
					{I18n.get(isOpen ? "summary_hide_label" : "summary_show_label")}
				</span>
				<ChevronDown
					aria-hidden="true"
					className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>
		</div>
	);
}
