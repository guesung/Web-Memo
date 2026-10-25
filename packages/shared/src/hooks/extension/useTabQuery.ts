import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../constants";
import { Tab } from "../../utils/extension";

/**
 * 현재 활성 탭을 조회한다.
 * @description chrome API만 읽어 네트워크가 필요 없으므로 `networkMode: 'always'`로 둔다. 기본값('online')이면
 * 오프라인일 때 조회가 일시정지돼, 페이지를 옮겨도 사이드 패널이 이전 탭 URL에 머문다.
 */
export default function useTabQuery() {
	return useQuery({
		queryFn: Tab.get,
		queryKey: QUERY_KEY.tab(),
		networkMode: "always",
	});
}
