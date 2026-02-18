import AsyncStorage from "@react-native-async-storage/async-storage";

const MEMOS_KEY = "webmemo:memos";

export interface LocalMemo {
  id: string;
  url: string;
  title: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

async function getAll(): Promise<LocalMemo[]> {
  const raw = await AsyncStorage.getItem(MEMOS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as LocalMemo[];
}

async function save(memos: LocalMemo[]) {
  await AsyncStorage.setItem(MEMOS_KEY, JSON.stringify(memos));
}

export async function getAllMemos(): Promise<LocalMemo[]> {
  const memos = await getAll();
  return memos.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getMemoByUrl(url: string): Promise<LocalMemo | null> {
  const memos = await getAll();
  return memos.find((m) => m.url === url) ?? null;
}

export async function upsertMemo(params: {
  url: string;
  title: string;
  memo: string;
}): Promise<LocalMemo> {
  const memos = await getAll();
  const now = new Date().toISOString();
  const existing = memos.find((m) => m.url === params.url);

  if (existing) {
    existing.title = params.title;
    existing.memo = params.memo;
    existing.updatedAt = now;
    existing.synced = false;
    await save(memos);
    return existing;
  }

  const newMemo: LocalMemo = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url: params.url,
    title: params.title,
    memo: params.memo,
    createdAt: now,
    updatedAt: now,
    synced: false,
  };
  memos.push(newMemo);
  await save(memos);
  return newMemo;
}

export async function deleteMemo(id: string): Promise<void> {
  const memos = await getAll();
  await save(memos.filter((m) => m.id !== id));
}

export async function getUnsyncedMemos(): Promise<LocalMemo[]> {
  const memos = await getAll();
  return memos.filter((m) => !m.synced);
}

export async function markAsSynced(ids: string[]): Promise<void> {
  const memos = await getAll();
  for (const memo of memos) {
    if (ids.includes(memo.id)) {
      memo.synced = true;
    }
  }
  await save(memos);
}
