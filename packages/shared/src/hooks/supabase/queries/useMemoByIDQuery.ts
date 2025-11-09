import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

interface UseMemoByIdQueryProps {
	id: number;
}

export default function useMemoByIdQuery({ id }: UseMemoByIdQueryProps) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	const query = useSuspenseQuery({
		queryFn: () => new MemoService(supabaseClient).getMemoById(id),
		queryKey: QUERY_KEY.memoById(id),
	});

	return {
		...query,
	};
}
