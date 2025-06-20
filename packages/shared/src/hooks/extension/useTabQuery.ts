import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../constants";
import { Tab } from "../../utils/extension";

export default function useTabQuery() {
	return useSuspenseQuery({ queryFn: Tab.get, queryKey: QUERY_KEY.tab() });
}
