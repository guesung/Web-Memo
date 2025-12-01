import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { Bookmark, Check, Loader2, X } from "lucide-react";
import { useState } from "react";

interface SelectionMemoButtonProps {
	selectedText: string;
	position: { top: number; left: number };
}

export default function SelectionMemoButton({
	selectedText,
	position,
}: SelectionMemoButtonProps) {
	const [state, setState] = useState<
		"default" | "loading" | "success" | "error"
	>("default");

	const handleClick = async () => {
		if (state === "loading") return;

		setState("loading");

		try {
			const url = window.location.href;
			const title = document.title;
			const favIconUrl =
				(document.querySelector('link[rel~="icon"]') as HTMLLinkElement)
					?.href || "";

			await ExtensionBridge.requestCreateMemo({
				memo: selectedText,
				url,
				title,
				favIconUrl,
				isWish: false,
				category_id: null,
			});

			setState("success");

			setTimeout(() => {
				ExtensionBridge.requestRefetchTheMemosFromExtension();
			}, 1000);
		} catch (error) {
			console.log(1);
			console.error("Failed to create memo:", error);
			setState("error");
		}
	};

	return (
		<button
			type="button"
			onMouseDown={() => {
				handleClick();
			}}
			disabled={state === "loading"}
			className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-all hover:scale-110 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
			style={{
				position: "absolute",
				top: `${position.top}px`,
				left: `${position.left}px`,
				zIndex: 2147483647,
				pointerEvents: "auto",
				cursor: "pointer",
			}}
			aria-label="Save selected text as memo"
		>
			{state === "default" && (
				<Bookmark className="h-5 w-5" style={{ pointerEvents: "none" }} />
			)}
			{state === "loading" && (
				<Loader2
					className="h-5 w-5 animate-spin"
					style={{ pointerEvents: "none" }}
				/>
			)}
			{state === "success" && (
				<Check
					className="h-5 w-5 text-green-500"
					style={{ pointerEvents: "none" }}
				/>
			)}
			{state === "error" && (
				<X className="h-5 w-5 text-red-500" style={{ pointerEvents: "none" }} />
			)}
		</button>
	);
}
