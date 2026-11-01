import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemoPatchMutation } from "@web-memo/shared/hooks";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { parsePlanDateKey, type TPlanDateKey } from "@web-memo/shared/utils";
import { ToastAction, toast } from "@web-memo/ui";

/**
 * 메모의 읽을 계획 날짜를 바꾸고 되돌리기 토스트를 띄운다.
 * @description 실패하면 뮤테이션이 낙관적 갱신을 되돌리므로 성공 토스트는 요청과 함께 띄우는 기존 토글 핸들러와 같은 방식이다.
 * 날짜 키가 `null`이면 계획에서 뺀다.
 */
export default function usePlanDateChange({
	memo,
	lng,
}: IFUsePlanDateChangeProps) {
	const { t } = useTranslation(lng);
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();

	return (plannedDate: TPlanDateKey | null) => {
		const previousPlannedDate = memo.plannedDate;

		mutateMemoPatch({ id: memo.id, request: { plannedDate } });

		const toastTitle = plannedDate
			? t("toastTitle.memoPlanAdded", {
					date: new Intl.DateTimeFormat(lng, {
						month: "long",
						day: "numeric",
					}).format(parsePlanDateKey(plannedDate)),
				})
			: t("toastTitle.memoPlanRemoved");

		toast({
			title: toastTitle,
			action: (
				<ToastAction
					altText={t("toastActionMessage.undo")}
					onClick={() => {
						mutateMemoPatch({
							id: memo.id,
							request: { plannedDate: previousPlannedDate },
						});
					}}
				>
					{t("toastActionMessage.undo")}
				</ToastAction>
			),
		});
	};
}

interface IFUsePlanDateChangeProps extends LanguageType {
	memo: GetMemoResponse;
}
