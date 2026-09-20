"use client";

import { useEffect } from "react";

/**
 * 개발 서버에서만 React Grab을 켭니다.
 * 요소에 마우스를 올리고 Cmd+C(Ctrl+C)를 누르면 컴포넌트 이름, 소스 위치, HTML이
 * 클립보드에 복사되어 AI에게 그대로 붙여넣을 수 있습니다.
 */
export default function ReactGrab() {
	useEffect(() => {
		/*
		 * 환경 분기는 보통 CONFIG.buildEnv로 하지만 여기서는 NODE_ENV를 씁니다.
		 * 번들러가 이 조건을 빌드 시점에 상수로 치환해야 운영 번들에서 react-grab
		 * import가 통째로 빠집니다. staging 구분과는 무관한, 개발 서버 여부 판별입니다.
		 */
		if (process.env.NODE_ENV === "development") {
			import("react-grab");
		}
	}, []);

	return null;
}
