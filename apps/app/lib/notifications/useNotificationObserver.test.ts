import { beforeEach, expect, it, vi } from "vitest";
import { useNotificationObserver } from "./useNotificationObserver";

const mocks = vi.hoisted(() => ({
	key: undefined as string | undefined,
	push: vi.fn(),
	effect: undefined as (() => undefined | (() => void)) | undefined,
	listener: undefined as ((response: TestResponse) => void) | undefined,
	remove: vi.fn(),
	getInitial: vi.fn(),
	getLast: vi.fn(),
	clearLast: vi.fn(),
	lastProcessed: { current: null as string | null },
}));

vi.mock("react", () => ({
	useEffect: (effect: () => undefined | (() => void)) => {
		mocks.effect = effect;
	},
	useRef: () => mocks.lastProcessed,
}));
vi.mock("expo-router", () => ({
	useRouter: () => ({ push: mocks.push }),
	useRootNavigationState: () => (mocks.key ? { key: mocks.key } : undefined),
}));
vi.mock("expo-notifications", () => ({
	DEFAULT_ACTION_IDENTIFIER: "default",
	getLastNotificationResponseAsync: mocks.getInitial,
	getLastNotificationResponse: mocks.getLast,
	clearLastNotificationResponse: mocks.clearLast,
	addNotificationResponseReceivedListener: (
		listener: (response: TestResponse) => void,
	) => {
		mocks.listener = listener;
		return { remove: mocks.remove };
	},
}));

type TestResponse = {
	actionIdentifier: string;
	notification: {
		request: { identifier: string; content: { data: { url?: unknown } } };
	};
};

function response(
	id: string,
	url: unknown,
	actionIdentifier = "default",
): TestResponse {
	return {
		actionIdentifier,
		notification: { request: { identifier: id, content: { data: { url } } } },
	};
}

function mount() {
	useNotificationObserver();
	return mocks.effect?.();
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.key = undefined;
	mocks.effect = undefined;
	mocks.listener = undefined;
	mocks.lastProcessed.current = null;
	mocks.getInitial.mockResolvedValue(null);
	mocks.getLast.mockReturnValue(null);
});

it("navigation이 준비될 때까지 응답 조회와 구독을 미룬다", () => {
	mount();
	expect(mocks.getInitial).not.toHaveBeenCalled();
	expect(mocks.listener).toBeUndefined();
	mocks.key = "ready";
	mount();
	expect(mocks.getInitial).toHaveBeenCalledTimes(1);
	expect(mocks.listener).toBeTypeOf("function");
});

it("초기 응답과 리스너가 같은 알림을 받아도 한 번만 연다", async () => {
	const tapped = response("one", "https://example.com/?q=100%25&x=한글#part");
	mocks.getInitial.mockResolvedValue(tapped);
	mocks.getLast.mockReturnValue(tapped);
	mocks.key = "ready";
	mount();
	mocks.listener?.(tapped);
	await Promise.resolve();
	expect(mocks.push).toHaveBeenCalledTimes(1);
	expect(mocks.push).toHaveBeenCalledWith({
		pathname: "/(main)/browser",
		params: {
			url: encodeURIComponent(
				tapped.notification.request.content.data.url as string,
			),
			t: expect.any(String),
		},
	});
	expect(mocks.clearLast).toHaveBeenCalledTimes(1);
});

it("초기 응답을 먼저 연 뒤 같은 리스너 응답이 와도 다시 열지 않는다", async () => {
	const tapped = response("one", "https://example.com/?q=100%25");
	mocks.getInitial.mockResolvedValue(tapped);
	mocks.key = "ready";
	mount();
	await Promise.resolve();
	mocks.listener?.(tapped);
	mocks.listener?.(tapped);
	expect(mocks.push).toHaveBeenCalledTimes(1);
});

it("새 라이브 응답이 먼저 열리면 늦게 도착한 초기 응답을 무시한다", async () => {
	let resolveInitial: (value: TestResponse) => void = () => {};
	mocks.getInitial.mockReturnValue(
		new Promise<TestResponse>((resolve) => {
			resolveInitial = resolve;
		}),
	);
	mocks.key = "ready";
	mount();
	mocks.listener?.(response("new", "https://example.com/new"));
	resolveInitial(response("old", "https://example.com/old"));
	await Promise.resolve();
	expect(mocks.push).toHaveBeenCalledTimes(1);
	expect(mocks.push.mock.calls[0][0].params.url).toBe(
		encodeURIComponent("https://example.com/new"),
	);
});

it("해제 후 완료된 조회와 거부된 조회는 화면을 열지 않는다", async () => {
	let resolveInitial: (value: TestResponse) => void = () => {};
	mocks.getInitial.mockReturnValue(
		new Promise<TestResponse>((resolve) => {
			resolveInitial = resolve;
		}),
	);
	mocks.key = "ready";
	const cleanup = mount();
	if (typeof cleanup === "function") cleanup();
	resolveInitial(response("old", "https://example.com/old"));
	await Promise.resolve();
	mocks.listener?.(response("late", "https://example.com/late"));
	expect(mocks.push).not.toHaveBeenCalled();
	expect(mocks.remove).toHaveBeenCalledTimes(1);
	mocks.getInitial.mockRejectedValue(new Error("unavailable"));
	mount();
	await Promise.resolve();
	await Promise.resolve();
	expect(mocks.push).not.toHaveBeenCalled();
});

it("기본 탭과 유효한 문자열 URL만 열고, 새로운 pending 응답은 지우지 않는다", () => {
	mocks.key = "ready";
	mount();
	mocks.listener?.(response("action", "https://example.com", "button"));
	mocks.listener?.(response("bad", 42));
	mocks.listener?.(response("empty", ""));
	expect(mocks.push).not.toHaveBeenCalled();
	mocks.getLast.mockReturnValue(response("newer", "https://example.com/newer"));
	mocks.listener?.(response("valid", "https://example.com/?q=100%"));
	expect(mocks.push).toHaveBeenCalledTimes(1);
	expect(mocks.clearLast).not.toHaveBeenCalled();
});
