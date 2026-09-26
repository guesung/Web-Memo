import type { MemoRow, MemoTable } from "@web-memo/shared/types";
import { isNetworkError } from "@web-memo/shared/utils";

/**
 * chrome.storage.local에 대기열을 저장하는 키.
 * @description 대기 항목이 생기고 없어지는 것을 storage.onChanged로 지켜보려는 화면(저장 표시줄,
 * 온라인 전환 시 flush 트리거)이 이 키를 걸러 듣는다.
 */
export const OFFLINE_MEMO_QUEUE_STORAGE_KEY = "offlineMemoQueue";

/** 대기 항목이 들고 있는 탭 정보 */
export interface IFOfflineMemoQueueTabInfo {
	title: string;
	favIconUrl?: string;
	url: string;
}

/** 대기 항목이 들고 있는 메모 본문 */
export interface IFOfflineMemoQueueData {
	title: string;
	memo: string;
	impression: string;
	actionItem: string;
	tabInfo: IFOfflineMemoQueueTabInfo;
}

/** 오프라인 대기열에 쌓인 메모 저장 요청 하나 */
export interface IFOfflineMemoQueueItem {
	/** 저장을 요청한 사용자. flush 시 로그인 사용자와 다르면 건너뛴다 */
	userId: string;
	/** 기존 메모 수정이면 그 메모 id, 새 메모면 없음 */
	memoId?: number;
	url: string;
	/** memoId가 있을 때만 쓰는, 대기열에 넣을 당시 서버의 updated_at */
	baseUpdatedAt?: string | null;
	data: IFOfflineMemoQueueData;
	queuedAt: number;
}

/** flush 도중 다른 메모로 새로 저장된(충돌) 항목 */
export interface IFOfflineMemoConflict {
	oldMemoId?: number;
	newMemoId: number;
	url: string;
}

/** flush 전체 결과 */
export interface IFOfflineMemoFlushResult {
	conflicts: IFOfflineMemoConflict[];
	/** 이번 flush로 서버에 반영해 대기열에서 지운 항목 수(충돌 포함) */
	syncedCount: number;
	/** 네트워크 오류를 만나 중단했는지. 대기열은 그대로 남는다 */
	hasNetworkError: boolean;
	/** 네트워크 오류가 아닌 실패 항목이 있었는지. 그 항목은 대기열에 남는다 */
	hasOtherError: boolean;
}

/**
 * flush에 필요한 MemoService 메서드만 뽑은 타입.
 * @description MemoService 인스턴스는 이보다 많은 필드(count 등)를 돌려주지만 초과 필드는
 * 문제되지 않는다. 테스트에서는 이 모양의 값만 돌려주는 목으로 대체한다.
 */
export interface TOfflineMemoQueueService {
	getMemoById: (id: number) => Promise<{
		data:
			| Pick<
					MemoRow,
					"id" | "updated_at" | "title" | "memo" | "impression" | "actionItem"
			  >[]
			| null;
		error: unknown;
	}>;
	insertMemo: (
		request: MemoTable["Insert"],
	) => Promise<{ data: Pick<MemoRow, "id">[] | null; error: unknown }>;
	updateMemo: (params: {
		id: MemoRow["id"];
		request: MemoTable["Update"];
	}) => Promise<{ data: unknown; error: unknown }>;
}

/** memoId가 있으면 memoId로, 없으면 url로 대기 항목을 구분한다. 항목당 최신 스냅샷 하나만 남긴다 */
const getQueueItemKey = (
	item: Pick<IFOfflineMemoQueueItem, "memoId" | "url">,
) => (item.memoId !== undefined ? `id:${item.memoId}` : `url:${item.url}`);

/** 대기열에 쌓인 항목을 모두 읽는다. 저장소를 읽지 못하면 빈 배열을 돌려준다 */
export const getPendingOfflineMemos = async (): Promise<
	IFOfflineMemoQueueItem[]
> => {
	try {
		const stored = await chrome.storage.local.get(
			OFFLINE_MEMO_QUEUE_STORAGE_KEY,
		);
		const storedItems: unknown = stored[OFFLINE_MEMO_QUEUE_STORAGE_KEY];

		if (!Array.isArray(storedItems)) {
			return [];
		}

		return storedItems;
	} catch {
		return [];
	}
};

/**
 * 대기열에 항목을 넣는다.
 * @description 같은 메모(memoId 또는 url)의 이전 스냅샷은 지우고 최신 스냅샷 하나만 남긴다.
 */
export const enqueueOfflineMemo = async (item: IFOfflineMemoQueueItem) => {
	const items = await getPendingOfflineMemos();
	const key = getQueueItemKey(item);
	const nextItems = [
		...items.filter((existing) => getQueueItemKey(existing) !== key),
		item,
	];

	await chrome.storage.local.set({
		[OFFLINE_MEMO_QUEUE_STORAGE_KEY]: nextItems,
	});
};

/** 대기열에서 항목 하나를 지운다 */
export const removeOfflineMemo = async (
	item: Pick<IFOfflineMemoQueueItem, "memoId" | "url">,
) => {
	const items = await getPendingOfflineMemos();
	const key = getQueueItemKey(item);
	const nextItems = items.filter(
		(existing) => getQueueItemKey(existing) !== key,
	);

	await chrome.storage.local.set({
		[OFFLINE_MEMO_QUEUE_STORAGE_KEY]: nextItems,
	});
};

/** 대기열에 이 메모(memoId 또는 url)에 대한 항목이 있는지 확인한다 */
export const hasPendingOfflineMemo = async (
	target: Pick<IFOfflineMemoQueueItem, "memoId" | "url">,
) => {
	const items = await getPendingOfflineMemos();
	const key = getQueueItemKey(target);

	return items.some((item) => getQueueItemKey(item) === key);
};

/** 대기 항목의 본문을 upsert 요청 모양으로 바꾼다. 제목이 비어 있으면 탭 제목으로 되돌린다 */
const buildMemoRequest = (data: IFOfflineMemoQueueData) => ({
	...data.tabInfo,
	title: data.title.trim() || data.tabInfo.title,
	memo: data.memo,
	impression: data.impression,
	actionItem: data.actionItem,
});

/** 대기 항목 하나를 서버에 반영한 결과 */
type TFlushItemOutcome =
	| { type: "success" }
	| { type: "conflict"; newMemoId: number }
	| { type: "networkError" }
	| { type: "otherError" };

/**
 * 서버 행의 텍스트 필드가 대기 항목이 쓰려던 내용과 완전히 같은지 본다.
 * @description flush 도중 재마운트되면 같은 항목이 다시 flush될 수 있다. 첫 시도가 이미 서버에
 * 반영된 뒤(대기열에서 지우기 전) 두 번째 시도가 돌면, updated_at은 달라졌어도 내용은 이미
 * 우리가 쓰려던 것과 같다 — 이때는 충돌이 아니라 중복 실행이므로 다시 쓰지 않는다.
 */
const matchesQueuedContent = (
	existingMemo: Pick<MemoRow, "title" | "memo" | "impression" | "actionItem">,
	queuedRequest: ReturnType<typeof buildMemoRequest>,
) =>
	existingMemo.title === queuedRequest.title &&
	existingMemo.memo === queuedRequest.memo &&
	existingMemo.impression === queuedRequest.impression &&
	existingMemo.actionItem === queuedRequest.actionItem;

/**
 * 대기 항목 하나를 서버에 반영한다.
 * @description memoId가 없으면 항상 insert한다. memoId가 있으면 서버 updated_at을 다시 읽어
 * baseUpdatedAt과 같을 때만 update한다. 다르더라도 서버 내용이 이미 우리가 쓰려던 것과 같으면
 * (중복 flush로 먼저 반영된 경우) 다시 쓰지 않고 성공으로 처리한다. 그 외(진짜 다른 곳에서
 * 바뀌었거나 메모가 삭제됨)에는 같은 url로 insert해 새 메모를 만들고 충돌로 알린다.
 */
const flushOfflineMemoItem = async ({
	item,
	memoService,
}: {
	item: IFOfflineMemoQueueItem;
	memoService: TOfflineMemoQueueService;
}): Promise<TFlushItemOutcome> => {
	try {
		const queuedRequest = buildMemoRequest(item.data);

		if (item.memoId === undefined) {
			const insertResult = await memoService.insertMemo({
				...queuedRequest,
				url: item.url,
			});
			if (insertResult.error) {
				throw insertResult.error;
			}

			return { type: "success" };
		}

		const existingResult = await memoService.getMemoById(item.memoId);
		if (existingResult.error) {
			throw existingResult.error;
		}

		const existingMemo = existingResult.data?.[0];
		const isUnchanged =
			!!existingMemo && existingMemo.updated_at === item.baseUpdatedAt;

		if (isUnchanged) {
			const updateResult = await memoService.updateMemo({
				id: item.memoId,
				request: queuedRequest,
			});
			if (updateResult.error) {
				throw updateResult.error;
			}

			return { type: "success" };
		}

		if (existingMemo && matchesQueuedContent(existingMemo, queuedRequest)) {
			return { type: "success" };
		}

		const insertResult = await memoService.insertMemo({
			...queuedRequest,
			url: item.url,
		});
		if (insertResult.error) {
			throw insertResult.error;
		}

		const newMemo = insertResult.data?.[0];
		if (!newMemo) {
			throw new Error("새 메모를 만들지 못했습니다.");
		}

		return { type: "conflict", newMemoId: newMemo.id };
	} catch (error) {
		if (isNetworkError(error)) {
			return { type: "networkError" };
		}

		return { type: "otherError" };
	}
};

/**
 * 같은 userId의 대기 항목을 순서대로 서버에 반영한다.
 * @description 다른 사용자의 항목은 건드리지 않고 남긴다. 네트워크 오류를 만나면 그 자리에서
 * 멈추고 남은 항목은 대기열에 그대로 둔다. 그 외 오류인 항목만 대기열에 남기고 다음 항목으로
 * 넘어간다. 성공하거나 충돌(새 메모로 저장)한 항목은 대기열에서 지운다. 동시에 한 번만 불러야 한다.
 */
export const flushOfflineMemoQueue = async ({
	userId,
	memoService,
}: {
	userId: string;
	memoService: TOfflineMemoQueueService;
}): Promise<IFOfflineMemoFlushResult> => {
	const items = await getPendingOfflineMemos();
	const ownItems = items.filter((item) => item.userId === userId);
	const result: IFOfflineMemoFlushResult = {
		conflicts: [],
		syncedCount: 0,
		hasNetworkError: false,
		hasOtherError: false,
	};

	for (const item of ownItems) {
		const outcome = await flushOfflineMemoItem({ item, memoService });

		if (outcome.type === "networkError") {
			result.hasNetworkError = true;
			break;
		}

		if (outcome.type === "otherError") {
			result.hasOtherError = true;
			continue;
		}

		if (outcome.type === "conflict") {
			result.conflicts.push({
				oldMemoId: item.memoId,
				newMemoId: outcome.newMemoId,
				url: item.url,
			});
		}

		await removeOfflineMemo(item);
		result.syncedCount += 1;
	}

	return result;
};
