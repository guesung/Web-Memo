import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPageKey } from "@web-memo/shared/utils/url";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { IOS_APP_GROUP } from "./appGroup";

const PENDING_SHARED_URLS_KEY = "webmemo:pendingSharedUrls";
const SHARED_EXTENSION_PENDING_URLS_KEY = "webmemo:sharedExtensionPendingUrls";

/** 대상 메모 선택 전까지 유지할 공유 요청. */
export interface IFPendingSharedUrl {
	url: string;
	title: string;
	favIconUrl: string | null;
	createdAt: string;
}

/** 본 앱이 보류한 공유 요청을 읽는다. */
export async function getPendingSharedUrls(): Promise<IFPendingSharedUrl[]> {
	const stored = await AsyncStorage.getItem(PENDING_SHARED_URLS_KEY);
	return stored ? (JSON.parse(stored) as IFPendingSharedUrl[]) : [];
}

/** 공유 요청을 본 앱의 보류 목록에 보존한다. 같은 URL의 기존 항목은 덮어쓴다. */
export async function preserveSharedUrl(
	pending: IFPendingSharedUrl,
): Promise<void> {
	const stored = await getPendingSharedUrls();
	await AsyncStorage.setItem(
		PENDING_SHARED_URLS_KEY,
		JSON.stringify([
			...stored.filter((item) => item.url !== pending.url),
			pending,
		]),
	);
}

/** 사용자가 위시 대상 메모를 지정한 공유 요청을 보류 목록에서 제거한다. */
export async function resolvePendingSharedUrl(url: string): Promise<void> {
	const stored = await getPendingSharedUrls();
	await AsyncStorage.setItem(
		PENDING_SHARED_URLS_KEY,
		JSON.stringify(
			stored.filter((item) => getPageKey(item.url) !== getPageKey(url)),
		),
	);
}

/**
 * iOS 공유 확장이 App Group 키체인에 보관한 공유 요청을 읽는다.
 * @description 확장은 본 앱의 AsyncStorage에 접근할 수 없어, 본 앱과 공유하는
 * App Group 키체인 접근 그룹(TDL2)에 별도 키로 같은 형태의 목록을 보관한다.
 */
export async function getSharedExtensionPendingUrls(): Promise<
	IFPendingSharedUrl[]
> {
	if (Platform.OS !== "ios") {
		return [];
	}
	const stored = await SecureStore.getItemAsync(
		SHARED_EXTENSION_PENDING_URLS_KEY,
		{ accessGroup: IOS_APP_GROUP },
	);
	return stored ? (JSON.parse(stored) as IFPendingSharedUrl[]) : [];
}

/** iOS 공유 확장에서 공유 요청을 App Group 키체인에 보존한다. */
export async function addSharedExtensionPendingUrl(
	pending: IFPendingSharedUrl,
): Promise<void> {
	if (Platform.OS !== "ios") {
		return;
	}
	const stored = await getSharedExtensionPendingUrls();
	const next = [...stored.filter((item) => item.url !== pending.url), pending];
	await SecureStore.setItemAsync(
		SHARED_EXTENSION_PENDING_URLS_KEY,
		JSON.stringify(next),
		{ accessGroup: IOS_APP_GROUP },
	);
}

/** App Group 키체인에 보관된 공유 확장의 보류 목록을 비운다. */
async function clearSharedExtensionPendingUrls(): Promise<void> {
	if (Platform.OS !== "ios") {
		return;
	}
	await SecureStore.deleteItemAsync(SHARED_EXTENSION_PENDING_URLS_KEY, {
		accessGroup: IOS_APP_GROUP,
	});
}

/**
 * iOS 공유 확장이 App Group에 보관한 공유 요청을 본 앱의 보류 목록으로 옮긴다.
 * @description 본 앱 실행·포그라운드 복귀 시 호출한다. 옮긴 뒤에는 App Group 쪽을 비워
 * 다음 실행에서 같은 요청을 중복으로 옮기지 않게 한다.
 */
export async function migrateSharedExtensionPendingUrls(): Promise<void> {
	const extensionPending = await getSharedExtensionPendingUrls();
	if (extensionPending.length === 0) {
		return;
	}
	for (const pending of extensionPending) {
		await preserveSharedUrl(pending);
	}
	await clearSharedExtensionPendingUrls();
}
