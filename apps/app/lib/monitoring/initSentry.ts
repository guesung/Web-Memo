import * as Sentry from "@sentry/react-native";
import { SENTRY } from "@web-memo/shared/constants";
import { recordEntryTrace } from "./entryTrace";
import { filterAppBreadcrumb, sanitizeAppEvent } from "./sanitizeEvent";

Sentry.init({
	dsn: SENTRY.dsnWeb,
	enabled: !__DEV__,
	enableNative: true,
	enableNativeCrashHandling: true,
	autoInitializeNativeSdk: true,
	enableNdk: true,
	enableNdkScopeSync: true,
	enableNativeNagger: false,
	sendDefaultPii: false,
	attachScreenshot: false,
	attachViewHierarchy: false,
	enableAutoPerformanceTracing: false,
	enableAppStartTracking: false,
	enableNativeFramesTracking: false,
	enableStallTracking: false,
	maxBreadcrumbs: 50,
	initialScope: { tags: { runtime: "mobile-app" } },
	beforeBreadcrumb: filterAppBreadcrumb,
	beforeSend: sanitizeAppEvent,
	onReady: ({ didCallNativeInit }) => {
		Sentry.setTag("runtime", "mobile-app");
		recordEntryTrace({
			source: "app",
			stage: "sentry.ready",
			data: { nativeInitialized: didCallNativeInit },
		});
	},
});

recordEntryTrace({ source: "app", stage: "startup" });
