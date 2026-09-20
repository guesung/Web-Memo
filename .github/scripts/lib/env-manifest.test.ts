import { describe, expect, it } from "vitest";

import {
	checkConsumers,
	checkDotenvFiles,
	checkReferences,
	collectReferences,
	extractReferences,
	isScannedFile,
	parseManifest,
	renderDocs,
	validateManifest,
	vercelEnvironments,
} from "./env-manifest.mjs";

const entry = (overrides: Record<string, unknown> = {}) => ({
	name: "SAMPLE_KEY",
	kind: "secret",
	stores: ["github"],
	consumers: [".github/workflows/ci.yml"],
	impact: "없으면 실패한다",
	note: "",
	required: true,
	...overrides,
});

describe("parseManifest", () => {
	it("목록·불리언·따옴표 값을 해석하고 기본값을 채운다", () => {
		const entries = parseManifest(
			[
				"# 주석은 무시한다",
				"",
				"- name: OPENAI_API_KEY",
				"  kind: secret",
				"  stores: [vercel:production, vercel:development]",
				"  consumers: [apps/web/a.ts]",
				'  impact: "AI 기능이 실패한다: 전부"',
				"  required: false",
				"",
				"- name: NODE_ENV",
				"  kind: platform",
				"  consumers: []",
			].join("\n"),
		);

		expect(entries).toHaveLength(2);
		expect(entries[0]).toMatchObject({
			name: "OPENAI_API_KEY",
			stores: ["vercel:production", "vercel:development"],
			impact: "AI 기능이 실패한다: 전부",
			required: false,
		});
		expect(entries[1]).toMatchObject({ stores: [], consumers: [], required: true });
	});

	it("해석할 수 없는 줄은 줄 번호와 함께 던진다", () => {
		expect(() => parseManifest("- name: A\n  kind secret")).toThrow("2번째 줄");
	});

	it("항목 밖의 필드와 알 수 없는 필드를 거절한다", () => {
		expect(() => parseManifest("  kind: secret")).toThrow("1번째 줄");
		expect(() => parseManifest("- name: A\n  owner: me")).toThrow("알 수 없는 필드");
	});

	it('따옴표 없는 값에 ": "가 있으면 진짜 YAML과 결과가 갈리므로 던진다', () => {
		expect(() => parseManifest("- name: A\n  impact: 없으면: 실패")).toThrow(
			"큰따옴표",
		);
	});
});

describe("validateManifest", () => {
	it("이름 중복과 알 수 없는 kind·store를 잡는다", () => {
		const errors = validateManifest([
			entry(),
			entry({ kind: "weird", stores: ["s3"] }),
		]);

		expect(errors.join("\n")).toContain("중복");
		expect(errors.join("\n")).toContain("kind는");
		expect(errors.join("\n")).toContain("알 수 없는 저장 위치 s3");
	});

	it("secret은 impact가, platform은 빈 stores가, flag는 note가 필요하다", () => {
		const errors = validateManifest([
			entry({ name: "A", impact: "" }),
			entry({ name: "B", kind: "platform", stores: ["github"] }),
			entry({ name: "C", kind: "flag", stores: ["vercel:preview"], consumers: [] }),
		]);

		expect(errors.join("\n")).toContain("A: 없으면 생기는 일");
		expect(errors.join("\n")).toContain("B: platform은");
		expect(errors.join("\n")).toContain("C: 코드가 읽지 않는 값");
	});

	it("flag가 아니면 읽는 곳이 있어야 한다", () => {
		expect(validateManifest([entry({ consumers: [] })]).join()).toContain(
			"consumers",
		);
	});

	it("정상 항목은 통과한다", () => {
		expect(validateManifest([entry()])).toEqual([]);
	});
});

describe("extractReferences", () => {
	it("코드의 네 가지 읽기 방식을 이름으로 뽑는다", () => {
		const names = extractReferences(
			"apps/web/a.ts",
			[
				"const a = process.env.ALPHA;",
				'const b = process.env["BETA"];',
				'const c = Deno.env.get("GAMMA");',
				'const d = requireServerEnv("DELTA");',
				"const e = import.meta.env.VITE_EPSILON;",
				"const f = import.meta.env.MODE;",
			].join("\n"),
		).map((reference) => reference.name);

		expect(names).toEqual(["ALPHA", "BETA", "VITE_EPSILON", "GAMMA", "DELTA"]);
	});

	it("워크플로는 secrets.* 만 보고 GITHUB_TOKEN은 뺀다", () => {
		const references = extractReferences(
			".github/workflows/ci.yml",
			"a: ${{ secrets.TURBO_TOKEN }}\nb: ${{ secrets.GITHUB_TOKEN }}\nc: ${{ env.BUILD_ENV }}",
		);

		expect(references).toEqual([{ name: "TURBO_TOKEN", source: "secrets" }]);
	});
});

describe("collectReferences", () => {
	it("테스트 파일과 .github/scripts는 대조 대상에서 뺀다", () => {
		expect(isScannedFile("apps/web/a.test.ts")).toBe(false);
		expect(isScannedFile(".github/scripts/report.mjs")).toBe(false);
		expect(isScannedFile("apps/web/a.ts")).toBe(true);
		expect(isScannedFile(".github/workflows/ci.yml")).toBe(true);

		const references = collectReferences([
			{ path: "apps/web/a.test.ts", content: "process.env.IN_TEST" },
			{ path: "apps/web/a.ts", content: "process.env.REAL" },
		]);

		expect([...references.keys()]).toEqual(["REAL"]);
	});
});

describe("checkReferences", () => {
	it("매니페스트에 없는 이름을 읽은 파일과 함께 알린다", () => {
		const references = collectReferences([
			{ path: "apps/web/a.ts", content: "process.env.MISSING_ONE" },
		]);

		expect(checkReferences({ entries: [], references })).toEqual([
			"MISSING_ONE: apps/web/a.ts에서 읽지만 .github/env-manifest.yml에 없습니다",
		]);
	});

	it("워크플로가 secrets로 읽는데 github로 적히지 않았으면 알린다", () => {
		const references = collectReferences([
			{ path: ".github/workflows/x.yml", content: "${{ secrets.SAMPLE_KEY }}" },
		]);

		expect(
			checkReferences({
				entries: [entry({ stores: ["vercel:production"] })],
				references,
			}).join(),
		).toContain("stores에 github가 없습니다");
	});
});

describe("checkConsumers", () => {
	const files: Record<string, string> = {
		".github/workflows/ci.yml": "${{ secrets.SAMPLE_KEY }}",
		"apps/web/a.ts": "no reference here",
	};
	const readFile = (path: string) => files[path] ?? null;

	it("소비처 파일이 없거나 이름을 안 담고 있으면 알린다", () => {
		const errors = checkConsumers({
			entries: [
				entry({ consumers: ["nope.ts", "apps/web/a.ts", ".github/workflows/ci.yml"] }),
			],
			readFile,
		});

		expect(errors.join("\n")).toContain("nope.ts 파일이 없습니다");
		expect(errors.join("\n")).toContain("apps/web/a.ts가 이 이름을 참조하지 않습니다");
		expect(errors).toHaveLength(2);
	});

	it("github에 등록한다면서 읽는 워크플로가 없으면 죽은 시크릿으로 본다", () => {
		files["apps/web/b.ts"] = "SAMPLE_KEY";

		expect(
			checkConsumers({
				entries: [entry({ consumers: ["apps/web/b.ts"] })],
				readFile,
			}).join(),
		).toContain("읽는 워크플로가 consumers에 없습니다");
	});
});

describe("checkDotenvFiles", () => {
	it("envpkg 선언과 .env.{환경} 키가 다르면 양방향으로 알린다", () => {
		const errors = checkDotenvFiles({
			entries: [entry({ name: "WEB_URL", stores: ["envpkg"] })],
			envpkgFiles: {
				"packages/env/.env.production": "WEB_URL=x\nEXTRA=1\n",
				"packages/env/.env.staging": "",
			},
		});

		expect(errors.join("\n")).toContain("EXTRA: packages/env/.env.production");
		expect(errors.join("\n")).toContain(
			"WEB_URL: 매니페스트는 envpkg라고 하지만 packages/env/.env.staging",
		);
		expect(errors).toHaveLength(2);
	});

	it("일치하면 통과한다", () => {
		expect(
			checkDotenvFiles({
				entries: [entry({ name: "WEB_URL", stores: ["envpkg"] })],
				envpkgFiles: { "packages/env/.env.development": "WEB_URL=http://localhost:3000\n" },
			}),
		).toEqual([]);
	});

	it("local 저장소는 더 이상 없다. 예전 선언은 알 수 없는 저장 위치로 걸린다", () => {
		expect(validateManifest([entry({ stores: ["local"] })]).join()).toContain(
			"알 수 없는 저장 위치 local",
		);
	});
});

describe("renderDocs", () => {
	const doc = "머리\n<!-- env-manifest:start -->\n낡은 표\n<!-- env-manifest:end -->\n꼬리\n";

	it("표식 사이만 생성한 목록으로 바꾸고 다시 돌려도 같다", () => {
		const once = renderDocs(doc, [entry()]);

		expect(once).toContain("머리");
		expect(once).toContain("꼬리");
		expect(once).not.toContain("낡은 표");
		expect(once).toContain("`SAMPLE_KEY`");
		expect(renderDocs(once, [entry()])).toBe(once);
	});

	it("Vercel 표에는 환경 열이, 선택 값에는 (선택) 표시가 붙는다", () => {
		const rendered = renderDocs(doc, [
			entry({
				name: "OPT",
				stores: ["vercel:production", "vercel:preview"],
				required: false,
			}),
		]);

		expect(rendered).toContain("| `OPT` (선택) | production, preview |");
	});

	it("표식이 없으면 조용히 넘어가지 않고 던진다", () => {
		expect(() => renderDocs("표식 없음", [entry()])).toThrow("표식이 필요합니다");
	});
});

describe("vercel 저장소 표기", () => {
	it("vercel은 세 환경 모두이고 vercel:<환경>은 그 환경만이다", () => {
		expect([...vercelEnvironments(["github", "vercel"])].sort()).toEqual([
			"development",
			"preview",
			"production",
		]);
		expect([...vercelEnvironments(["vercel:production", "vercel:preview"])].sort()).toEqual([
			"preview",
			"production",
		]);
		expect(vercelEnvironments(["github"]).size).toBe(0);
	});

	it("vercel과 vercel:<환경>을 함께 적으면 어느 쪽인지 모호하므로 알린다", () => {
		expect(
			validateManifest([entry({ stores: ["vercel", "vercel:production"] })]).join(),
		).toContain("함께 적을 수 없습니다");
	});

	it("문서 표의 환경 열은 세 환경이면 전체, 아니면 환경명을 적는다", () => {
		const doc = "<!-- env-manifest:start -->\n<!-- env-manifest:end -->\n";
		const rendered = renderDocs(doc, [
			entry({ name: "ALL_ENVS", stores: ["vercel"] }),
			entry({ name: "SOME_ENVS", stores: ["vercel:production", "vercel:preview"] }),
		]);

		expect(rendered).toContain("| `ALL_ENVS` | 전체 |");
		expect(rendered).toContain("| `SOME_ENVS` | production, preview |");
	});
});
