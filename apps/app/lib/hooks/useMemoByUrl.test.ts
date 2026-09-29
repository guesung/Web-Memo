import { expect, it, vi } from "vitest";
import { useSupabaseMemoByUrl } from "./useMemoByUrl";

const mocks = vi.hoisted(() => ({
	owner: "a",
	isLoading: false,
	useQuery: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("@/lib/auth/AuthProvider", () => ({
	useAuth: () => ({
		session: { user: { id: mocks.owner } },
		isLoading: mocks.isLoading,
	}),
}));
vi.mock("@/lib/supabase/client", () => ({
	memoService: { getMemoByUrl: vi.fn() },
}));
it("페이지 캐시는 같은 URL이어도 로그인 owner마다 분리한다", () => {
	mocks.owner = "a";
	useSupabaseMemoByUrl("https://example.com");
	const a = mocks.useQuery.mock.lastCall?.[0].queryKey;
	mocks.owner = "b";
	useSupabaseMemoByUrl("https://example.com");
	const b = mocks.useQuery.mock.lastCall?.[0].queryKey;
	expect(a).not.toEqual(b);
	expect(a.slice(0, -1)).toEqual(b.slice(0, -1));
});
it("인증 hydration 중에는 조회하지 않는다", () => {
	mocks.isLoading = true;
	useSupabaseMemoByUrl("https://example.com");
	expect(mocks.useQuery.mock.lastCall?.[0].enabled).toBe(false);
	mocks.isLoading = false;
});
