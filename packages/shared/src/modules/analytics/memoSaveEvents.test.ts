import { describe, expect, it } from "vitest";
import { buildMemoSaveEvents, type IFMemoSaveResult } from "./memoSaveEvents";

const savedResult: IFMemoSaveResult = {
	userId: "user-a",
	source: "side_panel",
	isSuccess: true,
	after: { id: 1, memo: "사용자가 쓴 본문" },
};

describe("실제 메모 저장 결과의 유효 본문 판정", () => {
	it.each(["memo", "impression", "actionItem"] as const)(
		"%s가 새로 저장되거나 바뀌면 본문 저장으로 센다",
		(key) => {
			for (const before of [undefined, { [key]: "이전 내용" }]) {
				expect(
					buildMemoSaveEvents({
						...savedResult,
						before,
						after: { id: 1, [key]: " 새 내용 " },
					}).map((event) => event.name),
				).toEqual(["memo_save_result", "memo_content_saved"]);
			}
		},
	);

	it("기존 본문이 있어도 같은 내용이나 앞뒤 공백만 바뀐 저장은 제외한다", () => {
		expect(
			buildMemoSaveEvents({
				...savedResult,
				before: { memo: "사용자가 쓴 본문" },
				after: { id: 1, memo: " 사용자가 쓴 본문 " },
			}),
		).toHaveLength(1);
	});

	it.each([
		undefined,
		null,
		{ id: 1 },
		{ id: 1, memo: "  \n\t" },
		{ memo: "내용" },
	])("반환 행/ID/유효 본문이 없으면 결과만 남긴다: %j", (after) => {
		expect(buildMemoSaveEvents({ ...savedResult, after })).toEqual([
			{
				name: "memo_save_result",
				params: { is_success: true, source: "side_panel", reason: "none" },
			},
		]);
	});

	it("본문 삭제는 유효 기록으로 세지 않는다", () => {
		expect(
			buildMemoSaveEvents({
				...savedResult,
				before: { memo: "이전 본문" },
				after: { id: 1, memo: "" },
			}),
		).toHaveLength(1);
	});

	it.each([
		[new TypeError("Failed to fetch"), "network"],
		[{ message: "서버 내부 원문", code: "secret" }, "server"],
		[undefined, "unknown"],
	] as const)(
		"실패 사유만 분류하고 본문 성공은 보내지 않는다",
		(error, reason) => {
			expect(
				buildMemoSaveEvents({ ...savedResult, isSuccess: false, error }),
			).toEqual([
				{
					name: "memo_save_result",
					params: { is_success: false, source: "side_panel", reason },
				},
			]);
		},
	);

	it("동기화에서도 식별자·본문은 payload에 포함하지 않는다", () => {
		const events = buildMemoSaveEvents({
			...savedResult,
			source: "offline_sync",
		});
		expect(events).toEqual([
			{
				name: "memo_save_result",
				params: { is_success: true, source: "offline_sync", reason: "none" },
			},
			{ name: "memo_content_saved", params: { source: "offline_sync" } },
		]);
		expect(JSON.stringify(events)).not.toContain("사용자가 쓴 본문");
		expect(JSON.stringify(events)).not.toContain("user-a");
	});
});
