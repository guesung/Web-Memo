import { beforeEach, expect, it, vi } from "vitest";
import {
	useHighlightDeleteMutation,
	useHighlightUpdateMutation,
} from "./useHighlightMutation";

const mocks = vi.hoisted(() => ({
	mutationFn: undefined as ((input: never) => Promise<unknown>) | undefined,
	getHighlightById: vi.fn(),
	updateHighlight: vi.fn(),
	deleteHighlight: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
	useMutation: (options: {
		mutationFn: (input: never) => Promise<unknown>;
	}) => {
		mocks.mutationFn = options.mutationFn;
		return {};
	},
	useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/lib/auth/AuthProvider", () => ({
	useAuth: () => ({ session: { user: { id: "owner" } } }),
}));
vi.mock("@/lib/supabase/client", () => ({
	highlightService: {
		getHighlightById: mocks.getHighlightById,
		updateHighlight: mocks.updateHighlight,
		deleteHighlight: mocks.deleteHighlight,
	},
}));

beforeEach(() => {
	mocks.mutationFn = undefined;
	mocks.getHighlightById.mockReset();
	mocks.updateHighlight.mockReset();
	mocks.deleteHighlight.mockReset();
	mocks.getHighlightById.mockResolvedValue({
		data: {
			id: 1,
			url: "https://example.com/other?utm_source=old",
			page_key: "https://example.com/other",
		},
		error: null,
	});
});

it("다른 페이지의 하이라이트 ID는 수정하지 않는다", async () => {
	useHighlightUpdateMutation();

	await expect(
		mocks.mutationFn?.({
			id: 1,
			url: "https://example.com/current",
			color: "blue",
		} as never),
	).rejects.toThrow("다른 페이지");
	expect(mocks.updateHighlight).not.toHaveBeenCalled();
});

it("다른 페이지의 하이라이트 ID는 삭제하지 않는다", async () => {
	useHighlightDeleteMutation();

	await expect(
		mocks.mutationFn?.({
			id: 1,
			url: "https://example.com/current",
		} as never),
	).rejects.toThrow("다른 페이지");
	expect(mocks.deleteHighlight).not.toHaveBeenCalled();
});

it("같은 페이지의 기존 URL을 쓰기 범위로 전달한다", async () => {
	mocks.getHighlightById.mockResolvedValue({
		data: {
			id: 1,
			url: "https://example.com/current?utm_source=old",
			page_key: "https://example.com/current",
		},
		error: null,
	});
	mocks.updateHighlight.mockResolvedValue({ data: [{ id: 1 }], error: null });
	useHighlightUpdateMutation();
	await mocks.mutationFn?.({
		id: 1,
		url: "https://example.com/current?utm_source=new",
		color: "blue",
	} as never);

	expect(mocks.updateHighlight).toHaveBeenCalledWith(
		expect.objectContaining({
			id: 1,
			scope: {
				url: "https://example.com/current?utm_source=old",
				userId: "owner",
			},
		}),
	);
});
