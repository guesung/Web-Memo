"use client";

import { GA_CLIENT_ID_PATTERN } from "@web-memo/shared/constants";
import { useEffect, useRef } from "react";

const INSTALL_GUIDE_LOAD_ENDPOINT = "/api/install-guide-load";

/**
 * 설치 가이드가 열렸다는 신호를 같은 출처의 API로 보냅니다.
 *
 * @description 광고 차단기가 gtag를 막으면 `install_guide_view`가 남지 않습니다. 같은 출처
 * 요청은 막히지 않으므로 서버가 이 신호를 `install_guide_load`로 GA에 옮깁니다. 형식이 맞지
 * 않는 `ext_cid`는 보내지 않습니다.
 */
export function InstallGuideLoadBeacon({
	extCid,
}: InstallGuideLoadBeaconProps) {
	const hasSent = useRef(false);

	useEffect(() => {
		if (hasSent.current) return;
		hasSent.current = true;

		const cid =
			extCid && GA_CLIENT_ID_PATTERN.test(extCid) ? extCid : undefined;
		try {
			navigator.sendBeacon(
				INSTALL_GUIDE_LOAD_ENDPOINT,
				JSON.stringify({ cid }),
			);
		} catch {
			// 계측 실패가 가이드 화면을 막으면 안 됩니다.
		}
	}, [extCid]);

	return null;
}

interface InstallGuideLoadBeaconProps {
	extCid?: string;
}
