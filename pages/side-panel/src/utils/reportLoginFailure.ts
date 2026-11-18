import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { userQueryOptions } from "@web-memo/shared/hooks";
import type { MemoSupabaseClient } from "@web-memo/shared/types";
import {
	getWebSessionAccessToken,
	isSessionRestoreFailure,
} from "@web-memo/shared/utils/extension";
import { reportSidePanelError } from "./reportError";

/** `Error`가 아니어도 `message`를 가진 값에서 메시지를 꺼낸다. 없으면 `undefined`. */
const getMessage = (value: unknown): string | undefined => {
	if (typeof value === "object" && value !== null && "message" in value) {
		const { message } = value;

		return typeof message === "string" ? message : undefined;
	}

	return undefined;
};

/** 확장이 새 세션을 발급받을 수 있는 웹 세션(만료 전)이 있는지. 값은 토큰이라 유무만 본다. */
const hasValidWebSession = async (): Promise<boolean> => {
	try {
		return !!(await getWebSessionAccessToken());
	} catch {
		return false;
	}
};

/**
 * Supabase 클라이언트 쿼리의 실패가 세션 복원 실패면 보고한다.
 *
 * @description 실패 메시지가 로그아웃과 같은 "로그인을 먼저 해주세요"라 쿼리 공통 보고에서 걸러지므로,
 * 공통 필터보다 먼저 호출해야 한다. 제목에 실제 원인이 보이도록 원인(`cause`)을 보고한다.
 * 보고했으면 `true`를 돌려준다.
 */
export const reportSessionRestoreFailure = (error: unknown): boolean => {
	if (!isSessionRestoreFailure(error)) {
		return false;
	}

	return reportSidePanelError({
		error: (error as Error).cause,
		feature: "auth",
		operation: "restore_session",
		stage: "query",
		level: "warning",
		extra: { isOnline: navigator.onLine },
	});
};

/** 로그인 신호 뒤 패널의 사용자 확인 결과. 실패했으면 그 이유를 담는다. */
const getUserAfterSync = async (queryClient: QueryClient) => {
	const clientState = queryClient.getQueryState<MemoSupabaseClient>(
		QUERY_KEY.supabaseClient(),
	);

	if (!clientState?.data || clientState.status === "error") {
		return {
			hasUser: false,
			supabaseClientErrorMessage: getMessage(
				(clientState?.error as Error | null | undefined)?.cause,
			),
		};
	}

	try {
		// 로그아웃 상태에서 열린 패널은 사용자 쿼리가 아직 없어 refetch로 채워지지 않는다. 없으면 여기서 가져온다.
		const user = await queryClient.ensureQueryData(
			userQueryOptions(clientState.data),
		);

		return {
			hasUser: !!user?.data.user,
			userErrorMessage: getMessage(user?.error),
		};
	} catch (error) {
		return { hasUser: false, userErrorMessage: getMessage(error) };
	}
};

/**
 * 웹이 로그인됐다고 알렸는데 패널이 여전히 비로그인이면 보고한다.
 *
 * @description 로그인 신호를 받아 쿼리를 다시 가져온 뒤에 호출한다. 웹 세션 유무는 확장 세션 발급이
 * 어디서 막혔는지(웹 세션 없음·만료 vs 발급 실패) 가르는 원인 추적용 정보로만 싣는다.
 */
export const reportLoginSyncMismatch = async (
	queryClient: QueryClient,
): Promise<void> => {
	const result = await getUserAfterSync(queryClient);

	if (result.hasUser) {
		return;
	}

	const hasWebSession = await hasValidWebSession();

	reportSidePanelError({
		error: new Error("로그인 신호를 받았지만 패널에 사용자 정보가 없습니다"),
		feature: "auth",
		operation: "sync_login",
		stage: "refresh",
		level: "warning",
		extra: {
			hasWebSession,
			supabaseClientErrorMessage: result.supabaseClientErrorMessage,
			userErrorMessage: result.userErrorMessage,
			isOnline: navigator.onLine,
		},
	});
};

/**
 * 스켈레톤이 오래 보일 때 아직 끝나지 않은 쿼리를 함께 보고한다.
 *
 * @description 쿼리 키에는 페이지 URL이 들어가는 것(`memo` 등)이 있어, 열람 기록이 실리지 않도록 첫 요소(쿼리 이름)만 싣는다.
 */
export const reportSkeletonTimeout = (
	queryClient: QueryClient,
	elapsedMs: number,
): void => {
	const pendingQueries = queryClient
		.getQueryCache()
		.findAll({
			predicate: (query) =>
				query.state.status === "pending" || query.state.fetchStatus !== "idle",
		})
		.map((query) => ({
			name: String(query.queryKey[0]),
			status: query.state.status,
			fetchStatus: query.state.fetchStatus,
			failureCount: query.state.fetchFailureCount,
		}));

	reportSidePanelError({
		error: new Error("메모 화면 스켈레톤이 오래 표시됩니다"),
		feature: "side_panel",
		operation: "load",
		stage: "skeleton_timeout",
		level: "warning",
		extra: { elapsedMs, pendingQueries, isOnline: navigator.onLine },
	});
};
