import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
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

			ExtensionBridge.requestRefetchTheMemosFromExtension();
		} catch (error) {
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
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
					style={{ pointerEvents: "none" }}
				>
					<path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
				</svg>
			)}
			{state === "loading" && (
				<svg
					className="h-5 w-5 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					style={{ pointerEvents: "none" }}
				>
					<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						strokeWidth="4"
					/>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
			)}
			{state === "success" && (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5 text-green-500"
					viewBox="0 0 20 20"
					fill="currentColor"
					style={{ pointerEvents: "none" }}
				>
					<path
						fillRule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clipRule="evenodd"
					/>
				</svg>
			)}
			{state === "error" && (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5 text-red-500"
					viewBox="0 0 20 20"
					fill="currentColor"
					style={{ pointerEvents: "none" }}
				>
					<path
						fillRule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clipRule="evenodd"
					/>
				</svg>
			)}
		</button>
	);
}
