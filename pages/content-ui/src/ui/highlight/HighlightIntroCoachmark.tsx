import { I18n } from "@web-memo/shared/utils/extension";
import { Button } from "@web-memo/ui";

/** 첫 선택 말풍선의 위치와 확인 핸들러. */
interface IFHighlightIntroCoachmarkProps {
	placement: "below" | "above";
	onIntroConfirmClick: () => void;
}

/** 버블을 처음 본 사용자에게 하이라이트가 무엇이고 어떻게 끄는지 알려준다. */
export const HighlightIntroCoachmark = (
	props: IFHighlightIntroCoachmarkProps,
) => {
	const placementClassName =
		props.placement === "below" ? "top-full mt-2" : "bottom-full mb-2";

	return (
		<div
			role="note"
			className={`absolute left-0 flex w-64 flex-col gap-2 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-lg animate-fade-in ${placementClassName}`}
		>
			<p>{I18n.get("highlight_intro_message")}</p>
			<Button
				type="button"
				variant="secondary"
				size="sm"
				className="self-end"
				onClick={props.onIntroConfirmClick}
			>
				{I18n.get("highlight_intro_confirm")}
			</Button>
		</div>
	);
};
