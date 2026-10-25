import type { StorageKeyType } from "../../modules/chrome-storage";
import { I18n } from "../../utils/extension";

export default class ChromeSyncStorage {
	static async get<T>(key: StorageKeyType): Promise<T> {
		try {
			const storage = await chrome.storage.sync.get(key);
			return storage[key];
		} catch (error) {
			const message = I18n.get("error_get_storage");
			throw new Error(
				`${message}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	static set(key: StorageKeyType, value: unknown) {
		return chrome.storage.sync.set({ [key]: value });
	}

	static remove(key: StorageKeyType) {
		return chrome.storage.sync.remove(key);
	}

	/**
	 * 한 키의 sync 값이 바뀔 때마다 새 값을 알린다.
	 * @description 다른 탭·옵션 페이지에서 바꾼 값도 들어온다. 키가 지워지면 undefined가 온다.
	 * @returns 구독을 해제하는 함수
	 */
	static subscribe<T>(
		key: StorageKeyType,
		onValueChange: (value: T | undefined) => void,
	) {
		const handleStorageChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			areaName: string,
		) => {
			if (areaName !== "sync" || !(key in changes)) {
				return;
			}
			onValueChange(changes[key].newValue as T | undefined);
		};
		chrome.storage.onChanged.addListener(handleStorageChange);

		return () => chrome.storage.onChanged.removeListener(handleStorageChange);
	}
}
