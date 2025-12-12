import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";

export interface Memo {
	id: string;
	url: string;
	title: string | null;
	content: string;
	created_at: string;
	updated_at: string;
}

async function fetchMemos(): Promise<Memo[]> {
	const { data, error } = await supabase
		.from("memo")
		.select("*")
		.order("created_at", { ascending: false })
		.limit(50);

	if (error) throw error;
	return data ?? [];
}

export function useMemos() {
	return useQuery({
		queryKey: ["memos"],
		queryFn: fetchMemos,
	});
}
