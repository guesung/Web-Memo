import AsyncStorage from "@react-native-async-storage/async-storage";

const FAB_POSITION_KEY = "webmemo:fab-position";
const PANEL_RATIO_KEY = "webmemo:memo-panel-ratio";

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
