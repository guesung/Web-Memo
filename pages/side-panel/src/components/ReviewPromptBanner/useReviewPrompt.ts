import { EXTERNAL_LINK } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { MemoService } from "@web-memo/shared/utils";
import { Tab } from "@web-memo/shared/utils/extension";
import { useCallback, useRef, useState } from "react";
import { reportSidePanelError } from "../../utils";

/** 리뷰 요청을 보여 줄 수 있는 최소 메모 수. */
export const REVIEW_PROMPT_MIN_MEMO_COUNT = 5;
/** 같은 사용자에게 리뷰 요청을 보여 주는 최대 횟수. */
export const REVIEW_PROMPT_MAX_SHOWN_COUNT = 2;
/** 리뷰 요청 사이의 최소 간격(14일). */
export const REVIEW_PROMPT_MIN_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

/** chrome.storage.sync `reviewPrompt`에 저장되는 값. */
interface IFReviewPromptState {
	shownCount: number;
	/** 마지막으로 보여 준 시각(epoch ms). 아직 보여 준 적 없으면 null */
	lastShownAt: number | null;
	dismissedForever: boolean;
}

const INITIAL_REVIEW_PROMPT_STATE: IFReviewPromptState = {
	shownCount: 0,
	lastShownAt: null,
	dismissedForever: false,
};

interface IFUseReviewPromptParams {
	/** 로그인한 사용자 id. 없으면 노출 조건을 확인하지 않는다 */
	userId: string | undefined;
	/** AI 탭이 열려 있으면 노출하지 않는다 */
	isAiTabOpen: boolean;
}

/**
 * 리뷰 요청 배너의 노출 조건과 행동을 관리한다.
 * @description 메모가 서버에 저장될 때마다 `notifySaved`를 부르면, 조건을 만족하는 경우에만 배너를 보여 준다.
 * 표시 여부는 패널 세션 상태이고, 노출 횟수·시각·다시 보지 않기는 sync 저장소에 남는다.
 */
export default function useReviewPrompt({
	userId,
	isAiTabOpen,
}: IFUseReviewPromptParams) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const [isVisible, setIsVisible] = useState(false);
	const isVisibleRef = useRef(false);
	const isCheckingRef = useRef(false);
	// 이번 노출을 포함한 노출 횟수. 이벤트 속성으로만 쓰므로 저장소를 다시 읽지 않는다.
	const shownCountRef = useRef(0);
	// notifySaved를 저장 콜백에 넘기므로 값이 바뀌어도 함수 정체성은 유지한다.
	const isAiTabOpenRef = useRef(isAiTabOpen);
	isAiTabOpenRef.current = isAiTabOpen;
	const userIdRef = useRef(userId);
	userIdRef.current = userId;
	const supabaseClientRef = useRef(supabaseClient);
	supabaseClientRef.current = supabaseClient;

	const hideBanner = () => {
		isVisibleRef.current = false;
		setIsVisible(false);
	};

	const notifySaved = useCallback(async () => {
		if (isVisibleRef.current || isCheckingRef.current) {
			return;
		}
		if (isFirefox() || isAiTabOpenRef.current) {
			return;
		}
		const currentUserId = userIdRef.current;
		if (!currentUserId) {
			return;
		}

		isCheckingRef.current = true;
		try {
			const state = await readReviewPromptState();
			if (!canShowByState(state, Date.now())) {
				return;
			}

			const memoCount = await new MemoService(
				supabaseClientRef.current,
			).getMyMemoCount(currentUserId);
			if (memoCount < REVIEW_PROMPT_MIN_MEMO_COUNT) {
				return;
			}

			// 노출 횟수를 먼저 남긴다. 기록하지 못하면 횟수 제한을 지킬 수 없으니 보여 주지 않는다.
			const shownCount = state.shownCount + 1;
			await ChromeSyncStorage.set(STORAGE_KEYS.reviewPrompt, {
				...state,
				shownCount,
				lastShownAt: Date.now(),
			} satisfies IFReviewPromptState);
			shownCountRef.current = shownCount;
			isVisibleRef.current = true;
			setIsVisible(true);
			analytics.trackEvent({
				name: "review_prompt_view",
				params: { shown_count: shownCount },
			});
		} catch (error) {
			reportSidePanelError({
				error,
				feature: "review_prompt",
				operation: "check",
				stage: "eligibility",
				level: "warning",
			});
		} finally {
			isCheckingRef.current = false;
		}
	}, []);

	/** 이 패널에서만 배너를 닫는다. 저장소는 건드리지 않는다. */
	const handleClose = () => {
		hideBanner();
		analytics.trackEvent({
			name: "review_prompt_close",
			params: { shown_count: shownCountRef.current },
		});
	};

	const handleNeverShow = async () => {
		hideBanner();
		analytics.trackEvent({
			name: "review_prompt_never",
			params: { shown_count: shownCountRef.current },
		});
		await dismissForever("never_show");
	};

	const handleOpenReview = async () => {
		hideBanner();
		analytics.trackEvent({
			name: "review_prompt_open",
			params: { shown_count: shownCountRef.current },
		});
		void Tab.create({ url: EXTERNAL_LINK.chromeWebStoreReviews });
		await dismissForever("open_review");
	};

	return {
		isVisible,
		notifySaved,
		handleClose,
		handleNeverShow,
		handleOpenReview,
	};
}

/** 화면에서는 이미 닫혔으므로, 저장에 실패해도 보고만 하고 넘어간다. */
const dismissForever = async (operation: "never_show" | "open_review") => {
	try {
		const state = await readReviewPromptState();
		await ChromeSyncStorage.set(STORAGE_KEYS.reviewPrompt, {
			...state,
			dismissedForever: true,
		} satisfies IFReviewPromptState);
	} catch (error) {
		reportSidePanelError({
			error,
			feature: "review_prompt",
			operation,
			stage: "storage",
			level: "warning",
		});
	}
};

const readReviewPromptState = async (): Promise<IFReviewPromptState> => {
	const stored = await ChromeSyncStorage.get<IFReviewPromptState | undefined>(
		STORAGE_KEYS.reviewPrompt,
	);

	return { ...INITIAL_REVIEW_PROMPT_STATE, ...stored };
};

/** 저장소 값만으로 판단할 수 있는 노출 조건. 메모 수 조회보다 값싸니 먼저 본다. */
const canShowByState = (state: IFReviewPromptState, now: number) => {
	if (state.dismissedForever) {
		return false;
	}
	if (state.shownCount >= REVIEW_PROMPT_MAX_SHOWN_COUNT) {
		return false;
	}
	if (
		state.lastShownAt !== null &&
		now - state.lastShownAt < REVIEW_PROMPT_MIN_INTERVAL_MS
	) {
		return false;
	}

	return true;
};

/** Firefox에는 웹스토어 리뷰 페이지가 없다. */
const isFirefox = () =>
	chrome.runtime.getURL("").startsWith("moz-extension://");
