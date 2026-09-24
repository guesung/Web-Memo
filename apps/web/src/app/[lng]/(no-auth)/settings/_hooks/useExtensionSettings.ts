import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { useEffect, useRef, useState } from "react";

/** 브리지에서 조회한 확장 설정입니다. 기존의 알 수 없는 언어 값도 유지합니다. */
type TExtensionSettings = Extract<
	Awaited<ReturnType<typeof bridge.request.GET_EXTENSION_SETTINGS>>,
	{ success: true }
>["settings"];
/** 허용된 단일 설정 변경 요청입니다. */
type TSettingRequest = Parameters<
	typeof bridge.request.SET_EXTENSION_SETTING
>[0];
/** 항목별 저장 상태입니다. */
type TSaveStatus = "idle" | "saving" | "saved" | "failed";
/** 연결을 확인한 결과입니다. */
type TConnectionStatus =
	| "loading"
	| "ready"
	| "unavailable"
	| "unsupported"
	| "read-error"
	| "forbidden";
/** 마지막으로 시도한 변경과 저장 결과를 함께 보관합니다. */
interface IFSettingSave {
	status: TSaveStatus;
	request: TSettingRequest;
}

/** 5초 안에 응답하지 않는 구버전·연결 끊김을 무한 로딩으로 남기지 않습니다. */
export const withSettingsTimeout = async <T>(
	request: Promise<T>,
): Promise<T> => {
	let timer: ReturnType<typeof setTimeout> | undefined;

	try {
		return await Promise.race([
			request,
			new Promise<never>((_resolve, reject) => {
				timer = setTimeout(
					() => reject(new Error("Extension settings timed out")),
					5000,
				);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
};

/** 확장 설정을 조회하고 단일 키만 저장합니다. 확인되지 않은 값은 기본값으로 덮어쓰지 않습니다. */
export const useExtensionSettings = () => {
	const [settings, setSettings] = useState<TExtensionSettings | null>(null);
	const [connection, setConnection] = useState<TConnectionStatus>("loading");
	const [attempt, setAttempt] = useState(0);
	const [saves, setSaves] = useState<
		Partial<Record<keyof TExtensionSettings, IFSettingSave>>
	>({});
	const pendingSaves = useRef(
		new Map<keyof TExtensionSettings, IFSettingSave>(),
	);
	const mounted = useRef(false);
	const activeAttempt = useRef(0);

	useEffect(() => {
		mounted.current = true;
		activeAttempt.current = attempt;
		let cancelled = false;
		const loadSettings = async () => {
			setConnection("loading");
			try {
				const result = await withSettingsTimeout(
					bridge.request.GET_EXTENSION_SETTINGS(),
				);
				if (cancelled || activeAttempt.current !== attempt) {
					return;
				}
				if (!result) {
					const manifest = await withSettingsTimeout(
						bridge.request.GET_EXTENSION_MANIFEST(),
					);
					if (!cancelled) {
						setConnection(
							manifest?.manifest_version ? "unsupported" : "unavailable",
						);
					}
					return;
				}
				if (!result.success) {
					if (result.error === "storage_read_failed") {
						setConnection("read-error");
					} else if (result.error === "forbidden") {
						setConnection("forbidden");
					} else {
						setConnection("unavailable");
					}
					return;
				}
				if (result.protocolVersion !== 1) {
					setConnection("unsupported");
					return;
				}
				if (!isValidSettings(result.settings)) {
					setConnection("read-error");
					return;
				}
				setSettings(result.settings);
				setConnection("ready");
			} catch (error) {
				if (cancelled) {
					return;
				}
				if (
					error instanceof Error &&
					error.message === "Extension settings timed out"
				) {
					setConnection("unavailable");
					return;
				}
				try {
					const manifest = await withSettingsTimeout(
						bridge.request.GET_EXTENSION_MANIFEST(),
					);
					if (!cancelled) {
						setConnection(
							manifest?.manifest_version ? "unsupported" : "unavailable",
						);
					}
				} catch {
					if (!cancelled) {
						setConnection("unavailable");
					}
				}
			}
		};
		void loadSettings();

		return () => {
			cancelled = true;
			mounted.current = false;
		};
	}, [attempt]);

	useEffect(() => {
		const handleWindowFocus = () => {
			if (
				[...pendingSaves.current.values()].some(
					(save) => save.status === "saving",
				)
			) {
				return;
			}
			setAttempt((previous) => previous + 1);
		};
		window.addEventListener("focus", handleWindowFocus);

		return () => window.removeEventListener("focus", handleWindowFocus);
	}, []);

	const handleSettingChange = async (request: TSettingRequest) => {
		if (
			connection !== "ready" ||
			!settings ||
			pendingSaves.current.get(request.key)?.status === "saving"
		) {
			return;
		}
		const pendingSave: IFSettingSave = { status: "saving", request };
		pendingSaves.current.set(request.key, pendingSave);
		setSaves((previous) => ({ ...previous, [request.key]: pendingSave }));

		try {
			const result = await withSettingsTimeout(
				bridge.request.SET_EXTENSION_SETTING(request),
			);
			if (
				!result?.success ||
				result.key !== request.key ||
				JSON.stringify(result.value) !== JSON.stringify(request.value)
			) {
				throw new Error("Extension setting was not saved");
			}
			if (
				!mounted.current ||
				pendingSaves.current.get(request.key) !== pendingSave
			) {
				return;
			}
			setSettings(
				(previous) => previous && { ...previous, [result.key]: result.value },
			);
			const saved: IFSettingSave = { status: "saved", request };
			pendingSaves.current.set(request.key, saved);
			setSaves((previous) => ({ ...previous, [request.key]: saved }));
		} catch (error) {
			if (
				!mounted.current ||
				pendingSaves.current.get(request.key) !== pendingSave
			) {
				return;
			}
			const failed: IFSettingSave = { status: "failed", request };
			pendingSaves.current.set(request.key, failed);
			setSaves((previous) => ({ ...previous, [request.key]: failed }));

			if (
				error instanceof Error &&
				error.message === "Extension settings timed out"
			) {
				void (async () => {
					try {
						const reread = await withSettingsTimeout(
							bridge.request.GET_EXTENSION_SETTINGS(),
						);
						if (
							!reread?.success ||
							reread.protocolVersion !== 1 ||
							!isValidSettings(reread.settings) ||
							!mounted.current ||
							pendingSaves.current.get(request.key) !== failed
						) {
							return;
						}
						setSettings(
							(previous) =>
								previous && {
									...previous,
									[request.key]: reread.settings[request.key],
								},
						);
						if (
							JSON.stringify(reread.settings[request.key]) ===
							JSON.stringify(request.value)
						) {
							const saved: IFSettingSave = { status: "saved", request };
							pendingSaves.current.set(request.key, saved);
							setSaves((previous) => ({ ...previous, [request.key]: saved }));
						}
					} catch {
						/** 저장 확인 요청도 실패하면 재시도 가능한 상태를 유지합니다. */
					}
				})();
			}
		}
	};

	const handleConnectionRetryClick = () => {
		setAttempt((previous) => previous + 1);
	};

	const handleSaveRetryClick = (key: keyof TExtensionSettings) => {
		const failed = pendingSaves.current.get(key);
		if (failed?.status === "failed") {
			void handleSettingChange(failed.request);
		}
	};

	return {
		settings,
		connection,
		saves,
		handleSettingChange,
		handleConnectionRetryClick,
		handleSaveRetryClick,
	};
};

/** 구버전이나 손상된 저장 값이 입력 컴포넌트에 전달되지 않도록 확인합니다. */
const isValidSettings = (value: unknown): value is TExtensionSettings => {
	if (!value || typeof value !== "object") {
		return false;
	}

	return (
		"language" in value &&
		typeof value.language === "string" &&
		"autoApplyCategory" in value &&
		typeof value.autoApplyCategory === "boolean" &&
		"highlightBubbleEnabled" in value &&
		typeof value.highlightBubbleEnabled === "boolean" &&
		"highlightBubblePosition" in value &&
		(value.highlightBubblePosition === "above" ||
			value.highlightBubblePosition === "below") &&
		"highlightDisabledSites" in value &&
		Array.isArray(value.highlightDisabledSites) &&
		value.highlightDisabledSites.every((site) => typeof site === "string")
	);
};
