import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";

interface CreateMemoInput {
	url: string;
	title: string;
	content: string;
}

async function createMemo(input: CreateMemoInput) {
	const { data, error } = await supabase
		.from("memo")
		.insert({
			url: input.url,
			title: input.title,
			memo: input.content,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}

export function useMemoMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createMemo,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["memos"] });
		},
	});
}
