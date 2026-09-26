import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { locateUsage, scanUsages } from "./scan-usages.mjs";

describe("locateUsage", () => {
	it("라우트 폴더 안이면 URL 경로 형식을 만든다", () => {
		expect(
			locateUsage("apps/web/src/app/[lng]/(auth)/(sidebar)/memos/setting/page.tsx"),
		).toBe("/memos/setting");
	});
	it("라우트 폴더 안 _components는 라우트 경로를 유지한다", () => {
		expect(
			locateUsage(
				"apps/web/src/app/[lng]/(auth)/(sidebar)/memos/setting/_components/Form.tsx",
			),
		).toBe("/memos/setting");
	});
	it("그룹 레벨 _components(라우트 세그먼트 없음)는 공용으로 라벨링한다", () => {
		expect(
			locateUsage("apps/web/src/app/[lng]/(no-auth)/_components/Hero.tsx"),
		).toBe(
			"공용 · apps/web/src/app/[lng]/(no-auth)/_components/Hero.tsx",
		);
	});
	it("app 밖 웹 파일은 공용으로 라벨링한다", () => {
		expect(locateUsage("apps/web/src/components/Button.tsx")).toBe(
			"공용 · apps/web/src/components/Button.tsx",
		);
	});
	it("루트 레이아웃은 슬래시 하나다", () => {
		expect(locateUsage("apps/web/src/app/[lng]/layout.tsx")).toBe("/");
	});
	it("확장 화면 폴더는 고정 라벨을 쓴다", () => {
		expect(locateUsage("pages/side-panel/src/components/Foo.tsx")).toBe(
			"side-panel",
		);
		expect(locateUsage("pages/content-ui/src/index.tsx")).toBe("content-ui");
		expect(locateUsage("pages/options/src/index.tsx")).toBe("options");
		expect(
			locateUsage("apps/chrome-extension/lib/background/index.ts"),
		).toBe("background");
		expect(locateUsage("apps/chrome-extension/manifest.js")).toBe("manifest");
	});
	it("packages/shared는 공용 라벨을 쓴다", () => {
		expect(locateUsage("packages/shared/src/utils/url.ts")).toBe(
			"공용 · packages/shared/src/utils/url.ts",
		);
	});
});

describe("scanUsages", () => {
	let repoRoot;

	afterEach(() => {
		if (repoRoot) {
			rmSync(repoRoot, { recursive: true, force: true });
		}
	});

	it("t·I18n.get·__MSG_x__ 리터럴을 앱별로 모은다", () => {
		repoRoot = mkdtempSync(join(tmpdir(), "copy-scan-"));
		const pagePath = join(
			repoRoot,
			"apps/web/src/app/[lng]/(auth)/(sidebar)/memos/setting",
		);
		mkdirSync(pagePath, { recursive: true });
		writeFileSync(
			join(pagePath, "page.tsx"),
			[
				'import useTranslation from "@src/modules/i18n/util.client";',
				"function Page() {",
				'  const { t } = useTranslation(lng);',
				'  return <span>{t(',
				'    "setting.title"',
				"  )}</span>;",
				"}",
			].join("\n"),
		);
		const sidePanelPath = join(repoRoot, "pages/side-panel/src/components");
		mkdirSync(sidePanelPath, { recursive: true });
		writeFileSync(
			join(sidePanelPath, "Toast.tsx"),
			'export const Toast = () => <p>{I18n.get("toast_error_save")}</p>;',
		);
		const extensionDir = join(repoRoot, "apps/chrome-extension");
		mkdirSync(extensionDir, { recursive: true });
		writeFileSync(
			join(extensionDir, "manifest.js"),
			'export default { name: "__MSG_extensionName__" };',
		);

		const usages = scanUsages({ repoRoot });

		expect(usages.web["setting.title"]).toEqual([
			{ file: "apps/web/src/app/[lng]/(auth)/(sidebar)/memos/setting/page.tsx", line: 4, location: "/memos/setting" },
		]);
		expect(usages.extension.toast_error_save).toEqual([
			{
				file: "pages/side-panel/src/components/Toast.tsx",
				line: 1,
				location: "side-panel",
			},
		]);
		expect(usages.extension.extensionName).toEqual([
			{ file: "apps/chrome-extension/manifest.js", line: 1, location: "manifest" },
		]);
	});
});
