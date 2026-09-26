import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { MemoService } from "@web-memo/shared/utils";
import { useEffect, useRef, useState } from "react";
import {
	flushOfflineMemoQueue,
	type IFOfflineMemoConflict,
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
	const isFlushingRef = useRef(false);

	const flush = async () => {
		if (!userId || isFlushingRef.current) {
			return;
		}

		isFlushingRef.current = true;
		setSyncStatus("syncing");

		try {
			const memoService = new MemoService(supabaseClient);
			const result = await flushOfflineMemoQueue({ userId, memoService });

			for (const conflict of result.conflicts) {
				onConflict?.(conflict);
			}

			if (result.syncedCount > 0) {
				await queryClient.invalidateQueries({
					queryKey: QUERY_KEY.memosPaginatedPrefix(),
				});
				await queryClient.invalidateQueries({
					queryKey: QUERY_KEY.samePathMemosPrefix(),
				});
				await queryClient.invalidateQueries({ queryKey: ["memo"] });
			}

			setSyncStatus(result.hasOtherError ? "syncFailed" : "idle");
		} finally {
			isFlushingRef.current = false;
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: 마운트 시 한 번만 flush한다
	useEffect(() => {
		void flush();
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: 온라인으로 바뀔 때만 flush한다
	useEffect(() => {
		if (!isOnline) {
			return;
		}

		void flush();
	}, [isOnline]);

	return {
		syncStatus,
		/** syncFailed 상태에서 사용자가 다시 시도할 때 부른다 */
		retrySync: flush,
	};
}
