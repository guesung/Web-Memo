export const getCursorPosition = (
	textarea: HTMLTextAreaElement,
	position: number,
) => {
	const div = document.createElement("div");
	div.style.cssText = window.getComputedStyle(textarea, null).cssText;
	div.style.height = "auto";
	div.style.position = "absolute";
	div.style.visibility = "hidden";
	div.style.whiteSpace = "pre-wrap";

	const textBeforeCursor = textarea.value.substring(0, position);
	div.textContent = textBeforeCursor;
	document.body.appendChild(div);

	const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
	const lines = textBeforeCursor.split("\n");
	const currentLineText = lines[lines.length - 1];

	const span = document.createElement("span");
	span.textContent = currentLineText;
	div.appendChild(span);

	const cursorLeft = span.offsetWidth;
	const cursorTop = (lines.length - 1) * lineHeight;

	document.body.removeChild(div);

	return {
		left: cursorLeft,
		top: cursorTop,
	};
};
