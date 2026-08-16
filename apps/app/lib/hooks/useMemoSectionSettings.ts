import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	DEFAULT_MEMO_SECTION_SETTINGS,
	getMemoSectionSettings,
	type IFMemoSectionSettings,
	saveMemoSectionSettings,
} from "@/lib/storage/memoSectionSettings";

const MEMO_SECTION_SETTINGS_KEY = ["memo-section-settings"];

/**
 * 메모 작성 화면의 느낀 점·액션 아이템 입력란 노출 설정을 읽는 훅.
 * @description 설정을 저장하면 같은 키를 구독하는 모든 화면이 즉시 갱신된다.
 */
export function useMemoSectionSettings(): IFMemoSectionSettings {
	const { data } = useQuery({
		queryKey: MEMO_SECTION_SETTINGS_KEY,
		queryFn: getMemoSectionSettings,
		initialData: DEFAULT_MEMO_SECTION_SETTINGS,
	});

	return data;
}

/**
 * 메모 섹션 노출 설정을 저장하는 훅.
 */
export function useMemoSectionSettingsSave() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: saveMemoSectionSettings,
		onMutate: (settings: IFMemoSectionSettings) => {
			queryClient.setQueryData(MEMO_SECTION_SETTINGS_KEY, settings);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: MEMO_SECTION_SETTINGS_KEY });
		},
	});
}
