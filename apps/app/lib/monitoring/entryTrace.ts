import * as Sentry from "@sentry/react-native";

export function recordEntryTrace(context: EntryContext) {
	try {
		Sentry.addBreadcrumb({
			category: "app.entry",
			message: context.stage,
			level: "info",
			data: getSafeContext(context),
		});
	} catch {
		// 진단 전송 실패가 앱 진입을 막아서는 안 된다.
	}
}

export function reportEntryError(error: unknown, context: EntryContext) {
	try {
		Sentry.withScope((scope) => {
			scope.setTag("runtime", "mobile-app");
			scope.setTag("entry_source", context.source);
			scope.setTag("entry_stage", context.stage);
			scope.setContext("mobile_entry", getSafeContext(context));
			Sentry.captureException(error);
		});
	} catch {
		// 진단 전송 실패가 원래 오류 처리 경로를 바꾸지 않도록 한다.
	}
}

function getUrlShape(url?: string) {
	if (url === undefined) return {};
	const scheme = /^[a-z][a-z\d+.-]*:/i.exec(url)?.[0].slice(0, -1);
	return {
		urlLength: url.length,
		urlScheme: scheme === "http" || scheme === "https" ? scheme : "other",
		hasPercent: url.includes("%"),
		hasQuery: url.includes("?"),
		hasFragment: url.includes("#"),
	};
}

function getSafeContext({ source, stage, url, data }: EntryContext) {
	const safeData: Record<string, boolean | number | string> = {};
	const booleanKeys = [
		"nativeInitialized",
		"isReady",
		"hasResponse",
		"hasUrl",
		"isTabsLoaded",
		"isNewTab",
		"didCrash",
	] as const;
	for (const key of booleanKeys) {
		if (typeof data?.[key] === "boolean") safeData[key] = data[key];
	}
	const numberKeys = ["code", "statusCode"] as const;
	for (const key of numberKeys) {
		if (typeof data?.[key] === "number" && Number.isFinite(data[key]))
			safeData[key] = data[key];
	}
	if (
		data?.state &&
		["active", "inactive", "background", "unknown", "extension"].includes(
			data.state,
		)
	) {
		safeData.state = data.state;
	}
	return {
		source,
		stage,
		...getUrlShape(url),
		...safeData,
	};
}

type EntryContext = {
	source: "app" | "link" | "share" | "notification" | "browser" | "webview";
	stage: string;
	url?: string;
	data?: {
		state?: string;
		nativeInitialized?: boolean;
		isReady?: boolean;
		hasResponse?: boolean;
		hasUrl?: boolean;
		isTabsLoaded?: boolean;
		isNewTab?: boolean;
		code?: number;
		statusCode?: number;
		didCrash?: boolean;
	};
};
