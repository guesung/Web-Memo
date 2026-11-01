import AsyncStorage from "@react-native-async-storage/async-storage";
import { serialMemoWrite } from "../serialMemoWrites";
import type { LocalMemo } from "./localMemo";

const MEMOS_KEY = "webmemo:memos";

export async function readLocalMemos(): Promise<LocalMemo[]> {
	const raw = await AsyncStorage.getItem(MEMOS_KEY);
	return raw ? JSON.parse(raw) : [];
}

/** 전체 배열의 읽기·검증·변경·저장을 함께 직렬화한다. */
export function changeLocalMemos<T>(
	change: (memos: LocalMemo[]) => {
		memos: LocalMemo[];
		result: T;
	},
): Promise<T> {
	return serialMemoWrite(MEMOS_KEY, async () => {
		const { memos, result } = change(await readLocalMemos());
		await AsyncStorage.setItem(MEMOS_KEY, JSON.stringify(memos));
		return result;
	});
}
