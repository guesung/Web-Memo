import { I18n } from "@web-memo/shared/utils/extension";

/** 안내를 놓을 위치. 저장 직전 선택의 아래(top) 또는 위(bottom)에 붙인다. */
interface IFHighlightEditHintProps {
	x: number;
	placement: { top: number } | { bottom: number };
}

/** 첫 저장 직후 칠한 문장을 눌러 고치거나 지울 수 있음을 한 번 알려준다. 초점을 가져가지 않는다. */
export const HighlightEditHint = (props: IFHighlightEditHintProps) => (
	<output
		className="fixed z-[2147483647] max-w-60 rounded-lg border bg-background px-3 py-2 text-sm text-foreground shadow-lg animate-fade-in motion-reduce:animate-none"
		style={{ left: props.x, ...props.placement }}
	>
		{I18n.get("highlight_edit_hint_message")}
	</output>
);
