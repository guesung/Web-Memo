import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useShareIntent } from "expo-share-intent";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShareToast } from "@/components/ShareToast";
import {
	AnalyticsUserSync,
	ScreenViewTracker,
} from "@/lib/analytics/AnalyticsTrackers";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { ThemeProvider, useTheme } from "@/lib/context/ThemeContext";
import { migrateSharedExtensionPendingUrls } from "@/lib/sharing/pendingSharedUrls";
import { useSharedUrlToast } from "@/lib/sharing/useSharedUrlToast";
import { syncMemosToSupabase } from "@/lib/storage/syncService";
import "../global.css";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			staleTime: 1000 * 60 * 5,
		},
	},
});

function SyncOnAuth() {
	const { session } = useAuth();
	const insets = useSafeAreaInsets();
	const [syncToast, setSyncToast] = useState<string | null>(null);

	useEffect(() => {
		if (session) {
			syncMemosToSupabase()
				.then((result) => {
					queryClient.invalidateQueries({ queryKey: ["memos"] });
					queryClient.invalidateQueries({ queryKey: ["localMemos"] });
					queryClient.invalidateQueries({ queryKey: ["localMemo"] });
					if (result.failed > 0) {
						setSyncToast(
							`${result.failed}개의 메모가 선택을 기다리고 있습니다`,
						);
						setTimeout(() => setSyncToast(null), 3000);
					} else if (result.synced > 0) {
						setSyncToast(`${result.synced}개의 메모가 동기화되었습니다`);
						setTimeout(() => setSyncToast(null), 3000);
					}
				})
				.catch(() => {});
		}
	}, [session]);

	if (!syncToast) return null;

	return (
		<View
			className="absolute self-center flex-row items-center gap-2 bg-black/80 px-4 py-2.5 rounded-[20px]"
			style={{ top: insets.top + 60 }}
		>
			<Check size={14} color="#22c55e" />
			<Text className="text-white text-sm font-semibold">{syncToast}</Text>
		</View>
	);
}

/**
 * Android(expo-share-intent)로 받은 공유를 처리한다.
 * @description iOS 공유 확장이 여는 webmemo://share 딥링크는 app/share.tsx가 같은
 * useSharedUrlToast 훅으로 같은 흐름을 실행한다.
 */
function ShareIntentHandler() {
	const router = useRouter();
	const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
	const { toast, processSharedUrl } = useSharedUrlToast();

	// biome-ignore lint/correctness/useExhaustiveDependencies: processSharedUrl은 useSharedUrlToast가 매 렌더 새로 만드는 함수라, 의존성에 넣으면 매 렌더 재실행된다. 내부 processingUrlRef가 중복 호출을 막는다.
	useEffect(() => {
		if (!hasShareIntent || !shareIntent) return;

		const url = shareIntent.webUrl || shareIntent.text;
		if (!url?.startsWith("http")) {
			resetShareIntent();
			return;
		}

		processSharedUrl(url, shareIntent.meta?.title ?? undefined)
			.then((result) => {
				if (result && !result.saved) {
					router.push({
						pathname: "/(main)/browser",
						params: { url, t: String(Date.now()) },
					});
				}
			})
			.finally(() => {
				resetShareIntent();
			});
	}, [hasShareIntent, shareIntent, resetShareIntent, router]);

	if (!toast) return null;

	return <ShareToast message={toast} />;
}

/**
 * 본 앱 실행·포그라운드 복귀 시 iOS 공유 확장이 App Group에 보관한 공유 요청을
 * 본 앱의 보류 목록으로 옮긴다.
 */
function useMigrateSharedExtensionPending() {
	useEffect(() => {
		migrateSharedExtensionPendingUrls();

		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				migrateSharedExtensionPendingUrls();
			}
		});

		return () => subscription.remove();
	}, []);
}

/** 화면 전환 중 테마와 어긋나는 배경이 비치지 않도록 스택 배경색을 테마에 맞춘다 */
function ThemedStack() {
	const { isDark } = useTheme();

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: isDark ? "#171717" : "#ffffff" },
			}}
		>
			<Stack.Screen name="index" />
			<Stack.Screen name="(auth)" />
			<Stack.Screen name="(main)" />
			{/* 탭 밖의 상세 화면이라 탭바 없이 뜬다 */}
			<Stack.Screen name="trash" />
			<Stack.Screen name="pending-memos" />
			{/* iOS 공유 확장이 openHostApp으로 여는 webmemo://share 딥링크 */}
			<Stack.Screen name="share" />
			<Stack.Screen name="+not-found" />
		</Stack>
	);
}

export default function RootLayout() {
	useEffect(() => {
		SplashScreen.hideAsync();
	}, []);
	useMigrateSharedExtensionPending();

	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<AuthProvider>
					<GestureHandlerRootView>
						<ThemedStack />
					</GestureHandlerRootView>
					<SyncOnAuth />
					<AnalyticsUserSync />
					<ScreenViewTracker />
					<ShareIntentHandler />
					<StatusBar style="auto" />
				</AuthProvider>
			</ThemeProvider>
		</QueryClientProvider>
	);
}
