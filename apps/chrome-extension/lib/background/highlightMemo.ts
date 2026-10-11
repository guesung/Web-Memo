import { CONFIG } from "@web-memo/env";
import { PATHS } from "@web-memo/shared/constants";
import type {
	CreateHighlightMemoPayload,
	CreateHighlightMemoResponse,
	GetHighlightMemoLinksResponse,
} from "@web-memo/shared/modules/extension-bridge";
import { HighlightMemoService, HighlightService } from "@web-memo/shared/utils";
import {
	getSupabaseClient,
	SupabaseSessionRequiredError,
} from "@web-memo/shared/utils/extension";
import { getValidatedHighlightUrl } from "./getValidatedHighlightUrl";
import { reportBackgroundError } from "./reportBackgroundError";

function reportFailure(operation: string) {
	reportBackgroundError({
		error: new Error("highlight_memo_failed"),
		feature: "highlight",
		operation,
		stage: "handler",
	});
}

/** 발신 페이지에 속한 본인 하이라이트에만 실제 메모를 만든다. */
export async function handleCreateHighlightMemo(
	payload: CreateHighlightMemoPayload,
	sender: chrome.runtime.MessageSender,
): Promise<CreateHighlightMemoResponse> {
	if (
		!payload ||
		!Number.isSafeInteger(payload.highlightId) ||
		payload.highlightId <= 0 ||
		typeof payload.memo !== "string" ||
		!payload.memo.trim()
	)
		return { success: false, reason: "invalid_request" };
	const url = sender.tab?.url;
	if (!url || !getValidatedHighlightUrl(sender, url))
		return { success: false, reason: "invalid_request" };
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client.auth.getUser();
		if (error || !data.user)
			return { success: false, reason: "unauthenticated" };
		const { data: row, error: loadError } = await new HighlightService(
			client,
		).getHighlightById({ id: payload.highlightId, userId: data.user.id });
		if (loadError) throw loadError;
		if (!row || !getValidatedHighlightUrl(sender, row.url))
			return { success: false, reason: "invalid_request" };
		const result = await new HighlightMemoService(client).create(
			payload.highlightId,
			payload.memo,
		);
		await bridgeRefresh();
		await openSavedMemo(result.memo_id, result.deleted_at);
		return {
			success: true,
			memoId: result.memo_id,
			created: result.created,
			deletedAt: result.deleted_at,
		};
	} catch (error) {
		if (error instanceof SupabaseSessionRequiredError)
			return { success: false, reason: "unauthenticated" };
		reportFailure("create-linked-memo");
		return { success: false, reason: "save_failed" };
	}
}

/** 조회 실패를 연결 없음과 구별한다. 발신 페이지 밖 ID는 반환하지 않는다. */
export async function handleGetHighlightMemoLinks(
	payload: { highlightIds: number[] },
	sender: chrome.runtime.MessageSender,
): Promise<GetHighlightMemoLinksResponse> {
	const url = sender.tab?.url;
	if (
		!payload ||
		!Array.isArray(payload.highlightIds) ||
		payload.highlightIds.length > 100 ||
		payload.highlightIds.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
		!url ||
		!getValidatedHighlightUrl(sender, url)
	)
		return { success: false, reason: "load_failed" };
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client.auth.getUser();
		if (error || !data.user)
			return { success: false, reason: "unauthenticated" };
		const result = await new HighlightService(client).getHighlightsByUrl(url);
		if (result.error) throw result.error;
		const allowed = new Set(
			(result.data ?? [])
				.filter((row) => row.user_id === data.user.id)
				.map((row) => row.id),
		);
		const links = await new HighlightMemoService(client).getByHighlightIds(
			payload.highlightIds.filter((id) => allowed.has(id)),
		);
		return { success: true, links };
	} catch (error) {
		if (error instanceof SupabaseSessionRequiredError)
			return { success: false, reason: "unauthenticated" };
		reportFailure("load-linked-memo");
		return { success: false, reason: "load_failed" };
	}
}

async function bridgeRefresh() {
	// 알림 실패가 이미 커밋된 메모 저장을 실패로 바꾸지 않게 한다.
	try {
		await chrome.runtime.sendMessage({
			type: "REFETCH_THE_MEMO_LIST_FROM_EXTENSION",
		});
	} catch {
		/* 수신 화면이 닫혀 있을 수 있다. */
	}
}

async function openSavedMemo(memoId: number, deletedAt: string | null) {
	const url = new URL(
		deletedAt ? PATHS.memosTrash : PATHS.memos,
		CONFIG.webUrl,
	);
	url.searchParams.set("id", String(memoId));
	try {
		await chrome.tabs.create({ url: url.href });
	} catch {
		reportFailure("open-linked-memo");
	}
}
