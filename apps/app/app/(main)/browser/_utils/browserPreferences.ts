import AsyncStorage from "@react-native-async-storage/async-storage";

const FAB_POSITION_KEY = "webmemo:fab-position";
const PANEL_RATIO_KEY = "webmemo:memo-panel-ratio";
const UNLOCKED_DOMAINS_KEY = "webmemo:unlocked-domains";

interface FabPosition {
	x: number;
	y: number;
}

export async function getFabPosition(): Promise<FabPosition | null> {
	try {
		const value = await AsyncStorage.getItem(FAB_POSITION_KEY);
		return value ? JSON.parse(value) : null;
	} catch {
		return null;
	}
}

export async function saveFabPosition(position: FabPosition): Promise<void> {
	try {
		await AsyncStorage.setItem(FAB_POSITION_KEY, JSON.stringify(position));
	} catch {}
}

export async function getPanelRatio(): Promise<number | null> {
	try {
		const value = await AsyncStorage.getItem(PANEL_RATIO_KEY);
		return value ? Number(value) : null;
	} catch {
		return null;
	}
}

export async function savePanelRatio(ratio: number): Promise<void> {
	try {
		await AsyncStorage.setItem(PANEL_RATIO_KEY, String(ratio));
	} catch {}
}

/**
 * 드래그 잠금을 해제해 둔 도메인 목록을 읽는다.
 * @description 키는 hostname이다. 같은 사이트의 다른 글로 가도 같은 키여야
 * 글마다 다시 누르는 일이 없다.
 */
export async function getUnlockedDomains(): Promise<string[]> {
	try {
		const value = await AsyncStorage.getItem(UNLOCKED_DOMAINS_KEY);
		if (!value) {
			return [];
		}

		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/** 도메인을 드래그 잠금 해제 목록에 추가한다 */
export async function addUnlockedDomain(domain: string): Promise<void> {
	try {
		const domains = await getUnlockedDomains();
		if (domains.includes(domain)) {
			return;
		}

		await AsyncStorage.setItem(
			UNLOCKED_DOMAINS_KEY,
			JSON.stringify([...domains, domain]),
		);
	} catch {}
}

/** 도메인을 드래그 잠금 해제 목록에서 제거한다 */
export async function removeUnlockedDomain(domain: string): Promise<void> {
	try {
		const domains = await getUnlockedDomains();
		await AsyncStorage.setItem(
			UNLOCKED_DOMAINS_KEY,
			JSON.stringify(domains.filter((item) => item !== domain)),
		);
	} catch {}
}
