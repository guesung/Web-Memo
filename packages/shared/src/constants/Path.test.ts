import { GENERATED_PAGE_PATHS } from "./generatedPagePaths";
import { MANUAL_PATHS } from "./Path";

describe("PATHS", () => {
	test("자동 생성된 페이지 경로와 수동 경로의 키가 겹치지 않는다.", () => {
		const manualKeys = Object.keys(MANUAL_PATHS);
		const duplicatedKeys = Object.keys(GENERATED_PAGE_PATHS).filter((key) =>
			manualKeys.includes(key),
		);

		expect(duplicatedKeys).toStrictEqual([]);
	});
});
