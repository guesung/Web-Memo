import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { ShareToast } from "@/components/ShareToast";
import { useSharedUrlToast } from "@/lib/sharing/useSharedUrlToast";

/**
 * iOS 공유 확장이 openHostApp으로 여는 `webmemo://share?url=...&title=...` 딥링크를 받는다.
 * @description ShareIntentHandler와 같은 useSharedUrlToast 훅으로 같은 흐름(handleSharedUrl →
 * 토스트, 후보가 여럿이면 브라우저로 이동)을 실행한다.
 */
export default function ShareDeepLinkScreen() {
	const router = useRouter();
	const { url, title } = useLocalSearchParams<{
		url?: string;
		title?: string;
	}>();
	const { toast, processSharedUrl } = useSharedUrlToast();
	const hasProcessedRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: processSharedUrl은 useSharedUrlToast가 매 렌더 새로 만드는 함수라, 의존성에 넣으면 매 렌더 재실행된다. hasProcessedRef가 중복 처리를 막는다.
	useEffect(() => {
		if (!url?.startsWith("http")) {
			router.replace("/(main)");
			return;
		}
		if (hasProcessedRef.current) {
			return;
		}
		hasProcessedRef.current = true;

		processSharedUrl(url, title).then((result) => {
			if (result && !result.saved) {
				router.replace({
					pathname: "/(main)/browser",
					params: { url, t: String(Date.now()) },
				});
				return;
			}
			setTimeout(() => router.replace("/(main)"), 900);
		});
	}, [url, title, router]);

	return (
		<View className="flex-1 bg-white dark:bg-neutral-900">
			{toast ? <ShareToast message={toast} /> : null}
		</View>
	);
}
