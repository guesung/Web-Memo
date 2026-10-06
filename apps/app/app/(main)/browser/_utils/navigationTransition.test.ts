import { describe, expect, it } from "vitest";
import {
	beginNavigation,
	cancelNavigation,
	createBrowserNavigationState,
	markNavigationLoadStart,
	reconcileNavigation,
} from "./navigationTransition";

describe("reconcileNavigation", () => {
	const oldUrl = "https://old.example/page";
	const newUrl = "https://new.example/page";
	const pending = beginNavigation(
		createBrowserNavigationState(oldUrl),
		oldUrl,
		newUrl,
	);

	it("저장된 탭의 URL을 첫 WebView source로 사용한다", () => {
		expect(createBrowserNavigationState(oldUrl)).toEqual({
			sourceUrl: oldUrl,
			revision: 0,
			pending: null,
		});
	});

	it("새 페이지가 시작되기 전에 도착한 이전 페이지 이벤트는 무시한다", () => {
		expect(reconcileNavigation(pending, oldUrl, false)).toEqual({
			accept: false,
			state: pending,
		});
		expect(reconcileNavigation(pending, oldUrl, true)).toEqual({
			accept: false,
			state: pending,
		});
	});

	it("초기 빈 문서 이벤트가 메모에서 연 페이지 URL을 덮어쓰지 못한다", () => {
		const fromEmptyTab = beginNavigation(
			createBrowserNavigationState(""),
			"",
			newUrl,
		);
		expect(reconcileNavigation(fromEmptyTab, "about:blank", false)).toEqual({
			accept: false,
			state: fromEmptyTab,
		});
	});

	it("새 문서가 시작돼도 늦은 이전 문서 완료 이벤트는 무시한다", () => {
		const redirected = reconcileNavigation(
			pending,
			"https://new.example/redirected",
			true,
		);
		expect(redirected.accept).toBe(true);
		expect(redirected.state.pending?.newDocumentStarted).toBe(true);
		expect(reconcileNavigation(redirected.state, oldUrl, false)).toEqual({
			accept: false,
			state: redirected.state,
		});
		expect(redirected.state.sourceUrl).toBe(newUrl);
	});

	it("새 페이지의 로드가 끝나면 일반 탐색 이벤트를 다시 받아들인다", () => {
		const completed = reconcileNavigation(pending, newUrl, false);
		expect(completed).toEqual({
			accept: true,
			state: { sourceUrl: newUrl, revision: 0, pending: null },
		});
		expect(reconcileNavigation(completed.state, oldUrl, false)).toEqual({
			accept: true,
			state: completed.state,
		});
	});

	it("리다이렉트와 이후 페이지 탐색이 앱의 source 요청을 다시 바꾸지 않는다", () => {
		const redirected = reconcileNavigation(
			pending,
			"https://new.example/redirected",
			false,
		);
		const linkedPage = reconcileNavigation(
			redirected.state,
			"https://another.example/linked",
			false,
		);
		expect(redirected.accept).toBe(true);
		expect(linkedPage.accept).toBe(true);
		expect(linkedPage.state.sourceUrl).toBe(newUrl);
	});

	it("요청 중 이전 URL로 정상 리다이렉트하면 로딩 시작과 완료를 받는다", () => {
		const started = markNavigationLoadStart(pending, newUrl);
		const redirectStart = reconcileNavigation(started, oldUrl, true);
		expect(redirectStart.accept).toBe(true);
		expect(redirectStart.state.pending?.returnStarted).toBe(true);
		const redirectEnd = reconcileNavigation(redirectStart.state, oldUrl, false);
		expect(redirectEnd).toEqual({
			accept: true,
			state: { sourceUrl: newUrl, revision: 0, pending: null },
		});
	});

	it("B에서 링크 C로 간 뒤 B를 다시 요청하면 WebView revision이 바뀐다", () => {
		const fromB = createBrowserNavigationState(newUrl);
		const linkedC = reconcileNavigation(
			fromB,
			"https://another.example/linked",
			false,
		);
		const reopenedB = beginNavigation(
			linkedC.state,
			"https://another.example/linked",
			newUrl,
		);
		expect(reopenedB.sourceUrl).toBe(newUrl);
		expect(reopenedB.revision).toBe(1);
	});

	it("새 URL 요청과 일반 WebView 링크 탐색은 revision을 바꾸지 않는다", () => {
		const requested = beginNavigation(
			createBrowserNavigationState(oldUrl),
			oldUrl,
			newUrl,
		);
		const linked = reconcileNavigation(
			requested,
			"https://another.example/linked",
			false,
		);
		expect(requested.revision).toBe(0);
		expect(linked.state.revision).toBe(0);
	});

	it("로드 오류가 나면 대기 중인 이전 URL 필터를 해제한다", () => {
		expect(cancelNavigation(pending)).toEqual({
			sourceUrl: newUrl,
			revision: 0,
			pending: null,
		});
	});

	it("같은 URL 요청과 로드 실패 후 재시도는 WebView를 다시 시작한다", () => {
		const initial = createBrowserNavigationState(newUrl);
		const firstRequest = beginNavigation(initial, newUrl, newUrl);
		const retry = beginNavigation(
			cancelNavigation(firstRequest),
			newUrl,
			newUrl,
		);
		expect(firstRequest.revision).toBe(1);
		expect(retry.revision).toBe(2);
	});
});
