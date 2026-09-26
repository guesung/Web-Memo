import { describe, expect, it } from "vitest";
import {
	createTestNamespace,
	isCleanupTarget,
	STALE_RESIDUE_AGE_MS,
} from "./namespace";

const RUN_ID = "100-1";
const OTHER_RUN_ID = "100-10";
const NOW = new Date("2026-09-24T12:00:00.000Z");

const ownNamespace = createTestNamespace({
	runId: RUN_ID,
	testId: "fileHash-testHash01",
});
const otherNamespace = createTestNamespace({
	runId: OTHER_RUN_ID,
	testId: "fileHash-testHash01",
});

/** 기준 시각에서 주어진 밀리초만큼 이전 시각을 ISO 문자열로 만든다. */
const createdBefore = (elapsedMs: number) =>
	new Date(NOW.getTime() - elapsedMs).toISOString();

describe("isCleanupTarget", () => {
	it("이번 실행 접두어의 항목은 만든 지 얼마 안 됐어도 고른다", () => {
		for (const value of [
			ownNamespace.memoUrl("a"),
			ownNamespace.categoryName("Badge"),
		]) {
			expect(
				isCleanupTarget({
					value,
					createdAt: createdBefore(0),
					runId: RUN_ID,
					now: NOW,
				}),
			).toBe(true);
		}
	});

	it("다른 실행의 항목은 24시간이 지나지 않았으면 고르지 않는다", () => {
		for (const value of [
			otherNamespace.memoUrl("a"),
			otherNamespace.categoryName("Badge"),
		]) {
			expect(
				isCleanupTarget({
					value,
					createdAt: createdBefore(60 * 1000),
					runId: RUN_ID,
					now: NOW,
				}),
			).toBe(false);
		}
	});

	it("E2E 접두어 항목은 24시간이 막 지났으면 고른다", () => {
		for (const value of [
			otherNamespace.memoUrl("a"),
			otherNamespace.categoryName("Badge"),
			"https://example.com/test-a-1700000000000",
			"E2E Category 1700000000000",
			"http://localhost:3000/en/memos",
		]) {
			expect(
				isCleanupTarget({
					value,
					createdAt: createdBefore(STALE_RESIDUE_AGE_MS + 1),
					runId: RUN_ID,
					now: NOW,
				}),
			).toBe(true);
		}
	});

	it("E2E 접두어 항목도 24시간이 되기 직전이면 고르지 않는다", () => {
		expect(
			isCleanupTarget({
				value: otherNamespace.memoUrl("a"),
				createdAt: createdBefore(STALE_RESIDUE_AGE_MS - 1),
				runId: RUN_ID,
				now: NOW,
			}),
		).toBe(false);
	});

	it("E2E 접두어가 없으면 얼마나 지났든 고르지 않는다", () => {
		for (const value of [
			"https://example.com/article",
			"http://localhost:3000/en/memos?view=list",
			"Work",
		]) {
			expect(
				isCleanupTarget({
					value,
					createdAt: createdBefore(STALE_RESIDUE_AGE_MS * 30),
					runId: RUN_ID,
					now: NOW,
				}),
			).toBe(false);
		}
	});
});
