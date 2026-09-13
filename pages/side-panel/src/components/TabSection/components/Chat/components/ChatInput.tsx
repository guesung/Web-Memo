import { I18n } from "@web-memo/shared/utils/extension";
import { Button, Input } from "@web-memo/ui";
import { SendHorizontal } from "lucide-react";
import { useRef, useState } from "react";

/** 전송 확인 후에만 입력을 비우는 채팅 입력 속성입니다. */
interface IFChatInputProps {
	onSend: (message: string) => Promise<boolean>;
	disabled?: boolean;
}

/** AI 실패에서도 질문 입력을 유지하는 채팅 입력창입니다. */
const ChatInput = ({ onSend, disabled }: IFChatInputProps) => {
	const [input, setInput] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || disabled) {
			return;
		}

		const sentInput = input.trim();
		const isSent = await onSend(sentInput);
		if (isSent) {
			setInput((currentInput) =>
				currentInput.trim() === sentInput ? "" : currentInput,
			);
		}
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
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
				aria-label={I18n.get("chat_input_placeholder")}
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
};

export default ChatInput;
