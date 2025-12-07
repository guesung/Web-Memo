import { useEffect, useRef } from "react";
import { adjustTextareaHeight } from "../../utils";

interface UseTextareaAutoResizeOptions {
	enabled?: boolean;
}

export default function useTextareaAutoResize(
	options: UseTextareaAutoResizeOptions = {},
) {
	const { enabled = true } = options;
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(
		function adjustHeightOnMount() {
			if (!enabled || !textareaRef.current) return;
			adjustTextareaHeight(textareaRef.current);
		},
		[enabled],
	);

	const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (enabled) {
			adjustTextareaHeight(event.target);
		}
	};

	return {
		textareaRef,
		handleTextareaChange,
	};
}
