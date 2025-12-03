import { I18n } from "@web-memo/shared/utils/extension";
import { Button, Input } from "@web-memo/ui";
import { SendHorizontal } from "lucide-react";
import { useRef, useState } from "react";

interface ChatInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
	const [input, setInput] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || disabled) return;

		onSend(input.trim());
		setInput("");
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				ref={inputRef}
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={I18n.get("chat_input_placeholder")}
				disabled={disabled}
				className="flex-1"
			/>
			<Button
				type="submit"
				size="icon"
				disabled={disabled || !input.trim()}
				aria-label={I18n.get("chat_send")}
			>
				<SendHorizontal className="h-4 w-4" />
			</Button>
		</form>
	);
}
