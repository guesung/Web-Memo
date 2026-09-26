import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { COPY_TARGET_FILES } from "./copy-files.mjs";
import { checkCopyKeys } from "./check-copy-keys.mjs";

let repoRoot;

const writeAt = (relativePath, content) => {
	const fullPath = join(repoRoot, relativePath);
	mkdirSync(dirname(fullPath), { recursive: true });
	writeFileSync(fullPath, content);
};

const writeValidFixture = () => {
	writeAt(
		COPY_TARGET_FILES.web.ko,
		JSON.stringify({ common: { save: "저장" } }),
	);
	writeAt(
		COPY_TARGET_FILES.web.en,
		JSON.stringify({ common: { save: "Save" } }),
	);
	writeAt(
		COPY_TARGET_FILES.extension.ko,
		JSON.stringify({ toast_error_save: { message: "저장 실패" } }),
	);
	writeAt(
		COPY_TARGET_FILES.extension.en,
		JSON.stringify({ toast_error_save: { message: "Save failed" } }),
	);
};

afterEach(() => {
	if (repoRoot) {
		rmSync(repoRoot, { recursive: true, force: true });
	}
});

describe("checkCopyKeys", () => {
	it("정상 상태면 위반이 없다", async () => {
		repoRoot = mkdtempSync(join(tmpdir(), "copy-check-"));
		writeValidFixture();
		expect(await checkCopyKeys({ repoRoot })).toEqual([]);
	});
	it("ko/en 키 집합이 다르면 위반이다", async () => {
		repoRoot = mkdtempSync(join(tmpdir(), "copy-check-"));
		writeValidFixture();
		writeAt(
			COPY_TARGET_FILES.web.ko,
			JSON.stringify({ common: { save: "저장", close: "닫기" } }),
		);
		const violations = await checkCopyKeys({ repoRoot });
		expect(violations).toContain("web 키 'common.close'가 en에는 없습니다");
	});
	it("소스에서 쓰는 리터럴 키가 JSON에 없으면 위반이다", async () => {
		repoRoot = mkdtempSync(join(tmpdir(), "copy-check-"));
		writeValidFixture();
		writeAt(
			"apps/web/src/app/[lng]/(auth)/(sidebar)/memos/page.tsx",
			'function Page() { return <span>{t("common.missing")}</span>; }',
		);
		const violations = await checkCopyKeys({ repoRoot });
		expect(
			violations.some((v) => v.includes("웹 키 'common.missing'가 JSON에 없습니다")),
		).toBe(true);
	});
	it("웹 키 중 updates·privacy 아래 키는 존재로 인정한다", async () => {
		repoRoot = mkdtempSync(join(tmpdir(), "copy-check-"));
		writeAt(
			COPY_TARGET_FILES.web.ko,
			JSON.stringify({
				common: { save: "저장" },
				updates: { v1: { title: "제목" } },
			}),
		);
		writeAt(
			COPY_TARGET_FILES.web.en,
			JSON.stringify({
				common: { save: "Save" },
				updates: { v1: { title: "Title" } },
			}),
		);
		writeAt(
			COPY_TARGET_FILES.extension.ko,
			JSON.stringify({ toast_error_save: { message: "저장 실패" } }),
		);
		writeAt(
			COPY_TARGET_FILES.extension.en,
			JSON.stringify({ toast_error_save: { message: "Save failed" } }),
		);
		writeAt(
			"apps/web/src/app/[lng]/(no-auth)/updates/page.tsx",
			'function Page() { return <span>{t("updates.v1.title")}</span>; }',
		);
		const violations = await checkCopyKeys({ repoRoot });
		expect(violations.some((v) => v.includes("updates.v1.title"))).toBe(false);
	});
	it("확장 JSON 원문의 최상위 키 중복은 위반이다", async () => {
		repoRoot = mkdtempSync(join(tmpdir(), "copy-check-"));
		writeValidFixture();
		writeAt(
			COPY_TARGET_FILES.extension.ko,
			`{
				"toast_error_save": { "message": "저장 실패" },
				"toast_error_save": { "message": "중복" }
			}`,
		);
		const violations = await checkCopyKeys({ repoRoot });
		expect(
			violations.some((v) => v.includes("중복 키 'toast_error_save'")),
		).toBe(true);
	});
});
