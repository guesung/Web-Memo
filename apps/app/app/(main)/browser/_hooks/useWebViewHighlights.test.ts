import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWebViewHighlights } from "./useWebViewHighlights";

const mocks = vi.hoisted(() => ({
	isLoggedIn: true,
	setStringAsync: vi.fn(),
	injectJavaScript: vi.fn(),
	createHighlight: vi.fn(),
}));

vi.mock("react", () => ({
	useState: <T>(initialValue: T) => [initialValue, vi.fn()],
	useCallback: <T>(callback: T) => callback,
	useEffect: vi.fn(),
}));
vi.mock("expo-clipboard", () => ({
	setStringAsync: mocks.setStringAsync,
}));
vi.mock("@/lib/auth/AuthProvider", () => ({
	useAuth: () => ({ isLoggedIn: mocks.isLoggedIn }),
}));
vi.mock("@/lib/hooks/useHighlights", () => ({
	useHighlightsByUrl: () => ({ data: [], isSuccess: true }),
}));
vi.mock("@/lib/hooks/useHighlightMutation", () => ({
	useHighlightCreateMutation: () => ({ mutate: mocks.createHighlight }),
	useHighlightUpdateMutation: () => ({ mutate: vi.fn() }),
	useHighlightDeleteMutation: () => ({ mutate: vi.fn() }),
}));

beforeEach(() => {
	mocks.isLoggedIn = true;
	vi.clearAllMocks();
	mocks.setStringAsync.mockReset().mockResolvedValue(true);
});

describe("인앱 브라우저 텍스트 선택 메뉴", () => {
	it("로그인하면 하이라이트 다음에 복사를 제공하고 선택만으로 복사하지 않는다", () => {
		const { menuItems } = createHook();

		expect(menuItems).toEqual([
			{ label: "하이라이트", key: "webmemo-highlight" },
			{ label: "복사", key: "webmemo-copy" },
		]);
		expect(mocks.setStringAsync).not.toHaveBeenCalled();
	});

	it("비로그인 메뉴는 undefined로 OS 기본 복사를 유지한다", () => {
		mocks.isLoggedIn = false;

		expect(createHook().menuItems).toBeUndefined();
		expect(mocks.setStringAsync).not.toHaveBeenCalled();
	});

	it("복사 메뉴를 누르면 공백과 개행을 포함한 선택 원문만 클립보드에 쓴다", async () => {
		const { handleCustomMenuSelection } = createHook();
		const selectedText = "  첫 문장\n다음 문장  ";

		await handleCustomMenuSelection({
			nativeEvent: { key: "webmemo-copy", selectedText },
		});

		expect(mocks.setStringAsync).toHaveBeenCalledTimes(1);
		expect(mocks.setStringAsync).toHaveBeenCalledWith(selectedText);
		expect(mocks.injectJavaScript).not.toHaveBeenCalled();
		expect(mocks.createHighlight).not.toHaveBeenCalled();
	});

	it.each(["", " \n\t ", undefined, null, 42])(
		"빈 선택 또는 잘못된 선택(%s)은 클립보드를 덮어쓰지 않는다",
		async (selectedText) => {
			const { handleCustomMenuSelection } = createHook();

			await handleCustomMenuSelection({
				nativeEvent: {
					key: "webmemo-copy",
					selectedText: selectedText as never,
				},
			});

			expect(mocks.setStringAsync).not.toHaveBeenCalled();
			expect(mocks.injectJavaScript).not.toHaveBeenCalled();
		},
	);

	it("네이티브 복사 실패를 처리하고 하이라이트로 대체하지 않는다", async () => {
		mocks.setStringAsync.mockRejectedValue(new Error("clipboard unavailable"));
		const { handleCustomMenuSelection } = createHook();

		await expect(
			handleCustomMenuSelection({
				nativeEvent: { key: "webmemo-copy", selectedText: "선택 문장" },
			}),
		).resolves.toBeUndefined();
		expect(mocks.injectJavaScript).not.toHaveBeenCalled();
		expect(mocks.createHighlight).not.toHaveBeenCalled();
	});

	it("하이라이트 메뉴는 기존 커밋 스크립트를 실행하고 복사하지 않는다", async () => {
		const { handleCustomMenuSelection } = createHook();

		await handleCustomMenuSelection({
			nativeEvent: { key: "webmemo-highlight", selectedText: "선택 문장" },
		});

		expect(mocks.injectJavaScript).toHaveBeenCalledTimes(1);
		expect(mocks.injectJavaScript).toHaveBeenCalledWith(
			"window.__webmemoCommitHighlight(); true;",
		);
		expect(mocks.setStringAsync).not.toHaveBeenCalled();
	});

	it("알 수 없는 메뉴는 무시한다", async () => {
		const { handleCustomMenuSelection } = createHook();

		await handleCustomMenuSelection({
			nativeEvent: { key: "unknown", selectedText: "선택 문장" },
		});

		expect(mocks.setStringAsync).not.toHaveBeenCalled();
		expect(mocks.injectJavaScript).not.toHaveBeenCalled();
	});
});

function createHook() {
	const webViewRef = {
		current: { injectJavaScript: mocks.injectJavaScript },
	} as unknown as Parameters<typeof useWebViewHighlights>[0]["webViewRef"];

	return useWebViewHighlights({ webViewRef });
}
