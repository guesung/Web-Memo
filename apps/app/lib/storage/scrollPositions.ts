import AsyncStorage from "@react-native-async-storage/async-storage";

const SCROLL_POSITIONS_KEY = "webmemo:scroll-positions";
const MAX_ENTRIES = 100;

/** URL별 읽기 스크롤 위치 */
export interface IFScrollPosition {
	scrollY: number;
	/** 0~1 사이의 읽기 진행률 */
	progress: number;
	updatedAt: string;
}

/** URL을 키로 갖는 스크롤 위치 맵 */
export type TScrollPositionMap = Record<string, IFScrollPosition>;

/** 저장된 전체 스크롤 위치 맵을 반환한다 */
export async function getScrollPositions(): Promise<TScrollPositionMap> {
	try {
		const value = await AsyncStorage.getItem(SCROLL_POSITIONS_KEY);

		return value ? JSON.parse(value) : {};
	} catch {
		return {};
	}
}

/** 특정 URL의 저장된 스크롤 위치를 반환한다 */
export async function getScrollPosition(
	url: string,
): Promise<IFScrollPosition | null> {
	const positions = await getScrollPositions();

	return positions[url] ?? null;
}

/** URL의 스크롤 위치를 저장한다. 최근 항목 MAX_ENTRIES개만 유지한다 */
export async function saveScrollPosition(params: {
	url: string;
	scrollY: number;
	progress: number;
}): Promise<void> {
	try {
		const positions = await getScrollPositions();
		positions[params.url] = {
			scrollY: params.scrollY,
			progress: params.progress,
			updatedAt: new Date().toISOString(),
		};

		const entries = Object.entries(positions)
			.sort((a, b) => (a[1].updatedAt < b[1].updatedAt ? 1 : -1))
			.slice(0, MAX_ENTRIES);

		await AsyncStorage.setItem(
			SCROLL_POSITIONS_KEY,
			JSON.stringify(Object.fromEntries(entries)),
		);
	} catch {}
}
