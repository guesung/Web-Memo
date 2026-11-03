// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RetentionSection from "./RetentionSection";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const query = vi.hoisted(() => ({
	result: {} as Record<string, unknown>,
	refetch: vi.fn(),
}));

vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useMemoRetentionQuery: () => ({ ...query.result, refetch: query.refetch }),
}));
vi.mock("@web-memo/ui", () => ({
	Button: ({ children, onClick }: { children: string; onClick: () => void }) =>
		createElement("button", { type: "button", onClick }, children),
	Select: ({ children }: { children: React.ReactNode }) =>
		createElement("div", null, children),
	SelectTrigger: ({ children }: { children: React.ReactNode }) =>
		createElement("div", null, children),
	SelectValue: () => null,
	SelectContent: ({ children }: { children: React.ReactNode }) =>
		createElement("div", null, children),
	SelectItem: ({ children }: { children: React.ReactNode }) =>
		createElement("span", null, children),
	Skeleton: () => createElement("div", { "data-testid": "skeleton" }),
}));
vi.mock("./MemoRewriteRateChart", () => ({
	default: () => createElement("div", null, "rewrite-chart"),
}));
vi.mock("./ReturningWritersChart", () => ({
	default: () => createElement("div", null, "returning-chart"),
}));

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
	host = document.createElement("div");
	document.body.append(host);
	root = createRoot(host);
	query.refetch.mockClear();
});

afterEach(async () => {
	await act(async () => root.unmount());
	host.remove();
});

const renderSection = async () => {
	await act(async () =>
		root.render(createElement(RetentionSection, { lng: "ko" })),
	);
};

describe("admin retention states", () => {
	it("keeps loading distinct from zero data", async () => {
		query.result = { isPending: true, isError: false };
		await renderSection();
		expect(host.querySelectorAll('[data-testid="skeleton"]')).toHaveLength(2);
		expect(host.textContent).not.toContain("admin.retention.empty");
	});

	it("shows failure and retries the query", async () => {
		query.result = { isPending: false, isError: true };
		await renderSection();
		expect(host.querySelector('[role="alert"]')?.textContent).toContain(
			"admin.retention.error",
		);
		await act(async () => host.querySelector("button")?.click());
		expect(query.refetch).toHaveBeenCalledOnce();
	});

	it("shows empty only when neither metric has writers", async () => {
		query.result = {
			isPending: false,
			isError: false,
			data: { cohorts: [{ cohortSize: 0 }], returning: [{ users: 0 }] },
		};
		await renderSection();
		expect(host.textContent).toContain("admin.retention.empty");
		expect(host.textContent).not.toContain("rewrite-chart");
	});

	it("keeps charts visible when one metric is zero", async () => {
		query.result = {
			isPending: false,
			isError: false,
			data: { cohorts: [{ cohortSize: 0 }], returning: [{ users: 2 }] },
		};
		await renderSection();
		expect(host.textContent).toContain("rewrite-chart");
		expect(host.textContent).toContain("returning-chart");
	});
});
