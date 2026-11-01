import AsyncStorage from "@react-native-async-storage/async-storage";
import { serialMemoWrite } from "../serialMemoWrites";
import { deleteMemoPermanently } from "./localMemo";

const PENDING_MEMO_SYNCS_KEY = "webmemo:pendingMemoSyncs";

/** 원본 삭제를 마지막 쓰기로 두어 정리 실패 때 입력 원본이 남도록 한다. */
export function resolvePendingMemoSource(localId: string): Promise<void> {
	return serialMemoWrite(PENDING_MEMO_SYNCS_KEY, async () => {
		const raw = await AsyncStorage.getItem(PENDING_MEMO_SYNCS_KEY);
		const pending: { localId: string }[] = raw ? JSON.parse(raw) : [];
		await AsyncStorage.setItem(
			PENDING_MEMO_SYNCS_KEY,
			JSON.stringify(pending.filter((item) => item.localId !== localId)),
		);
		await deleteMemoPermanently(localId);
	});
}
