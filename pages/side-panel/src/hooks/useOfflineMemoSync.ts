import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { MemoService } from "@web-memo/shared/utils";
import { useEffect, useRef, useState } from "react";
import {
	flushOfflineMemoQueue,
	type IFOfflineMemoConflict,
	OFFLINE_MEMO_QUEUE_STORAGE_KEY,
} from "../utils/offlineMemoQueue";
import useOnlineStatus from "./useOnlineStatus";

/** 대기열 flush 진행 상태. idle은 대기 중이거나 방금 끝났음을 뜻한다 */
export type TOfflineMemoSyncStatus = "idle" | "syncing" | "syncFailed";

interface UseOfflineMemoSyncProps {
	/** flush 대상을 가릴 현재 로그인 사용자. 없으면 flush하지 않는다 */
	userId?: string;
	/** 충돌(다른 메모로 새로 저장)이 생겼을 때마다 호출한다 */
	onConflict?: (conflict: IFOfflineMemoConflict) => void;
}

/**
 * 오프라인 대기열을 마운트 시점과 온라인 전환 시점에 서버로 올린다.
 * @description flush는 동시에 하나만 돈다. 네트워크 오류를 만나면 오프라인 상태로
 * 돌아간 것으로 보고 조용히 멈추고, 그 외 오류면 `syncFailed`로 남아 `retrySync`로
 * 다시 시도할 수 있게 한다. 성공하거나 충돌한 항목이 있으면 관련 쿼리를 무효화한다.
 * 사용처: MemoSection/index.tsx
 */
export default function useOfflineMemoSync({
	userId,
	onConflict,
}: UseOfflineMemoSyncProps) {
	const isOnline = useOnlineStatus();
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();
	const [syncStatus, setSyncStatus] = useState<TOfflineMemoSyncStatus>("idle");
	// 마지막 flush 시도가 네트워크 오류로 중단됐는지. navigator.onLine이 아직 true인데도
	// 요청이 네트워크 오류로 실패하는 경우(예: 캡티브 포털)를 오프라인과 구분해 표시줄에 쓴다.
	const [lastFlushHadNetworkError, setLastFlushHadNetworkError] =
		useState(false);
	const isMountedRef = useRef(true);
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);
	const isFlushingRef = useRef(false);
	const needsTrailingFlushRef = useRef(false);
	const wasOnlineRef = useRef(isOnline);
	// mount·online 이펙트는 한 번만 걸리므로, 그 뒤에 바뀌는 userId·onConflict를
	// 놓치지 않도록 최신 값을 ref로 들고 flush 안에서 읽는다.
	const latestPropsRef = useRef({ userId, onConflict, epoch: 0 });
	const authEpoch =
		latestPropsRef.current.userId === userId
			? latestPropsRef.current.epoch
			: latestPropsRef.current.epoch + 1;
	latestPropsRef.current = { userId, onConflict, epoch: authEpoch };

	const flush = async (
		trigger: "mount" | "online" | "retry_click" | "enqueue",
	) => {
		const {
			userId: currentUserId,
			onConflict: currentOnConflict,
			epoch: currentEpoch,
		} = latestPropsRef.current;

		if (!currentUserId || isFlushingRef.current) {
			return;
		}

		isFlushingRef.current = true;
		setSyncStatus("syncing");

		try {
			const memoService = new MemoService(supabaseClient);
			const result = await flushOfflineMemoQueue({
				userId: currentUserId,
				memoService,
				shouldContinue: () =>
					isMountedRef.current && latestPropsRef.current.epoch === currentEpoch,
			});

			if (
				!isMountedRef.current ||
				latestPropsRef.current.epoch !== currentEpoch
			)
				return;

			if (result.syncedCount > 0) {
				await queryClient.invalidateQueries({
					queryKey: QUERY_KEY.memosPaginatedPrefix(),
				});
				await queryClient.invalidateQueries({
					queryKey: QUERY_KEY.samePathMemosPrefix(),
				});
				await queryClient.invalidateQueries({ queryKey: ["memo"] });
			}

			if (
				!isMountedRef.current ||
				latestPropsRef.current.epoch !== currentEpoch
			)
				return;

			for (const conflict of result.conflicts) {
				currentOnConflict?.(conflict);
			}

			const hasProcessedAnyItem =
				result.attemptedCount > 0 ||
				result.syncedCount > 0 ||
				result.hasOtherError ||
				result.hasNetworkError;
			if (hasProcessedAnyItem) {
				void Promise.resolve()
					.then(() =>
						analytics.trackEvent({
							name: "memo_offline_sync_result",
							params: {
								trigger,
								synced_count: result.syncedCount,
								conflict_count: result.acknowledgedConflictCount ?? 0,
								has_other_error: result.hasOtherError,
								queue_contract_version: 2,
								attempted_count: result.attemptedCount ?? 0,
								network_error_count: result.networkErrorCount ?? 0,
								other_error_count: result.otherErrorCount ?? 0,
								...(result.remainingCount === undefined
									? {}
									: { remaining_count: result.remainingCount }),
								ack_latency_sum_ms: result.ackLatencySumMs ?? 0,
								ack_latency_count: result.ackLatencyCount ?? 0,
								no_op_count: result.noOpCount ?? 0,
							},
						}),
					)
					.catch(() => {});
			}

			setLastFlushHadNetworkError(result.hasNetworkError);
			setSyncStatus(result.hasOtherError ? "syncFailed" : "idle");
			if (result.hasOtherError || result.hasNetworkError) {
				needsTrailingFlushRef.current = false;
			}
		} catch {
			if (
				isMountedRef.current &&
				latestPropsRef.current.epoch === currentEpoch
			) {
				setSyncStatus("syncFailed");
				void Promise.resolve()
					.then(() =>
						analytics.trackEvent({
							name: "memo_offline_sync_result",
							params: {
								trigger,
								synced_count: 0,
								conflict_count: 0,
								has_other_error: true,
								queue_contract_version: 2,
								attempted_count: 0,
								network_error_count: 0,
								other_error_count: 1,
								ack_latency_sum_ms: 0,
								ack_latency_count: 0,
								no_op_count: 0,
							},
						}),
					)
					.catch(() => {});
			}
			needsTrailingFlushRef.current = false;
		} finally {
			isFlushingRef.current = false;
			if (
				!isMountedRef.current ||
				latestPropsRef.current.epoch !== currentEpoch
			) {
				needsTrailingFlushRef.current = false;
				void flush("mount");
			} else if (needsTrailingFlushRef.current && isMountedRef.current) {
				needsTrailingFlushRef.current = false;
				void flush("enqueue");
			}
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: 온라인으로 바뀔 때만 flush한다
	useEffect(() => {
		const becameOnline = !wasOnlineRef.current && isOnline;
		wasOnlineRef.current = isOnline;
		if (becameOnline) void flush("online");
	}, [isOnline]);

	/**
	 * 온라인 상태에서 현재 메모에 대기 항목이 생기면(이미 대기 중이거나 네트워크 오류로 방금
	 * 넣은 경우) 온라인 전환 이벤트 없이도 곧바로 flush를 예약한다. flush 자신이 대기열을
	 * 지우거나 넣는 것도 같은 이벤트를 울리지만 `isFlushingRef`가 겹쳐 돌지 않게 막는다.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: 큐가 바뀔 때만 반응한다
	useEffect(() => {
		const handleStorageChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			areaName: string,
		) => {
			if (
				areaName !== "local" ||
				!(OFFLINE_MEMO_QUEUE_STORAGE_KEY in changes)
			) {
				return;
			}
			if (!navigator.onLine) {
				return;
			}

			if (isFlushingRef.current) {
				needsTrailingFlushRef.current = true;
			} else {
				void flush("enqueue");
			}
		};

		chrome.storage.onChanged.addListener(handleStorageChange);
		return () => chrome.storage.onChanged.removeListener(handleStorageChange);
	}, []);

	// Auth may resolve after mount, or switch while a previous account is flushing.
	// biome-ignore lint/correctness/useExhaustiveDependencies: only auth scope changes should start a mount flush
	useEffect(() => {
		if (userId) void flush("mount");
	}, [userId]);

	return {
		syncStatus,
		/** 마지막 flush 시도가 네트워크 오류로 중단됐는지. 저장 표시줄이 오프라인 표시와 함께 쓴다 */
		lastFlushHadNetworkError,
		/** syncFailed 상태에서 사용자가 다시 시도할 때 부른다 */
		retrySync: () => flush("retry_click"),
	};
}
