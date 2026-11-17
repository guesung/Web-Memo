import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useDidMount } from "@web-memo/shared/hooks";
import {
	bridge,
	type IFSyncLoginStatusPayload,
} from "@web-memo/shared/modules/extension-bridge";
import type { ErrorBoundary } from "@web-memo/ui";
import { type RefObject, useEffect } from "react";
import { reportLoginSyncMismatch } from "../utils/reportLoginFailure";

/** 패널 안에서 로그인을 마쳤을 때 `window`에 쏘는 이벤트 이름입니다. */
export const PANEL_LOGIN_EVENT = "web-memo:panel-login";

/**
 * 로그인 상태가 바뀌었을 수 있는 신호를 받아 사이드 패널을 갱신합니다.
 * @description 신호는 세 가지입니다. 웹에서 로그인 상태가 바뀌었다는 SYNC_LOGIN_STATUS,
 * 패널의 로그인 창에서 로그인을 마쳤다는 PANEL_LOGIN_EVENT(이때는 웹 화면이 열리지 않아
 * SYNC_LOGIN_STATUS를 보내 줄 곳이 없습니다), 네트워크가 돌아왔다는 `online` 이벤트입니다. 오프라인이면 사용자 확인이 실패해 로그인 화면이
 * 대신 그려지므로, 연결이 돌아오면 다시 확인해야 메모 화면으로 돌아갑니다.
 * 로그아웃 상태에서는 MemoForm이 던진 오류로 로그인 화면이 대신 그려지므로,
 * MemoForm 안쪽이 아니라 로그인 여부와 무관하게 항상 마운트되는 곳에서 호출해야 합니다.
 * 수신하면 Supabase 클라이언트와 사용자 쿼리, 오류로 끝난 쿼리를 다시 가져온 뒤 로그인 화면을 띄운
 * ErrorBoundary를 리셋합니다. 오류 상태가 아닌 ErrorBoundary의 리셋은 아무 일도 하지 않으므로, 이미 로그인된
 * 패널의 메모 입력 상태는 유지됩니다. 로그인됐다는 신호(SYNC_LOGIN_STATUS의 `isLoggedIn: true`, PANEL_LOGIN_EVENT)를
 * 받았는데 다시 가져온 뒤에도 사용자가 없으면 Sentry에 보고합니다. 구버전 웹은 payload 없이 보내므로 보고하지 않습니다.
 * 현재 사용처: MemoSection.tsx
 * @param loginBoundaryRef 로그인 화면을 폴백으로 쓰는 ErrorBoundary의 ref
 */
export default function useSyncLoginStatus(
	loginBoundaryRef: RefObject<ErrorBoundary | null>,
) {
	const queryClient = useQueryClient();

	/** @param isLoggedInExpected 신호가 알려 준 로그인 여부. 모르면 `undefined` */
	const refreshLoginStatus = async (isLoggedInExpected?: boolean) => {
		await queryClient.refetchQueries({
			queryKey: QUERY_KEY.supabaseClient(),
		});
		// 기기 저장소를 쓰던 패널이 로그인 신호를 받으면 서버 저장소로 다시 고른다.
		await queryClient.refetchQueries({ queryKey: QUERY_KEY.memoStore() });
		await queryClient.refetchQueries({ queryKey: QUERY_KEY.user() });
		// 오프라인에서 실패한 설정·메모 조회가 오류로 남아 있으면, 경계를 리셋해도 Suspense 조회가 같은
		// 오류를 곧바로 다시 던져 로그인 화면(경계 폴백)으로 돌아간다. 리셋 전에 먼저 다시 가져온다.
		await queryClient.refetchQueries({
			predicate: (query) => query.state.status === "error",
		});

		if (isLoggedInExpected === true) {
			await reportLoginSyncMismatch(queryClient);
		}

		loginBoundaryRef.current?.resetErrorBoundary();
	};

	useDidMount(() => {
		// 구버전 웹은 payload 없이 보내 타입과 달리 `undefined`가 올 수 있다.
		bridge.handle.SYNC_LOGIN_STATUS(
			(payload: IFSyncLoginStatusPayload | undefined) =>
				refreshLoginStatus(payload?.isLoggedIn),
		);
	});

	useEffect(function refreshLoginStatusOnWindowSignal() {
		const handleOnline = () => {
			void refreshLoginStatus();
		};
		// 패널 로그인 창에서 로그인을 마친 신호라 로그인돼 있어야 한다.
		const handlePanelLogin = () => {
			void refreshLoginStatus(true);
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener(PANEL_LOGIN_EVENT, handlePanelLogin);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener(PANEL_LOGIN_EVENT, handlePanelLogin);
		};
	});
}
