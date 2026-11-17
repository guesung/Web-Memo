import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalMemoService, MemoService } from "../../../utils";
import { SupabaseSessionRequiredError } from "../../../utils/extension";
import { memoStoreQueryOptions } from "./useMemoStoreQuery";

const { isExtension } = vi.hoisted(() => ({ isExtension: vi.fn() }));

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example", buildEnv: "development" },
}));
vi.mock("../../../modules/chrome-storage", () => ({ ChromeSyncStorage: {} }));
vi.mock("../../../utils/Environment", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../../utils/Environment")>()),
	isExtension,
}));

const createClient = (ensureQueryData: () => Promise<unknown>) => {
	const queryClient = new QueryClient();
	vi.spyOn(queryClient, "ensureQueryData").mockImplementation(
		ensureQueryData as never,
	);
	return queryClient;
};

const run = (queryClient: QueryClient) =>
	(
		memoStoreQueryOptions(queryClient)
			.queryFn as unknown as () => Promise<unknown>
	)();

describe("메모 저장소 선택", () => {
	beforeEach(() => {
		isExtension.mockReturnValue(true);
	});

	it("세션이 있으면 서버 저장소를 쓴다", async () => {
		const store = await run(createClient(async () => ({})));

		expect(store).toBeInstanceOf(MemoService);
	});

	it("확장에서 세션이 없으면 기기 저장소를 쓴다", async () => {
		const store = await run(
			createClient(async () => {
				throw new SupabaseSessionRequiredError("로그인을 먼저 해주세요");
			}),
		);

		expect(store).toBeInstanceOf(LocalMemoService);
	});

	it("세션 복원 실패처럼 다른 오류는 기기 저장소로 돌리지 않고 던진다", async () => {
		const failure = new Error("세션 복원 실패");

		await expect(
			run(
				createClient(async () => {
					throw failure;
				}),
			),
		).rejects.toBe(failure);
	});

	it("웹에서는 세션이 없어도 기기 저장소를 쓰지 않는다", async () => {
		isExtension.mockReturnValue(false);
		const error = new SupabaseSessionRequiredError("로그인을 먼저 해주세요");

		await expect(
			run(
				createClient(async () => {
					throw error;
				}),
			),
		).rejects.toBe(error);
	});
});
