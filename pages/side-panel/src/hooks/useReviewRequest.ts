import { useQuery } from "@tanstack/react-query";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { MemoService } from "@web-memo/shared/utils";
import { useCallback, useState } from "react";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const REQUIRED_MEMO_COUNT = 10;

export default function useReviewRequest() {
	const [dismissed, setDismissed] = useState(false);
	const { data: supabaseClient } = useSupabaseClientQuery();

	const { data: shouldShow = false } = useQuery({
		queryKey: ["reviewRequest"],
		queryFn: async () => {
			const reviewDismissed = await ChromeSyncStorage.get<boolean>(
				STORAGE_KEYS.reviewDismissed,
			);
			if (reviewDismissed) return false;

			const installDate = await ChromeSyncStorage.get<number>(
				STORAGE_KEYS.installDate,
			);
			if (!installDate) return false;
			if (Date.now() - installDate < SEVEN_DAYS_MS) return false;

			const memoService = new MemoService(supabaseClient);
			const result = await memoService.getMemosPaginated({ limit: 1 });
			const count = result.count ?? 0;
			if (count < REQUIRED_MEMO_COUNT) return false;

			return true;
		},
		staleTime: Number.POSITIVE_INFINITY,
	});

	const dismiss = useCallback(async () => {
		setDismissed(true);
		await ChromeSyncStorage.set(STORAGE_KEYS.reviewDismissed, true);
	}, []);

	return {
		shouldShow: shouldShow && !dismissed,
		dismiss,
	};
}
