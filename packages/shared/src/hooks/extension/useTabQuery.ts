import { QUERY_KEY } from "@src/constants";
import { Tab } from "@src/utils/extension";
import { useSuspenseQuery } from "@tanstack/react-query";

export default function useTabQuery() {
	return useSuspenseQuery({ queryFn: Tab.get, queryKey: QUERY_KEY.tab() });
}
