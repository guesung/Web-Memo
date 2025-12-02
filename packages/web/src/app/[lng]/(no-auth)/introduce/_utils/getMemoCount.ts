import { getSupabaseClient } from "@src/modules/supabase/util.server";

export async function getMemoCount(): Promise<number> {
	try {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc(
			"get_memo_count" as unknown as never,
		);

		if (error) {
			console.error("Failed to fetch memo count:", error);
			return 10000;
		}

		return (data as number) ?? 10000;
	} catch (error) {
		console.error("Failed to fetch memo count:", error);
		return 10000;
	}
}
