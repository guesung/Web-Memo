import { hydrate, QueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import type { MemoSupabaseClient } from "@web-memo/shared/types";
import { createElement } from "react";
import { expect, it, vi } from "vitest";
import CategoryHydrationBoundary from "./CategoryHydrationBoundary";

const mocks = vi.hoisted(() => ({
	serverQueryClient: undefined as QueryClient | undefined,
}));

vi.mock("@src/utils", () => ({
	getQueryClient: () => mocks.serverQueryClient,
}));
vi.mock("@web-memo/shared/utils", () => ({
	CategoryService: class {
		constructor(private client: MemoSupabaseClient) {}
		getCategories = () =>
			this.client
				.schema("memo")
				.from("category")
				.select("*")
				.order("created_at", { ascending: false });
	},
}));

function categoryClient(fetchCategories: () => Promise<unknown>) {
	return {
		schema: () => ({
			from: () => ({
				select: () => ({ order: fetchCategories }),
			}),
		}),
	} as unknown as MemoSupabaseClient;
}

it("streams one pending category query to the common browser cache without a second fetch", async () => {
	let resolveCategory!: (value: { data: unknown[]; error: null }) => void;
	const fetchCategories = vi.fn(
		() =>
			new Promise<{ data: unknown[]; error: null }>((resolve) => {
				resolveCategory = resolve;
			}),
	);
	mocks.serverQueryClient = new QueryClient();
	mocks.serverQueryClient.setQueryData(["unrelated"], "other page cache");
	const browserQueryClient = new QueryClient();
	const children = createElement("main", null, "memo shell");

	const result = await CategoryHydrationBoundary({
		children,
		supabaseClient: categoryClient(fetchCategories),
	});
	const state = result.props.state;
	expect(result.props.children).toBe(children);
	expect(state.queries).toHaveLength(1);
	expect(state.queries[0].queryKey).toEqual(QUERY_KEY.category());
	expect(state.queries[0].state.status).toBe("pending");
	expect(state.queries[0].promise).toBeInstanceOf(Promise);
	expect(fetchCategories).toHaveBeenCalledTimes(1);

	hydrate(browserQueryClient, state);
	const browserResult = browserQueryClient.fetchQuery({
		queryKey: QUERY_KEY.category(),
		queryFn: fetchCategories,
		staleTime: 300_000,
	});
	expect(fetchCategories).toHaveBeenCalledTimes(1);
	resolveCategory({ data: [{ id: 1 }], error: null });
	expect(await browserResult).toEqual({ data: [{ id: 1 }], error: null });
	expect(browserQueryClient.getQueryData(QUERY_KEY.category())).toEqual({
		data: [{ id: 1 }],
		error: null,
	});
});

it("keeps an empty result separate from a Supabase error value", async () => {
	for (const value of [
		{ data: [], error: null },
		{ data: null, error: { message: "failure" } },
	]) {
		mocks.serverQueryClient = new QueryClient();
		const result = CategoryHydrationBoundary({
			children: null,
			supabaseClient: categoryClient(() => Promise.resolve(value)),
		});
		const browserQueryClient = new QueryClient();
		hydrate(browserQueryClient, result.props.state);
		expect(
			await browserQueryClient.fetchQuery({
				queryKey: QUERY_KEY.category(),
				queryFn: () => Promise.reject(new Error("duplicate fetch")),
				staleTime: 300_000,
			}),
		).toEqual(value);
	}
});

it("preserves a newer browser edit when an older server pending result arrives late", async () => {
	let resolveCategory!: (value: { data: unknown[]; error: null }) => void;
	const fetchCategories = vi.fn(
		() =>
			new Promise<{ data: unknown[]; error: null }>((resolve) => {
				resolveCategory = resolve;
			}),
	);
	mocks.serverQueryClient = new QueryClient();
	const state = CategoryHydrationBoundary({
		children: null,
		supabaseClient: categoryClient(fetchCategories),
	}).props.state;
	const browserQueryClient = new QueryClient();
	const editedCategory = { data: [{ id: 1, name: "edited" }], error: null };
	browserQueryClient.setQueryData(QUERY_KEY.category(), editedCategory, {
		updatedAt: Date.now() + 10_000,
	});

	hydrate(browserQueryClient, state);
	resolveCategory({ data: [{ id: 1, name: "old" }], error: null });
	await state.queries[0].promise;
	const browserFetch = vi.fn(() =>
		Promise.reject(new Error("duplicate fetch")),
	);
	expect(
		await browserQueryClient.fetchQuery({
			queryKey: QUERY_KEY.category(),
			queryFn: browserFetch,
			staleTime: 300_000,
		}),
	).toEqual(editedCategory);
	expect(browserQueryClient.getQueryData(QUERY_KEY.category())).toEqual(
		editedCategory,
	);
	expect(fetchCategories).toHaveBeenCalledTimes(1);
	expect(browserFetch).not.toHaveBeenCalled();
});

it("settles a rejected pending query instead of leaving the browser cache pending", async () => {
	let rejectCategory!: (error: Error) => void;
	mocks.serverQueryClient = new QueryClient();
	const result = CategoryHydrationBoundary({
		children: null,
		supabaseClient: categoryClient(
			() =>
				new Promise((_resolve, reject) => {
					rejectCategory = reject;
				}),
		),
	});
	const browserQueryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	hydrate(browserQueryClient, result.props.state);
	const browserResult = browserQueryClient.fetchQuery({
		queryKey: QUERY_KEY.category(),
		queryFn: () => Promise.reject(new Error("unexpected second fetch")),
	});
	rejectCategory(new Error("network failure"));
	await expect(browserResult).rejects.toThrow();
	expect(browserQueryClient.getQueryState(QUERY_KEY.category())?.status).toBe(
		"error",
	);
});
