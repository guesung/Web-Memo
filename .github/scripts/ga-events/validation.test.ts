// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { beforeEach, describe, expect, it, vi } from "vitest";

const gitOutputs = vi.hoisted(() => ({ value: {} }));

vi.mock("node:child_process", () => ({
	execFileSync: vi.fn((_command, args) => {
		const key = args.filter((arg) => arg !== "--" && arg !== "-U0" && !/^[a-f0-9]{40}$/.test(arg)).join(" ");

		return gitOutputs.value[key] ?? "";
	}),
}));
vi.mock("node:fs", async (importOriginal) => ({
	...(await importOriginal()),
	lstatSync: vi.fn(() => ({ isSymbolicLink: () => false })),
}));

import { MAX_EVENTS, TYPE_FILE, extractEventNames, isSourceFile, validateCandidate, validateChanges } from "./validation.mjs";

const BASE_SHA = "a".repeat(40);
const SOURCE_FILE = "apps/web/src/app/[lng]/(auth)/memos/_components/MemoItem.tsx";
const context = { existingEvents: ["memo_open"], trackedFiles: [SOURCE_FILE] };
const event = {
	name: "memo_share_click",
	category: "engagement",
	trigger: "메모 공유 버튼 클릭",
	question: "공유 기능이 쓰이는가",
	properties: ["source"],
	files: [SOURCE_FILE],
};
const gap = { status: "gap", reason: "공유 버튼에 이벤트가 없다", events: [event] };

describe("extractEventNames", () => {
	it("유니온 멤버와 호출부의 이름 리터럴을 모두 뽑는다", () => {
		expect(extractEventNames('| { name: "memo_open" }\nanalytics.trackEvent({ name: "login_start", params: {} })')).toEqual(["memo_open", "login_start"]);
	});
});

describe("isSourceFile", () => {
	it("제품 소스만 허용하고 테스트·타입·워크플로는 거절한다", () => {
		expect(isSourceFile(SOURCE_FILE)).toBe(true);
		expect(isSourceFile("apps/web/src/a.test.ts")).toBe(false);
		expect(isSourceFile(TYPE_FILE)).toBe(false);
		expect(isSourceFile(".github/workflows/ci.yml")).toBe(false);
		expect(isSourceFile("apps/web/src/../../secret.ts")).toBe(false);
	});
});

describe("validateCandidate", () => {
	it("누락 후보를 통과시킨다", () => {
		expect(validateCandidate(gap, context)).toEqual(gap);
	});

	it("누락이 없으면 이벤트 없이 통과한다", () => {
		const none = { status: "none", reason: "모두 측정 중", events: [] };

		expect(validateCandidate(none, context)).toEqual(none);
	});

	it.each([
		["이미 있는 이름", { ...event, name: "memo_open" }],
		["camelCase 이름", { ...event, name: "memoShare" }],
		["금지 속성", { ...event, properties: ["email"] }],
		["잘못된 분류", { ...event, category: "other" }],
		["추적하지 않는 파일", { ...event, files: ["apps/web/src/none.tsx"] }],
		["테스트 파일", { ...event, files: ["apps/web/src/a.test.ts"] }],
	])("%s는 거절한다", (_label, broken) => {
		expect(() => validateCandidate({ ...gap, events: [broken] }, context)).toThrow();
	});

	it("이벤트가 상한을 넘으면 거절한다", () => {
		const events = Array.from({ length: MAX_EVENTS + 1 }, (_, index) => ({ ...event, name: `memo_share_${index}` }));

		expect(() => validateCandidate({ ...gap, events }, context)).toThrow();
	});
});

describe("validateChanges", () => {
	const typeDiff = `+\t| { name: "memo_share_click"; params: { source: string } }\n+\tmemo_share_click: "engagement",`;
	const callDiff = `+\t\tanalytics.trackEvent({ name: "memo_share_click", params: { source: "card" } });`;
	const docDiff = "+| memo_share_click | 메모 공유 | `source` | 공유가 쓰이는가 | — |";
	const setOutputs = (overrides = {}) => {
		gitOutputs.value = {
			"ls-files --others --exclude-standard": "",
			"diff --name-status --no-renames": `M\t${SOURCE_FILE}\nM\t${TYPE_FILE}\nM\tdocs/events.md\nM\tdocs/analytics.md`,
			"diff --numstat": `4\t0\t${SOURCE_FILE}`,
			[`diff ${TYPE_FILE}`]: typeDiff,
			[`diff ${SOURCE_FILE}`]: callDiff,
			"diff docs/events.md": docDiff,
			"diff docs/analytics.md": docDiff,
			...overrides,
		};
	};

	beforeEach(() => {
		setOutputs();
	});

	it("후보와 정확히 일치하는 변경을 통과시킨다", () => {
		expect(validateChanges({ baseSha: BASE_SHA, candidate: gap })).toEqual([SOURCE_FILE, TYPE_FILE, "docs/events.md", "docs/analytics.md"]);
	});

	it("새 파일이 생기면 거절한다", () => {
		setOutputs({ "ls-files --others --exclude-standard": "apps/web/src/new.tsx" });

		expect(() => validateChanges({ baseSha: BASE_SHA, candidate: gap })).toThrow("기존 파일 수정만");
	});

	it("후보가 지정하지 않은 파일을 고치면 거절한다", () => {
		setOutputs({ "diff --name-status --no-renames": `M\t${SOURCE_FILE}\nM\t${TYPE_FILE}\nM\tdocs/events.md\nM\tdocs/analytics.md\nM\tapps/web/src/other.tsx` });

		expect(() => validateChanges({ baseSha: BASE_SHA, candidate: gap })).toThrow("지정하지 않은 파일");
	});

	it("기존 이벤트 정의를 지우면 거절한다", () => {
		setOutputs({ [`diff ${TYPE_FILE}`]: `${typeDiff}\n-\t| { name: "memo_open" }` });

		expect(() => validateChanges({ baseSha: BASE_SHA, candidate: gap })).toThrow("기존 이벤트 정의");
	});

	it("호출 위치가 없으면 거절한다", () => {
		setOutputs({ [`diff ${SOURCE_FILE}`]: "+\t\tconst isShared = true;" });

		expect(() => validateChanges({ baseSha: BASE_SHA, candidate: gap })).toThrow("호출 위치");
	});

	it("문서에 기록하지 않으면 거절한다", () => {
		setOutputs({ "diff docs/analytics.md": "+| 다른 줄 |" });

		expect(() => validateChanges({ baseSha: BASE_SHA, candidate: gap })).toThrow("docs/analytics.md");
	});

	it("위험한 코드가 섞이면 거절한다", () => {
		setOutputs({ [`diff ${SOURCE_FILE}`]: `${callDiff}\n+\tfetch("https://example.com");` });

		expect(() => validateChanges({ baseSha: BASE_SHA, candidate: gap })).toThrow("위험한 코드");
	});
});
