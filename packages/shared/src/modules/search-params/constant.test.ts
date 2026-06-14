import { SEARCH_PARAMS_KEYS } from "./constant";

describe("SEARCH_PARAMS_KEYS", () => {
	test("isStar 파라미터를 허용한다.", () => {
		expect(SEARCH_PARAMS_KEYS).toContain("isStar");
	});
});
