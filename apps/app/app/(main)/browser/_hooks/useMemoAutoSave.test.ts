import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setMemoAutoSaveOwner } from "../../../../lib/memoAutoSaveSession";
import { useMemoAutoSave } from "./useMemoAutoSave";

const harness = vi.hoisted(() => ({
	refs: [] as { current: unknown }[],
	cursor: 0,
	effectSession: undefined as unknown,
	cleanup: undefined as (() => void) | undefined,
	appState: undefined as ((state: string) => void) | undefined,
}));
vi.mock("react", () => ({
	useState: () => [0, vi.fn()],
	useRef: (value: unknown) => {
		const index = harness.cursor++;
		harness.refs[index] ??= { current: value };
		return harness.refs[index];
	},
	useEffect: (effect: () => () => void, deps: unknown[]) => {
		if (harness.effectSession === deps[0]) return;
		harness.cleanup?.();
		harness.effectSession = deps[0];
		harness.cleanup = effect();
	},
}));
vi.mock("react-native", () => ({
	AppState: {
		addEventListener: (_type: string, listener: (state: string) => void) => {
			harness.appState = listener;
			return { remove: vi.fn() };
		},
	},
}));
vi.mock(
	"@/lib/memoAutoSaveSession",
	async () => import("../../../../lib/memoAutoSaveSession"),
);

function createOptions(page = "a") {
	return {
		owner: "owner",
		tabId: "tab",
		pageKey: page,
		url: `https://example.com/${page}`,
		selectionId: null,
		targetId: null,
		draft: {
			title: "Page title",
			memo: "",
			impression: "",
			actionItem: "",
			pendingLocalId: null,
			pendingSaveMode: null,
		},
		canSave: true,
		save: vi.fn().mockResolvedValue({ id: 42 }),
		onSavedId: vi.fn(),
	};
}
function render(options: Parameters<typeof useMemoAutoSave>[0]) {
	harness.cursor = 0;
	return useMemoAutoSave(options);
}
beforeEach(() => {
	vi.useFakeTimers();
	harness.refs = [];
	harness.effectSession = undefined;
	harness.cleanup = undefined;
	setMemoAutoSaveOwner("reset");
	setMemoAutoSaveOwner("owner");
});
afterEach(async () => {
	harness.cleanup?.();
	setMemoAutoSaveOwner("reset");
	await vi.runAllTimersAsync();
	vi.useRealTimers();
});

it("hydration은 저장하지 않고 편집 후 1초에 자동 저장한다", async () => {
	const options = createOptions();
	const panel = render(options);
	await vi.advanceTimersByTimeAsync(1000);
	expect(options.save).not.toHaveBeenCalled();
	panel.handleEdit({ memo: "edit" });
	await vi.advanceTimersByTimeAsync(999);
	expect(options.save).not.toHaveBeenCalled();
	await vi.advanceTimersByTimeAsync(1);
	expect(options.save).toHaveBeenCalledWith(
		expect.objectContaining({
			url: options.url,
			draft: expect.objectContaining({ memo: "edit" }),
		}),
	);
});

it("A 이탈 flush의 늦은 성공은 B 선택을 바꾸지 않는다", async () => {
	const a = createOptions();
	let resolve: (value: { id: number }) => void = () => {};
	a.save.mockImplementation(
		() =>
			new Promise((done) => {
				resolve = done;
			}),
	);
	render(a).handleEdit({ memo: "A edit" });
	const b = createOptions("b");
	render(b);
	await vi.advanceTimersByTimeAsync(0);
	expect(a.save).toHaveBeenCalledTimes(1);
	resolve({ id: 42 });
	await vi.advanceTimersByTimeAsync(0);
	expect(a.onSavedId).not.toHaveBeenCalled();
	expect(b.onSavedId).not.toHaveBeenCalled();
	expect(render(b).draft.memo).toBe("");
});

it("background는 debounce 대기 초안을 즉시 flush한다", async () => {
	const options = createOptions();
	render(options).handleEdit({ memo: "last edit" });
	harness.appState?.("background");
	await vi.advanceTimersByTimeAsync(0);
	expect(options.save).toHaveBeenCalledTimes(1);
});

it("A 실패 초안을 A→B→A에서 복원하고 자동 재시도를 반복하지 않는다", async () => {
	const a = createOptions();
	a.save.mockRejectedValue(new Error("offline"));
	render(a).handleEdit({ memo: "unsaved" });
	await vi.advanceTimersByTimeAsync(1000);
	render(createOptions("b"));
	const restored = render(a);
	expect(restored.draft.memo).toBe("unsaved");
	expect(restored.failure).toBe("save");
	await vi.advanceTimersByTimeAsync(10000);
	expect(a.save).toHaveBeenCalledTimes(1);
});

it("대기 원본의 방식 미선택은 저장을 예약하지 않는다", async () => {
	const options: Parameters<typeof useMemoAutoSave>[0] = createOptions();
	options.draft.pendingLocalId = "source";
	render(options).handleEdit({ memo: "source edit" });
	await vi.advanceTimersByTimeAsync(1000);
	expect(options.save).not.toHaveBeenCalled();
});
