"use client";

import {
	getMemoNavigationId,
	reportMemoLoadStage,
	type TMemoRoute,
} from "@src/modules/observability/client";
import { useEffect } from "react";

/** 메모 화면의 첫 커밋 이후 쉘이 표시된 시각을 기록한다. */
const MemoShellProbe = ({ route }: { route: TMemoRoute }) => {
	const navigationId = getMemoNavigationId(route);
	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			reportMemoLoadStage({ route, navigationId, stage: "ttfb" });
			reportMemoLoadStage({ route, navigationId, stage: "fcp" });
			reportMemoLoadStage({ route, navigationId, stage: "shell_ready" });
		});

		return () => cancelAnimationFrame(frame);
	}, [route, navigationId]);

	return null;
};

export default MemoShellProbe;
