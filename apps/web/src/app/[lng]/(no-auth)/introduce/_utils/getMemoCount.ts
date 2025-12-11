import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import { SUPABASE } from "@web-memo/shared/constants";
import { unstable_cache } from "next/cache";

const DEFAULT_MEMO_COUNT = 10000;

const fetchMemoCount = async (): Promise<number> => {
	try {
		const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
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
