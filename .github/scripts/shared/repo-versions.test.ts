import { describe, expect, it } from "vitest";
import {
	readChromeWebStorePublisherId,
	readExtensionId,
} from "./repo-versions.mjs";

// 상수를 정규식으로 읽으므로, 상수 파일의 표기가 바뀌면 여기서 먼저 드러난다
describe("packages/shared 상수 읽기", () => {
	it("확장 ID를 32자 소문자로 읽는다", () => {
		expect(readExtensionId()).toMatch(/^[a-z]{32}$/);
	});

	it("웹스토어 게시자 ID를 UUID로 읽는다", () => {
		expect(readChromeWebStorePublisherId()).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});
});
