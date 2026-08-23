import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "@web-memo/shared/constants";
import { unstable_cache } from "next/cache";

const DEFAULT_MEMO_COUNT = 10000;

const fetchMemoCount = async (): Promise<number> => {
	try {
		const supabase = createClient(SUPABASE.url, SUPABASE.anonKey, {
			db: { schema: SUPABASE.table.memo },
		});
		const { data, error } = await supabase.rpc(
			"get_memo_count" as unknown as never,
		);

		if (error) {
			console.error("Failed to fetch memo count:", error);
			return DEFAULT_MEMO_COUNT;
		}

		return (data as number) ?? DEFAULT_MEMO_COUNT;
	} catch (error) {
		console.error("Failed to fetch memo count:", error);
		return DEFAULT_MEMO_COUNT;
	}
};

export const getMemoCount = unstable_cache(fetchMemoCount, ["memo-count"], {
	revalidate: 3600,
});
