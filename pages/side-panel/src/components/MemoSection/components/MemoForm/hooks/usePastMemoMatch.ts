import { useQuery } from "@tanstack/react-query";
import { CONFIG } from "@web-memo/env";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery, useTabQuery } from "@web-memo/shared/hooks";
import { STORAGE_KEYS } from "@web-memo/shared/modules/chrome-storage";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type {
	IFPastMemoDuplicate,
	IFPastMemoRelated,
	IFPastMemoResponse,
	MemoSupabaseClient,
} from "@web-memo/shared/types";
import { normalizeUrl } from "@web-memo/shared/utils/url";
import { useEffect, useState } from "react";

/** 무시 목록에 남겨 두는 최근 URL 개수 */
const DISMISSED_URL_LIMIT = 500;
/** 판정 요청 전체(세션·본문 발췌·API)에 주는 시간. 서버 최악 지연(약 5초)보다 조금 길다. */
const PAST_MEMO_TIMEOUT_MS = 6000;
/** 서버로 보내는 본문 발췌 길이 상한 */
const PAGE_EXCERPT_MAX_LENGTH = 1000;

/**
 * 현재 탭 페이지와 같은 글이거나 관련 있는 과거 메모를 찾는다.
 * @description 로그인 상태(MemoForm이 withAuthentication 안에 있다)에서 현재 URL에 메모가 없고
 * 무시 목록에 없을 때만 URL당 한 번 요청한다. 어떤 실패든 빈 결과로 취급한다.
 * 결과가 도착한 뒤 메모가 생겨도 이미 받은 결과는 그대로 보여 준다. 결과 도착 전에 메모가 생겼으면 관련 메모는 버린다.
 * 현재 사용처: PastMemoNotice.tsx
 */
export const usePastMemoMatch = (
	props: IFUsePastMemoMatchProps,
): IFPastMemoMatchResult => {
	const { data: tab } = useTabQuery();
	const { data: supabaseClient } = useSupabaseClientQuery();
	const [dismissedUrls, setDismissedUrls] = useState<string[] | null>(null);
	const [relatedAcceptedUrl, setRelatedAcceptedUrl] = useState<string | null>(
		null,
	);

	const normalizedUrl = getNormalizedUrl(tab?.url);
	const isDismissedUrl =
		!!normalizedUrl && !!dismissedUrls?.includes(normalizedUrl);

	useEffect(() => {
		const loadDismissedUrls = async () => {
			setDismissedUrls(await readDismissedUrls());
		};

		void loadDismissedUrls();
	}, []);

	const pastMemoQuery = useQuery({
		queryKey: QUERY_KEY.pastMemo(normalizedUrl ?? ""),
		queryFn: () =>
			fetchPastMemo({
				supabaseClient,
				pageUrl: tab?.url ?? "",
				pageTitle: tab?.title ?? "",
			}),
		// 무시 목록을 읽기 전에는 무시한 URL인지 모르므로 요청하지 않는다.
		enabled:
			!!normalizedUrl &&
			dismissedUrls !== null &&
			!isDismissedUrl &&
			!props.hasMemoData,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});

	const relatedMemosFromServer = pastMemoQuery.data?.related ?? [];
	const hasRelatedMemosFromServer = relatedMemosFromServer.length > 0;

	// 관련 메모는 메모가 없을 때 받은 결과만 보여 준다. 한 번 보여 준 뒤에는 메모가 생겨도 닫지 않는다.
	useEffect(() => {
		if (!normalizedUrl || props.hasMemoData || !hasRelatedMemosFromServer) {
			return;
		}

		setRelatedAcceptedUrl(normalizedUrl);
	}, [normalizedUrl, props.hasMemoData, hasRelatedMemosFromServer]);

	const dismissCurrentUrl = async () => {
		if (!normalizedUrl) {
			return;
		}

		setDismissedUrls((previousUrls) =>
			addDismissedUrl(previousUrls ?? [], normalizedUrl),
		);
		await persistDismissedUrl(normalizedUrl);
	};

	if (!normalizedUrl || isDismissedUrl) {
		return {
			normalizedUrl,
			duplicate: null,
			relatedMemos: [],
			dismissCurrentUrl,
		};
	}

	const isRelatedAccepted = relatedAcceptedUrl === normalizedUrl;

	return {
		normalizedUrl,
		duplicate: pastMemoQuery.data?.duplicate ?? null,
		relatedMemos: isRelatedAccepted ? relatedMemosFromServer : [],
		dismissCurrentUrl,
	};
};

/**
 * 무시 목록 맨 앞에 URL을 넣고 최근 500개만 남긴다.
 * @description 이미 있던 URL은 맨 앞으로 옮긴다. 원본 배열은 바꾸지 않는다.
 */
export const addDismissedUrl = (dismissedUrls: string[], url: string) => {
	const otherUrls = dismissedUrls.filter(
		(dismissedUrl) => dismissedUrl !== url,
	);

	return [url, ...otherUrls].slice(0, DISMISSED_URL_LIMIT);
};

const EMPTY_PAST_MEMO: IFPastMemoResponse = { duplicate: null, related: [] };

const getNormalizedUrl = (url?: string) => {
	// about:blank·chrome:// 같은 웹 페이지가 아닌 탭에서는 유료 판정을 부르지 않는다.
	if (!url || !/^https?:\/\//.test(url)) {
		return null;
	}

	try {
		return normalizeUrl(url);
	} catch {
		return null;
	}
};

const readDismissedUrls = async () => {
	try {
		const stored = await chrome.storage.local.get(
			STORAGE_KEYS.pastMemoDismissedUrls,
		);
		const storedUrls: unknown = stored[STORAGE_KEYS.pastMemoDismissedUrls];

		if (!Array.isArray(storedUrls)) {
			return [];
		}

		return storedUrls.filter((url): url is string => typeof url === "string");
	} catch {
		return [];
	}
};

/** 다른 창의 사이드 패널이 그새 추가한 URL을 덮어쓰지 않도록 저장소 값을 다시 읽어 합친다. */
const persistDismissedUrl = async (url: string) => {
	try {
		const storedUrls = await readDismissedUrls();

		await chrome.storage.local.set({
			[STORAGE_KEYS.pastMemoDismissedUrls]: addDismissedUrl(storedUrls, url),
		});
	} catch {
		// 저장에 실패해도 이번 화면에서는 이미 닫았다. 다음에 다시 뜰 뿐이라 알리지 않는다.
	}
};

/** 6초 안에 끝나지 않으면 요청을 끊고 빈 결과를 돌려준다. */
const fetchPastMemo = async (params: IFFetchPastMemoParams) => {
	const abortController = new AbortController();
	const timeoutId = setTimeout(
		() => abortController.abort(),
		PAST_MEMO_TIMEOUT_MS,
	);
	const timeoutPromise = new Promise<IFPastMemoResponse>((resolve) => {
		abortController.signal.addEventListener("abort", () =>
			resolve(EMPTY_PAST_MEMO),
		);
	});

	try {
		return await Promise.race([
			requestPastMemo({ ...params, signal: abortController.signal }),
			timeoutPromise,
		]);
	} catch {
		return EMPTY_PAST_MEMO;
	} finally {
		clearTimeout(timeoutId);
	}
};

const requestPastMemo = async (
	params: IFFetchPastMemoParams & { signal: AbortSignal },
): Promise<IFPastMemoResponse> => {
	const { data } = await params.supabaseClient.auth.getSession();
	const accessToken = data.session?.access_token;

	if (!accessToken || !params.pageUrl) {
		return EMPTY_PAST_MEMO;
	}

	const response = await fetch(`${CONFIG.webUrl}/api/past-memo`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			pageUrl: params.pageUrl,
			pageTitle: params.pageTitle,
			pageExcerpt: await readPageExcerpt(),
		}),
		signal: params.signal,
	});

	if (!response.ok) {
		return EMPTY_PAST_MEMO;
	}

	const body: unknown = await response.json();

	if (!isPastMemoResponse(body)) {
		return EMPTY_PAST_MEMO;
	}

	return body;
};

/** 본문을 못 읽는 페이지(chrome:// 등)에서도 제목·URL만으로 판정하도록 빈 문자열로 넘어간다. */
const readPageExcerpt = async () => {
	try {
		const { content } = await bridge.request.PAGE_CONTENT();

		return (content ?? "").slice(0, PAGE_EXCERPT_MAX_LENGTH);
	} catch {
		return "";
	}
};

const isPastMemoResponse = (body: unknown): body is IFPastMemoResponse => {
	if (typeof body !== "object" || body === null) {
		return false;
	}

	return (
		"duplicate" in body && "related" in body && Array.isArray(body.related)
	);
};

/** usePastMemoMatch 인자 */
interface IFUsePastMemoMatchProps {
	/** 현재 URL에 저장된 메모가 있는지(memoData?.created_at). 있으면 요청하지 않는다 */
	hasMemoData: boolean;
}

/** usePastMemoMatch 반환값 */
export interface IFPastMemoMatchResult {
	/** 판정 기준 URL. 파싱할 수 없는 URL이면 null */
	normalizedUrl: string | null;
	/** 같은 글로 판정된 기존 메모 */
	duplicate: IFPastMemoDuplicate | null;
	/** 화면에 보여 줄 관련 메모(최대 3개) */
	relatedMemos: IFPastMemoRelated[];
	/** 현재 URL을 무시 목록에 넣는다 */
	dismissCurrentUrl: () => Promise<void>;
}

/** 판정 요청에 필요한 현재 페이지 정보 */
interface IFFetchPastMemoParams {
	supabaseClient: MemoSupabaseClient;
	pageUrl: string;
	pageTitle: string;
}
