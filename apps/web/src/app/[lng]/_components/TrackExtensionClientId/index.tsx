"use client";

import { analytics } from "@web-memo/shared/modules/analytics";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** 확장이 로그인 탭을 열 때 실어 보내는 쿼리 파라미터. */
const EXTENSION_CLIENT_ID_PARAM = "ext_cid";
/** 확장에서 넘어온 client_id를 담아두는 키. 로그인 콜백을 거쳐도 살아남아야 합니다. */
const EXTENSION_CLIENT_ID_STORAGE_KEY = "webmemo:ext_client_id";

/**
 * 확장에서 넘어온 client_id를 이어받아 이후 웹 이벤트에 싣습니다.
 * @description 사이드패널은 비로그인이고 로그인은 웹 탭에서 끝나는데, 확장은 자체
 * client_id를, 웹은 gtag의 _ga 쿠키를 써서 그냥 두면 서로 다른 사용자가 됩니다.
 * 그러면 "사이드패널까지 왔다가 가입하지 않은 사람"을 셀 수 없어 이탈률이 나오지 않습니다.
 * 한 번 받은 값은 저장해 둡니다. OAuth 콜백이 쿼리를 갈아치우기 때문입니다.
 */
export default function TrackExtensionClientId() {
	const searchParams = useSearchParams();

	useEffect(() => {
		const clientIdFromQuery = searchParams.get(EXTENSION_CLIENT_ID_PARAM);

		if (clientIdFromQuery) {
			try {
				localStorage.setItem(
					EXTENSION_CLIENT_ID_STORAGE_KEY,
					clientIdFromQuery,
				);
			} catch {
				// 저장에 실패해도 이번 세션 동안은 아래에서 세팅되므로 그대로 진행합니다.
			}

			analytics.setExtensionClientId(clientIdFromQuery);
			return;
		}

		try {
			const storedClientId = localStorage.getItem(
				EXTENSION_CLIENT_ID_STORAGE_KEY,
			);

			if (storedClientId) analytics.setExtensionClientId(storedClientId);
		} catch {
			// 저장소를 못 읽는 브라우저에서는 확장→웹 연결만 포기하고 나머지는 그대로 둡니다.
		}
	}, [searchParams]);

	return null;
}
