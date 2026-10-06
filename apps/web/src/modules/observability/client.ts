import { initializeMemoFaro, sendMemoFaroMeasurement } from "./faro";

/** 메모 화면에서 수집하는 로딩 단계. */
export type TMemoLoadStage =
	| "ttfb"
	| "fcp"
	| "shell_ready"
	| "data_ready"
	| "content_ready"
	| "navigation_end";

/** 메모 화면의 첫 페이지 데이터 또는 표시 결과. */
export type TMemoLoadOutcome =
	| "success"
	| "empty"
	| "error"
	| "cancelled"
	| "timeout";

/** 메모 화면별로 고정된 경로. 검색어와 쿼리 문자열은 수집하지 않는다. */
export type TMemoRoute =
	| "/memos"
	| "/memos/wish"
	| "/memos/star"
	| "/memos/reading";

/** 메모 화면 내비게이션 하나의 측정 상태. */
interface IFMemoNavigation {
	id: number;
	path: TMemoRoute;
	kind: "hard_load" | "client_navigation";
	startedAt: number;
	reportedStages: Set<TMemoLoadStage>;
	timeoutId: number | null;
	finished: boolean;
	completed: boolean;
}

let activeNavigation: IFMemoNavigation | null = null;
let nextNavigationId = 0;
let hasStartedRouterNavigation = false;

/** 허용된 메모 경로만 반환하여 ID, 검색어, 쿼리 문자열을 수집하지 않는다. */
export const getMemoRoute = (pathname: string): TMemoRoute | null => {
	const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
	const memoIndex = segments[0] === "ko" || segments[0] === "en" ? 1 : 0;
	if (segments[memoIndex] !== "memos") {
		return null;
	}

	if (segments.length === memoIndex + 1) {
		return "/memos";
	}

	if (segments.length !== memoIndex + 2) {
		return null;
	}

	const filter = segments[memoIndex + 1];
	if (filter === "wish" || filter === "star" || filter === "reading") {
		return `/memos/${filter}`;
	}

	return null;
};

const INITIAL_MEMO_ROUTE =
	typeof window === "undefined" ? null : getMemoRoute(window.location.pathname);
let lastObservedRoute = INITIAL_MEMO_ROUTE;

/** Faro에는 앱에서 명시적으로 만든 메모 지연 측정값만 전달한다. */
export const initializeMemoObservability = (): void => {
	const collectorUrl = process.env.NEXT_PUBLIC_FARO_URL;
	if (typeof window === "undefined" || !collectorUrl) {
		return;
	}

	if (!activeNavigation && !hasStartedRouterNavigation && INITIAL_MEMO_ROUTE) {
		activeNavigation = createMemoNavigation({
			path: INITIAL_MEMO_ROUTE,
			kind: "hard_load",
			startedAt: 0,
		});
	}

	initializeMemoFaro({ collectorUrl, normalizeRoute: getMemoRoute });
};

/** Next 라우터가 메모 화면으로 이동하기 시작한 시각을 기록한다. */
export const startMemoNavigation = (url: string): void => {
	if (typeof window === "undefined") {
		return;
	}
	hasStartedRouterNavigation = true;

	let path: TMemoRoute | null;
	try {
		path = getMemoRoute(new URL(url, window.location.origin).pathname);
	} catch {
		return;
	}

	if (path === lastObservedRoute) {
		if (path && activeNavigation?.path === path && activeNavigation.finished) {
			activeNavigation = createMemoNavigation({
				path,
				kind: "client_navigation",
				startedAt: performance.now(),
			});
			return;
		}

		if (
			activeNavigation &&
			activeNavigation.path !== path &&
			!activeNavigation.finished &&
			!activeNavigation.completed
		) {
			finishMemoNavigation(activeNavigation, "cancelled");
		}
		return;
	}

	if (
		activeNavigation &&
		!activeNavigation.finished &&
		!activeNavigation.completed
	) {
		finishMemoNavigation(activeNavigation, "cancelled");
	}
	lastObservedRoute = path;
	if (!path) {
		activeNavigation = null;
		return;
	}

	activeNavigation = createMemoNavigation({
		path,
		kind: "client_navigation",
		startedAt: performance.now(),
	});
};

/** 렌더가 시작된 탐색을 식별해 이전 화면의 늦은 콜백을 제외한다. */
export const getMemoNavigationId = (route: TMemoRoute): number | null => {
	if (activeNavigation?.path !== route) {
		return null;
	}

	return activeNavigation.id;
};

/** 메모 화면의 단계별 경과 시간을 한 번씩 수집한다. */
export const reportMemoLoadStage = ({
	route,
	navigationId,
	stage,
	outcome = "success",
}: {
	route: TMemoRoute;
	navigationId: number | null;
	stage: TMemoLoadStage;
	outcome?: TMemoLoadOutcome;
}): void => {
	if (typeof window === "undefined") {
		return;
	}

	if (getMemoRoute(window.location.pathname) !== route) {
		return;
	}

	if (
		!activeNavigation ||
		activeNavigation.path !== route ||
		activeNavigation.id !== navigationId ||
		activeNavigation.finished ||
		activeNavigation.reportedStages.has(stage)
	) {
		return;
	}

	const endTime = getStageTime(stage, activeNavigation);
	if (endTime === null) {
		return;
	}

	activeNavigation.reportedStages.add(stage);
	lastObservedRoute = route;
	if (stage === "content_ready") {
		activeNavigation.completed = true;
		clearMemoTimeout(activeNavigation);
	}
	sendMemoMeasurement({
		navigation: activeNavigation,
		stage,
		outcome,
		endTime,
	});
};

/** 경과 시간 측정과 자동 종료 타이머를 함께 만든다. */
const createMemoNavigation = ({
	path,
	kind,
	startedAt,
}: Pick<IFMemoNavigation, "path" | "kind" | "startedAt">): IFMemoNavigation => {
	const navigation: IFMemoNavigation = {
		id: ++nextNavigationId,
		path,
		kind,
		startedAt,
		reportedStages: new Set(),
		timeoutId: null,
		finished: false,
		completed: false,
	};
	navigation.timeoutId = window.setTimeout(() => {
		if (
			activeNavigation === navigation &&
			!navigation.finished &&
			!navigation.completed
		) {
			finishMemoNavigation(navigation, "timeout");
		}
	}, 30_000);

	return navigation;
};

/** 새 탐색 또는 제한 시간으로 끝난 탐색을 별도 결과로 기록한다. */
const finishMemoNavigation = (
	navigation: IFMemoNavigation,
	outcome: "cancelled" | "timeout",
): void => {
	navigation.finished = true;
	clearMemoTimeout(navigation);
	sendMemoMeasurement({
		navigation,
		stage: "navigation_end",
		outcome,
		endTime: performance.now(),
	});
};

/** 완료된 탐색의 제한 시간 알림을 해제한다. */
const clearMemoTimeout = (navigation: IFMemoNavigation): void => {
	if (navigation.timeoutId !== null) {
		window.clearTimeout(navigation.timeoutId);
		navigation.timeoutId = null;
	}
};

/** 허용된 단계와 결과만 Faro로 보낸다. */
const sendMemoMeasurement = ({
	navigation,
	stage,
	outcome,
	endTime,
}: {
	navigation: IFMemoNavigation;
	stage: TMemoLoadStage;
	outcome: TMemoLoadOutcome;
	endTime: number;
}): void => {
	initializeMemoObservability();
	sendMemoFaroMeasurement({
		route: navigation.path,
		stage,
		navigation: navigation.kind,
		outcome,
		durationMs: Math.max(0, Math.round(endTime - navigation.startedAt)),
	});
};

/** 하드 로드의 네트워크·페인트와 공통 화면 단계를 같은 시작점에서 계산한다. */
const getStageTime = (
	stage: TMemoLoadStage,
	navigation: IFMemoNavigation,
): number | null => {
	if (stage === "ttfb" || stage === "fcp") {
		if (navigation.kind !== "hard_load") {
			return null;
		}

		if (stage === "ttfb") {
			const entry = performance.getEntriesByType("navigation")[0] as
				| PerformanceNavigationTiming
				| undefined;
			return entry?.responseStart ?? null;
		}

		return (
			performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
			null
		);
	}

	return performance.now();
};
