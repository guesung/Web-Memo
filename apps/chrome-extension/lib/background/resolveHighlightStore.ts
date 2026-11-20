import {
	HighlightService,
	type IFHighlightStore,
	LocalHighlightService,
} from "@web-memo/shared/utils";
import { getAuthenticatedClient } from "./supabaseAuth";

/** 하이라이트를 저장할 곳을 정한 결과. 실패 코드는 진단용 고정 문자열이다. */
export type THighlightStoreResolution =
	| { status: "ready"; store: IFHighlightStore; userId: string }
	| { status: "auth_unavailable" | "auth_rejected" | "user_missing" };

/**
 * 세션이 없으면 기기 저장소를, 세션이 있으면 인증된 사용자의 서버 저장소를 고른다.
 * @description 기기 저장소의 `userId`는 빈 문자열이다. 세션이 있는데 서버가 거부하면 기기 저장소로 돌리지 않고
 * 실패로 돌려, 만료된 세션 아래에서 하이라이트가 조용히 기기에만 쌓이지 않게 한다.
 */
export const resolveHighlightStore =
	async (): Promise<THighlightStoreResolution> => {
		const supabaseClient = await getAuthenticatedClient();
		if (!supabaseClient) {
			return {
				status: "ready",
				store: new LocalHighlightService(),
				userId: "",
			};
		}
		const { data, error } = await supabaseClient.auth.getUser();
		if (error && error.status !== 401 && error.status !== 403) {
			return { status: "auth_unavailable" };
		}
		if (error || !data.user) {
			return { status: error ? "auth_rejected" : "user_missing" };
		}

		return {
			status: "ready",
			store: new HighlightService(supabaseClient),
			userId: data.user.id,
		};
	};
