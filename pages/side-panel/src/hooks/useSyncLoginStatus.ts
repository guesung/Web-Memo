import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useDidMount } from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { ErrorBoundary } from "@web-memo/ui";
import type { RefObject } from "react";

/**
 * 웹에서 로그인 상태가 바뀌었다는 신호(SYNC_LOGIN_STATUS)를 받아 사이드 패널을 갱신합니다.
 * @description 로그아웃 상태에서는 MemoForm이 던진 오류로 로그인 화면이 대신 그려지므로,
 * MemoForm 안쪽이 아니라 로그인 여부와 무관하게 항상 마운트되는 곳에서 호출해야 합니다.
 * 수신하면 Supabase 클라이언트와 사용자 쿼리를 다시 가져온 뒤 로그인 화면을 띄운 ErrorBoundary를
 * 리셋합니다. 오류 상태가 아닌 ErrorBoundary의 리셋은 아무 일도 하지 않으므로, 이미 로그인된
 * 패널의 메모 입력 상태는 유지됩니다. 현재 사용처: MemoSection.tsx
 * @param loginBoundaryRef 로그인 화면을 폴백으로 쓰는 ErrorBoundary의 ref
 */
export default function useSyncLoginStatus(
	loginBoundaryRef: RefObject<ErrorBoundary | null>,
) {
	const queryClient = useQueryClient();

	useDidMount(() => {
		bridge.handle.SYNC_LOGIN_STATUS(async () => {
			await queryClient.refetchQueries({
				queryKey: QUERY_KEY.supabaseClient(),
			});
			await queryClient.refetchQueries({ queryKey: QUERY_KEY.user() });

			loginBoundaryRef.current?.resetErrorBoundary();
		});
	});
}
