# 인턴/시니어 페르소나 AI 코드리뷰 워크플로우 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR에 인턴(이도현)·시니어(박성우) 두 AI 페르소나가 각자의 GitHub App 정체성으로 질문 코멘트를 달고, 작성자가 답변하면 각자 1회 재답변하며 그 결과를 코드 주석과 후속 작업 체크리스트로 남기는 로컬 실행 워크플로우를 만든다.

**Architecture:** 순수 로직(마커 파싱, 스레드 판별, PR 본문 섹션 갱신)을 테스트 가능한 TS 모듈로 분리하고, GitHub API 호출과 App 토큰 발급을 얇은 래퍼로 감싼 뒤, 단일 CLI 엔트리포인트(`cli.ts`)로 노출한다. Claude Code 슬래시 커맨드가 이 CLI를 호출한다. 상태는 GitHub 코멘트 본문의 HTML 주석 마커에만 저장하며 별도 DB·상태 파일을 두지 않는다.

**Tech Stack:** Node 24 (TypeScript 네이티브 실행, 타입 스트리핑), vitest, GitHub REST API, `node:crypto` (RS256 JWT). **런타임 의존성 추가 없음.**

**Spec:** `docs/superpowers/specs/2026-08-17-ai-review-personas-design.md`

## Global Constraints

모든 태스크에 암묵적으로 적용된다.

- **베이스 브랜치는 `master`.** `develop` 아님. diff 비교 기준은 `origin/master...HEAD`.
- **작업 브랜치**: `guesung/코드-리뷰-워크플로우-만들기` (이미 체크아웃됨). 새로 만들지 않는다.
- **Node 24 타입 스트리핑 제약**: `enum`, `namespace`, 생성자 파라미터 프로퍼티 사용 금지. 타입 전용 import는 반드시 `import type`.
- **컨벤션** (`~/.claude/conventions/frontend-typescript-convention.md`, `AGENTS.md`):
  - 모든 `export` 대상에 JSDoc
  - `interface`는 `IF` 접두사, `type`은 `T` 접두사
  - 상수 `UPPER_CASE`, 변수/함수/파일 `camelCase`
  - 화살표 함수, 반환 타입 명시, `async/await`(`then` 금지)
  - 인자 3개 이상은 객체로 받기
  - `if`는 항상 블록(`{}`) 사용
- **인덴트는 탭.** biome가 `scripts/`를 검사하지 않으므로(`biome.json`의 `files.includes`가 `**/src/**`, `**/app/**`, `e2e/tests/**` 한정) 수동으로 맞춘다.
- **테스트 실행**: `pnpm exec vitest run <경로>` (`pnpm test:jest`는 watch 모드라 CI/단발 검증에 부적합).
- **커밋 메시지는 한글**, commitlint conventional 규칙(`feat:`, `test:`, `docs:`, `chore:`) 준수. co-author 추가 금지.
- **마커 문자열은 스펙 §4.3 고정값**: `<!-- ai-review:{persona}:{kind} -->`, `<!-- ai-followup:start -->`, `<!-- ai-followup:end -->`.
- **레포는 public.** `*.pem`이 절대 커밋되면 안 된다.
- 대상 레포는 `guesung/web-memo` 고정.

---

## 파일 구조

| 파일 | 책임 |
|------|------|
| `scripts/ai-reviewer/markers.ts` | 마커 문자열 생성/파싱 (순수) |
| `scripts/ai-reviewer/threads.ts` | 리뷰 코멘트 → 스레드 복원 → 미답변 판별 (순수). **핵심 로직** |
| `scripts/ai-reviewer/followup.ts` | PR 본문의 후속 작업 마커 섹션 갱신 (순수) |
| `scripts/ai-reviewer/appToken.ts` | 봇 설정 로딩 + RS256 JWT + installation token 발급 |
| `scripts/ai-reviewer/github.ts` | GitHub REST API 호출 래퍼 |
| `scripts/ai-reviewer/cli.ts` | 단일 CLI 엔트리포인트 (`pending` / `post` / `followup` 서브커맨드) |
| `scripts/ai-reviewer/personas/intern.md` | 이도현 페르소나 프롬프트 |
| `scripts/ai-reviewer/personas/senior.md` | 박성우 페르소나 프롬프트 |
| `.claude/commands/ai-review.md` | `/ai-review` — 질문 생성 |
| `.claude/commands/ai-review-reply.md` | `/ai-review-reply` — 재답변 + 산출물 반영 |

의존 방향: `markers` ← `threads`, `markers` ← `cli`, `appToken` ← `github` ← `cli`, `followup` ← `cli`.

---

## Task 1: 마커 유틸

**Files:**
- Create: `scripts/ai-reviewer/markers.ts`
- Test: `scripts/ai-reviewer/markers.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type TPersona = "intern" | "senior"`
  - `interface IFMarker { persona: TPersona; kind: string }`
  - `buildMarker(marker: IFMarker): string`
  - `parseMarker(body: string): IFMarker | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ai-reviewer/markers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMarker, parseMarker } from "./markers.ts";

describe("buildMarker", () => {
	it("페르소나와 종류로 마커 문자열을 만든다", () => {
		expect(buildMarker({ persona: "intern", kind: "q3" })).toBe("<!-- ai-review:intern:q3 -->");
		expect(buildMarker({ persona: "senior", kind: "scan" })).toBe("<!-- ai-review:senior:scan -->");
	});
});

describe("parseMarker", () => {
	it("본문 끝의 마커를 파싱한다", () => {
		const body = "**이도현** · 인턴 개발자\n\n질문입니다.\n\n<!-- ai-review:intern:q1 -->";
		expect(parseMarker(body)).toEqual({ persona: "intern", kind: "q1" });
	});

	it("마커가 없으면 null을 반환한다", () => {
		expect(parseMarker("사람이 쓴 평범한 코멘트")).toBeNull();
	});

	it("ai-followup 마커는 우리 마커가 아니므로 null을 반환한다", () => {
		expect(parseMarker("<!-- ai-followup:start -->")).toBeNull();
	});

	it("알 수 없는 페르소나는 null을 반환한다", () => {
		expect(parseMarker("<!-- ai-review:manager:q1 -->")).toBeNull();
	});

	it("주석 내부 공백 변형을 허용한다", () => {
		expect(parseMarker("<!--ai-review:senior:reply-->")).toEqual({
			persona: "senior",
			kind: "reply",
		});
	});

	it("buildMarker 결과를 그대로 되읽는다", () => {
		const marker = { persona: "senior", kind: "q2" } as const;
		expect(parseMarker(`본문\n${buildMarker(marker)}`)).toEqual(marker);
	});
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer/markers.test.ts`
Expected: FAIL — `Failed to load ./markers.ts` (파일 없음)

- [ ] **Step 3: 최소 구현 작성**

`scripts/ai-reviewer/markers.ts`:

```ts
/** 리뷰 페르소나 식별자 */
export type TPersona = "intern" | "senior";

/** 봇 코멘트 본문에 삽입되는 마커 정보 */
export interface IFMarker {
	/** 어느 페르소나가 단 코멘트인지 */
	persona: TPersona;
	/** 코멘트 종류. 질문은 `q1`~`qN`, 재답변은 `reply`, 지적 요약은 `scan` */
	kind: string;
}

const MARKER_PATTERN = /<!--\s*ai-review:(intern|senior):([a-z0-9]+)\s*-->/;

/**
 * 마커 정보를 HTML 주석 문자열로 만든다.
 * @description 렌더링되지 않으므로 코멘트 본문 끝에 그대로 붙여 쓴다.
 */
export const buildMarker = (marker: IFMarker): string => {
	return `<!-- ai-review:${marker.persona}:${marker.kind} -->`;
};

/**
 * 코멘트 본문에서 마커를 찾아 파싱한다.
 * @description 봇 식별을 `user.login`이 아니라 이 마커로 하므로, App 이름을
 * 바꿔도 기존 스레드 식별이 깨지지 않는다. 마커가 없거나 형식이 다르면 null.
 */
export const parseMarker = (body: string): IFMarker | null => {
	const matched = body.match(MARKER_PATTERN);

	if (matched === null) {
		return null;
	}

	return { persona: matched[1] as TPersona, kind: matched[2] };
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer/markers.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add scripts/ai-reviewer/markers.ts scripts/ai-reviewer/markers.test.ts
git commit -m "feat: AI 리뷰 코멘트 마커 생성·파싱 유틸 추가"
```

---

## Task 2: 스레드 복원 및 미답변 판별

이 워크플로우의 핵심 로직이다. 스펙 §4.2의 3조건을 구현한다.

**Files:**
- Create: `scripts/ai-reviewer/threads.ts`
- Test: `scripts/ai-reviewer/threads.test.ts`

**Interfaces:**
- Consumes: `markers.ts` — `TPersona`, `parseMarker`
- Produces:
  - `interface IFReviewComment { id: number; in_reply_to_id?: number | null; body: string; path: string; line: number | null; user: { login: string }; created_at: string }`
  - `interface IFPendingThread { rootId: number; persona: TPersona; path: string; line: number | null; question: string; authorReply: string }`
  - `findPendingThreads({ comments, prAuthor }: { comments: IFReviewComment[]; prAuthor: string }): IFPendingThread[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ai-reviewer/threads.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { IFReviewComment } from "./threads.ts";
import { findPendingThreads } from "./threads.ts";

const PR_AUTHOR = "guesung";

const makeComment = (overrides: Partial<IFReviewComment> & { id: number }): IFReviewComment => {
	return {
		in_reply_to_id: null,
		body: "",
		path: "src/foo.ts",
		line: 10,
		user: { login: "lee-dohyun[bot]" },
		created_at: "2026-08-17T00:00:00Z",
		...overrides,
	};
};

describe("findPendingThreads", () => {
	it("작성자가 답변했고 봇이 아직 재답변하지 않은 스레드를 찾는다", () => {
		const comments = [
			makeComment({ id: 1, body: "이 코드 뭔가요?\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "캐시 때문입니다", user: { login: PR_AUTHOR } }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([
			{
				rootId: 1,
				persona: "intern",
				path: "src/foo.ts",
				line: 10,
				question: "이 코드 뭔가요?\n<!-- ai-review:intern:q1 -->",
				authorReply: "캐시 때문입니다",
			},
		]);
	});

	it("작성자 답변이 없으면 대상이 아니다 (조건 2)", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("작성자 답변 이후 같은 봇이 이미 답했으면 대상이 아니다 (조건 3 = 1턴 제한)", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
			makeComment({ id: 3, in_reply_to_id: 1, body: "이해했습니다\n<!-- ai-review:intern:reply -->" }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("봇 재답변 뒤에 작성자가 또 답글을 달아도 다시 대상이 되지 않는다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
			makeComment({ id: 3, in_reply_to_id: 1, body: "이해했습니다\n<!-- ai-review:intern:reply -->" }),
			makeComment({ id: 4, in_reply_to_id: 1, body: "추가로 한마디", user: { login: PR_AUTHOR } }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("루트가 봇 코멘트가 아니면 대상이 아니다 (조건 1)", () => {
		const comments = [
			makeComment({ id: 1, body: "사람이 단 리뷰 코멘트", user: { login: "other-dev" } }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("작성자가 여러 번 답변하면 마지막 답변을 사용한다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:senior:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "첫 답변", user: { login: PR_AUTHOR } }),
			makeComment({ id: 3, in_reply_to_id: 1, body: "정정합니다", user: { login: PR_AUTHOR } }),
		];

		const result = findPendingThreads({ comments, prAuthor: PR_AUTHOR });

		expect(result).toHaveLength(1);
		expect(result[0].authorReply).toBe("정정합니다");
		expect(result[0].persona).toBe("senior");
	});

	it("답글의 답글도 같은 스레드로 묶는다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "중간 답글" }),
			makeComment({ id: 3, in_reply_to_id: 2, body: "작성자 답변", user: { login: PR_AUTHOR } }),
		];

		const result = findPendingThreads({ comments, prAuthor: PR_AUTHOR });

		expect(result).toHaveLength(1);
		expect(result[0].rootId).toBe(1);
		expect(result[0].authorReply).toBe("작성자 답변");
	});

	it("다른 페르소나의 재답변은 조건 3을 만족시키지 않는다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
			makeComment({ id: 3, in_reply_to_id: 1, body: "끼어들기\n<!-- ai-review:senior:reply -->" }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toHaveLength(1);
	});

	it("여러 스레드를 동시에 처리한다", () => {
		const comments = [
			makeComment({ id: 1, body: "인턴 질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변1", user: { login: PR_AUTHOR } }),
			makeComment({ id: 3, path: "src/bar.ts", line: 20, body: "시니어 질문\n<!-- ai-review:senior:q1 -->" }),
			makeComment({ id: 4, in_reply_to_id: 3, body: "답변2", user: { login: PR_AUTHOR } }),
			makeComment({ id: 5, body: "미답변 질문\n<!-- ai-review:intern:q2 -->" }),
		];

		const result = findPendingThreads({ comments, prAuthor: PR_AUTHOR });

		expect(result.map((thread) => thread.rootId)).toEqual([1, 3]);
	});

	it("코멘트 순서가 뒤섞여 들어와도 id 오름차순으로 판단한다", () => {
		const comments = [
			makeComment({ id: 3, in_reply_to_id: 1, body: "이해했습니다\n<!-- ai-review:intern:reply -->" }),
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer/threads.test.ts`
Expected: FAIL — `Failed to load ./threads.ts`

- [ ] **Step 3: 최소 구현 작성**

`scripts/ai-reviewer/threads.ts`:

```ts
import type { TPersona } from "./markers.ts";
import { parseMarker } from "./markers.ts";

/** GitHub 리뷰 코멘트 중 이 워크플로우가 사용하는 필드만 추린 형태 */
export interface IFReviewComment {
	/** 코멘트 ID. GitHub에서 생성 순으로 증가한다 */
	id: number;
	/** 답글인 경우 대상 코멘트 ID. 루트 코멘트면 null 또는 undefined */
	in_reply_to_id?: number | null;
	body: string;
	path: string;
	/** 파일 내 라인 번호. outdated 코멘트는 null이 될 수 있다 */
	line: number | null;
	user: { login: string };
	created_at: string;
}

/** 재답변이 필요한 스레드 */
export interface IFPendingThread {
	/** 스레드 루트 코멘트 ID. 답글을 달 때 사용한다 */
	rootId: number;
	persona: TPersona;
	path: string;
	line: number | null;
	/** 봇이 처음 던진 질문 본문 (마커 포함) */
	question: string;
	/** 작성자가 마지막으로 남긴 답변 본문 */
	authorReply: string;
}

/**
 * 답글 체인을 거슬러 올라가 스레드 루트 코멘트 ID를 찾는다.
 * @description GitHub는 답글의 답글에 직전 코멘트 ID를 넣을 수 있으므로
 * 한 단계만 보면 같은 스레드를 놓친다. 순환 참조는 방문 집합으로 방어한다.
 */
const resolveRootId = ({
	comment,
	byId,
}: {
	comment: IFReviewComment;
	byId: Map<number, IFReviewComment>;
}): number => {
	const visited = new Set<number>();
	let current = comment;

	while (current.in_reply_to_id !== null && current.in_reply_to_id !== undefined) {
		if (visited.has(current.id)) {
			break;
		}

		visited.add(current.id);

		const parent = byId.get(current.in_reply_to_id);

		if (parent === undefined) {
			break;
		}

		current = parent;
	}

	return current.id;
};

/**
 * 재답변이 필요한 스레드를 찾는다.
 * @description 스펙 §4.2의 세 조건을 모두 만족하는 스레드만 반환한다.
 * 1) 루트가 봇 코멘트(마커 보유), 2) 작성자 답글 존재,
 * 3) 그 답글 이후 같은 페르소나의 답글 없음.
 * 조건 3이 1턴 제한을 구조적으로 보장하므로 별도 상태 저장이 필요 없다.
 */
export const findPendingThreads = ({
	comments,
	prAuthor,
}: {
	comments: IFReviewComment[];
	prAuthor: string;
}): IFPendingThread[] => {
	const sorted = [...comments].sort((left, right) => left.id - right.id);
	const byId = new Map(sorted.map((comment) => [comment.id, comment]));
	const repliesByRoot = new Map<number, IFReviewComment[]>();
	const roots: IFReviewComment[] = [];

	for (const comment of sorted) {
		const rootId = resolveRootId({ comment, byId });

		if (rootId === comment.id) {
			roots.push(comment);
			continue;
		}

		const bucket = repliesByRoot.get(rootId) ?? [];
		bucket.push(comment);
		repliesByRoot.set(rootId, bucket);
	}

	const pending: IFPendingThread[] = [];

	for (const root of roots) {
		const marker = parseMarker(root.body);

		if (marker === null) {
			continue;
		}

		const replies = repliesByRoot.get(root.id) ?? [];
		const authorReplies = replies.filter((reply) => reply.user.login === prAuthor);

		if (authorReplies.length === 0) {
			continue;
		}

		// 조건 3의 판정 기준은 작성자의 *첫* 답글이다. 마지막 답글로 판정하면
		// 봇이 답한 뒤 작성자가 답글을 더 달 때 1턴 제한이 깨진다 (스펙 §4.4).
		const firstAuthorIndex = replies.findIndex((reply) => reply.user.login === prAuthor);
		const hasBotReplyAfter = replies
			.slice(firstAuthorIndex + 1)
			.some((reply) => parseMarker(reply.body)?.persona === marker.persona);

		if (hasBotReplyAfter) {
			continue;
		}

		pending.push({
			rootId: root.id,
			persona: marker.persona,
			path: root.path,
			line: root.line,
			question: root.body,
			authorReply: authorReplies[authorReplies.length - 1].body,
		});
	}

	return pending;
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer/threads.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: 커밋**

```bash
git add scripts/ai-reviewer/threads.ts scripts/ai-reviewer/threads.test.ts
git commit -m "feat: 리뷰 스레드 복원 및 미답변 스레드 판별 로직 추가"
```

---

## Task 3: PR 본문 후속 작업 섹션 갱신

**Files:**
- Create: `scripts/ai-reviewer/followup.ts`
- Test: `scripts/ai-reviewer/followup.test.ts`

**Interfaces:**
- Consumes: 없음 (Task 1·2와 독립)
- Produces: `upsertFollowupSection({ body, items }: { body: string; items: string[] }): string`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ai-reviewer/followup.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { upsertFollowupSection } from "./followup.ts";

describe("upsertFollowupSection", () => {
	it("마커가 없으면 본문 끝에 섹션을 새로 만든다", () => {
		const result = upsertFollowupSection({
			body: "## 작업 내용\n\n메모 목록 캐시 개선",
			items: ["캐시 무효화 범위 축소"],
		});

		expect(result).toContain("## 작업 내용\n\n메모 목록 캐시 개선");
		expect(result).toContain("<!-- ai-followup:start -->");
		expect(result).toContain("- [ ] 캐시 무효화 범위 축소");
		expect(result).toContain("<!-- ai-followup:end -->");
	});

	it("마커 사이 구간만 교체하고 앞뒤 본문은 보존한다", () => {
		const body = [
			"## 작업 내용",
			"앞부분",
			"<!-- ai-followup:start -->",
			"## 🔭 후속 작업 (시니어 리뷰)",
			"",
			"- [ ] 기존 항목",
			"<!-- ai-followup:end -->",
			"## 참고",
			"뒷부분",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("## 작업 내용\n앞부분");
		expect(result).toContain("## 참고\n뒷부분");
		expect(result.match(/ai-followup:start/g)).toHaveLength(1);
	});

	it("기존 항목에 신규 항목을 누적한다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"## 🔭 후속 작업 (시니어 리뷰)",
			"",
			"- [ ] 기존 항목",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("- [ ] 기존 항목");
		expect(result).toContain("- [ ] 신규 항목");
	});

	it("이미 있는 항목은 중복 추가하지 않는다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [ ] 캐시 무효화 범위 축소",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["캐시 무효화 범위 축소"] });

		expect(result.match(/캐시 무효화 범위 축소/g)).toHaveLength(1);
	});

	it("체크 완료된 기존 항목의 상태를 보존한다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [x] 이미 처리한 항목",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("- [x] 이미 처리한 항목");
		expect(result).toContain("- [ ] 신규 항목");
	});

	it("체크 완료된 항목과 같은 내용이 신규로 들어와도 중복 추가하지 않는다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [x] 캐시 무효화 범위 축소",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["캐시 무효화 범위 축소"] });

		expect(result.match(/캐시 무효화 범위 축소/g)).toHaveLength(1);
		expect(result).toContain("- [x] 캐시 무효화 범위 축소");
	});

	it("start 마커만 있고 end가 없으면 덮어쓰지 않고 끝에 새로 만든다", () => {
		const body = "본문\n<!-- ai-followup:start -->\n- [ ] 손상된 섹션";

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("- [ ] 손상된 섹션");
		expect(result).toContain("<!-- ai-followup:end -->");
		expect(result).toContain("- [ ] 신규 항목");
	});

	it("items가 비면 본문을 그대로 반환한다", () => {
		const body = "## 작업 내용\n변경 없음";

		expect(upsertFollowupSection({ body, items: [] })).toBe(body);
	});

	it("빈 본문에도 섹션을 만든다", () => {
		const result = upsertFollowupSection({ body: "", items: ["항목"] });

		expect(result).toContain("- [ ] 항목");
	});
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer/followup.test.ts`
Expected: FAIL — `Failed to load ./followup.ts`

- [ ] **Step 3: 최소 구현 작성**

`scripts/ai-reviewer/followup.ts`:

```ts
const FOLLOWUP_START = "<!-- ai-followup:start -->";
const FOLLOWUP_END = "<!-- ai-followup:end -->";
const FOLLOWUP_HEADING = "## 🔭 후속 작업 (시니어 리뷰)";
const CHECKBOX_PATTERN = /^-\s\[([ xX])\]\s+(.*)$/;

/** 섹션 내부의 체크리스트 한 줄 */
interface IFChecklistItem {
	checked: boolean;
	text: string;
}

const parseChecklist = (section: string): IFChecklistItem[] => {
	const items: IFChecklistItem[] = [];

	for (const line of section.split("\n")) {
		const matched = line.trim().match(CHECKBOX_PATTERN);

		if (matched === null) {
			continue;
		}

		items.push({ checked: matched[1].toLowerCase() === "x", text: matched[2].trim() });
	}

	return items;
};

const renderSection = (items: IFChecklistItem[]): string => {
	const lines = items.map((item) => `- [${item.checked ? "x" : " "}] ${item.text}`);

	return [FOLLOWUP_START, FOLLOWUP_HEADING, "", ...lines, FOLLOWUP_END].join("\n");
};

/**
 * PR 본문의 후속 작업 마커 섹션을 갱신한다.
 * @description 마커 쌍이 온전하면 그 사이만 교체해 PR 템플릿 내용을 보존하고,
 * 마커가 없거나 한쪽만 있어 손상된 경우에는 덮어쓰지 않고 본문 끝에 새 섹션을 만든다.
 * 기존 항목은 체크 상태를 유지한 채 누적하며, 같은 문구는 중복 추가하지 않는다.
 */
export const upsertFollowupSection = ({
	body,
	items,
}: {
	body: string;
	items: string[];
}): string => {
	if (items.length === 0) {
		return body;
	}

	const startIndex = body.indexOf(FOLLOWUP_START);
	const endIndex = body.indexOf(FOLLOWUP_END);
	const isIntact = startIndex !== -1 && endIndex !== -1 && endIndex > startIndex;

	const existing = isIntact
		? parseChecklist(body.slice(startIndex + FOLLOWUP_START.length, endIndex))
		: [];

	const merged = [...existing];

	for (const text of items) {
		const trimmed = text.trim();

		if (merged.some((item) => item.text === trimmed)) {
			continue;
		}

		merged.push({ checked: false, text: trimmed });
	}

	const section = renderSection(merged);

	if (isIntact) {
		return body.slice(0, startIndex) + section + body.slice(endIndex + FOLLOWUP_END.length);
	}

	return body.length === 0 ? section : `${body.trimEnd()}\n\n${section}`;
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer/followup.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: 커밋**

```bash
git add scripts/ai-reviewer/followup.ts scripts/ai-reviewer/followup.test.ts
git commit -m "feat: PR 본문 후속 작업 섹션 갱신 로직 추가"
```

---

## Task 4: [사람이 수행] GitHub App 2개 생성 및 자격 증명 배치

**이 태스크는 브라우저 작업이 포함되어 에이전트가 대신 수행할 수 없다.** 사용자가 직접 진행한다.

**Files:**
- Create: `~/.config/web-memo-bots/config.json` (레포 밖)
- Create: `~/.config/web-memo-bots/lee-dohyun.pem` (레포 밖)
- Create: `~/.config/web-memo-bots/park-seongwoo.pem` (레포 밖)
- Modify: `.gitignore`

**Interfaces:**
- Produces: `~/.config/web-memo-bots/config.json` — 아래 스키마. Task 5의 `loadBotConfig`가 읽는다.

```json
{
	"repo": "guesung/web-memo",
	"prAuthor": "guesung",
	"bots": {
		"intern": {
			"displayName": "이도현",
			"role": "인턴 개발자",
			"appId": "1234567",
			"installationId": "89012345",
			"privateKeyPath": "~/.config/web-memo-bots/lee-dohyun.pem"
		},
		"senior": {
			"displayName": "박성우",
			"role": "시니어 개발자",
			"appId": "1234568",
			"installationId": "89012346",
			"privateKeyPath": "~/.config/web-memo-bots/park-seongwoo.pem"
		}
	}
}
```

- [ ] **Step 1: `.gitignore`에 pem 차단 규칙 추가**

`.gitignore` 맨 끝에 추가:

```gitignore

# AI 리뷰 봇 자격 증명 (절대 커밋 금지 — public 레포)
*.pem
```

- [ ] **Step 2: 차단 규칙 동작 확인**

```bash
touch /tmp/x.pem && cp /tmp/x.pem ./test.pem
git check-ignore -v test.pem
rm test.pem /tmp/x.pem
```

Expected: `.gitignore:<줄번호>:*.pem	test.pem` 출력 (무시되고 있음)

- [ ] **Step 3: GitHub App 2개 생성**

https://github.com/settings/apps/new 에서 2개를 만든다.

**앱 1 — 인턴**
- GitHub App name: `lee-dohyun` (전역 유일해야 하며, 이미 있으면 `lee-dohyun-webmemo` 등으로 변경)
- Homepage URL: `https://github.com/guesung/web-memo`
- Webhook: **Active 체크 해제** (로컬 실행이므로 웹훅 불필요)
- Repository permissions:
  - Pull requests: **Read and write**
  - Contents: **Read-only**
  - Metadata: **Read-only** (자동 선택됨)
- Where can this GitHub App be installed?: **Only on this account**

**앱 2 — 시니어**
- GitHub App name: `park-seongwoo` (동일 규칙)
- 나머지 설정은 앱 1과 동일

- [ ] **Step 4: 아바타 업로드**

각 App 설정 페이지의 **Display information → Upload a logo** 에서 서로 구분되는 이미지를 올린다.
PR 코멘트에서 두 봇을 시각적으로 구분하는 유일한 수단이다.

- [ ] **Step 5: private key 발급 및 배치**

각 App 설정 페이지 하단 **Private keys → Generate a private key** 로 `.pem` 파일을 받는다.

```bash
mkdir -p ~/.config/web-memo-bots
chmod 700 ~/.config/web-memo-bots
mv ~/Downloads/lee-dohyun.*.private-key.pem ~/.config/web-memo-bots/lee-dohyun.pem
mv ~/Downloads/park-seongwoo.*.private-key.pem ~/.config/web-memo-bots/park-seongwoo.pem
chmod 600 ~/.config/web-memo-bots/*.pem
```

- [ ] **Step 6: 레포에 설치하고 installation ID 확인**

각 App 설정 페이지의 **Install App** 에서 `guesung/web-memo` 만 선택해 설치한다.

설치 후 브라우저 주소창이 `https://github.com/settings/installations/<installationId>` 형태가 된다.
이 숫자가 `installationId`다. `appId`는 App 설정 페이지 상단 **About → App ID** 에 있다.

- [ ] **Step 7: config.json 작성**

위 Interfaces 절의 스키마대로 `~/.config/web-memo-bots/config.json` 을 만들고
실제 `appId`·`installationId` 값을 채운다.

```bash
chmod 600 ~/.config/web-memo-bots/config.json
```

- [ ] **Step 8: 커밋**

```bash
git add .gitignore
git commit -m "chore: AI 리뷰 봇 private key 커밋 차단 규칙 추가"
```

---

## Task 5: App 설정 로딩 및 installation token 발급

**Files:**
- Create: `scripts/ai-reviewer/appToken.ts`
- Test: `scripts/ai-reviewer/appToken.test.ts`

**Interfaces:**
- Consumes: `markers.ts` — `TPersona`; Task 4의 `~/.config/web-memo-bots/config.json`
- Produces:
  - `interface IFBotConfig { displayName: string; role: string; appId: string; installationId: string; privateKeyPath: string }`
  - `interface IFReviewerConfig { repo: string; prAuthor: string; bots: Record<TPersona, IFBotConfig> }`
  - `loadReviewerConfig(): IFReviewerConfig`
  - `buildAppJwt({ appId, privateKeyPem }: { appId: string; privateKeyPem: string }): string`
  - `issueInstallationToken(persona: TPersona): Promise<string>`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ai-reviewer/appToken.test.ts`:

```ts
import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildAppJwt } from "./appToken.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
	publicKeyEncoding: { type: "spki", format: "pem" },
	privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const decodeSegment = (segment: string): Record<string, unknown> => {
	return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
};

describe("buildAppJwt", () => {
	it("점으로 구분된 세 조각을 만든다", () => {
		const jwt = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey });

		expect(jwt.split(".")).toHaveLength(3);
	});

	it("RS256 헤더를 넣는다", () => {
		const [header] = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey }).split(".");

		expect(decodeSegment(header)).toEqual({ alg: "RS256", typ: "JWT" });
	});

	it("iss에 appId를 넣고 만료를 10분 이내로 둔다", () => {
		const [, payload] = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey }).split(".");
		const decoded = decodeSegment(payload) as { iss: string; iat: number; exp: number };

		expect(decoded.iss).toBe("1234567");
		expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(600);
		expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
	});

	it("개인키로 서명해 공개키로 검증된다", () => {
		const jwt = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey });
		const [header, payload, signature] = jwt.split(".");
		const verifier = createVerify("RSA-SHA256");
		verifier.update(`${header}.${payload}`);

		expect(verifier.verify(publicKey, signature, "base64url")).toBe(true);
	});

	it("본문이 변조되면 검증에 실패한다", () => {
		const jwt = buildAppJwt({ appId: "1234567", privateKeyPem: privateKey });
		const [header, , signature] = jwt.split(".");
		const forged = Buffer.from(JSON.stringify({ iss: "9999999" })).toString("base64url");
		const verifier = createVerify("RSA-SHA256");
		verifier.update(`${header}.${forged}`);

		expect(verifier.verify(publicKey, signature, "base64url")).toBe(false);
	});
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer/appToken.test.ts`
Expected: FAIL — `Failed to load ./appToken.ts`

- [ ] **Step 3: 최소 구현 작성**

`scripts/ai-reviewer/appToken.ts`:

```ts
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { TPersona } from "./markers.ts";

const CONFIG_PATH = resolve(homedir(), ".config/web-memo-bots/config.json");
const JWT_LIFETIME_SECONDS = 540;
const GITHUB_API_BASE = "https://api.github.com";

/** 봇 하나의 GitHub App 자격 정보 */
export interface IFBotConfig {
	/** 코멘트 서명에 쓰는 한글 이름 (예: 이도현) */
	displayName: string;
	/** 코멘트 서명에 쓰는 직급 (예: 인턴 개발자) */
	role: string;
	appId: string;
	installationId: string;
	/** private key 경로. `~` 확장을 지원한다 */
	privateKeyPath: string;
}

/** `~/.config/web-memo-bots/config.json` 전체 스키마 */
export interface IFReviewerConfig {
	/** `owner/repo` 형식 */
	repo: string;
	/** PR 작성자 GitHub 로그인. 미답변 스레드 판별에 쓴다 */
	prAuthor: string;
	bots: Record<TPersona, IFBotConfig>;
}

const expandHome = (path: string): string => {
	return path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : path;
};

/**
 * 봇 설정 파일을 읽어온다.
 * @description 파일이 없거나 필수 키가 비면 설정 방법을 안내하며 즉시 예외를 던진다.
 */
export const loadReviewerConfig = (): IFReviewerConfig => {
	let raw: string;

	try {
		raw = readFileSync(CONFIG_PATH, "utf8");
	} catch {
		throw new Error(
			`봇 설정 파일을 찾을 수 없습니다: ${CONFIG_PATH}\n` +
				"docs/superpowers/plans/2026-08-17-ai-review-personas.md 의 Task 4를 먼저 수행하세요.",
		);
	}

	const config = JSON.parse(raw) as IFReviewerConfig;

	for (const persona of ["intern", "senior"] as const) {
		if (config.bots?.[persona]?.appId === undefined) {
			throw new Error(`${CONFIG_PATH} 에 bots.${persona}.appId 가 없습니다.`);
		}
	}

	return config;
};

/**
 * GitHub App 인증용 JWT를 만든다.
 * @description GitHub는 만료를 10분 이내로 요구하므로 9분으로 둔다.
 * 서버 시계가 앞설 때를 대비해 iat를 60초 앞당긴다.
 */
export const buildAppJwt = ({
	appId,
	privateKeyPem,
}: {
	appId: string;
	privateKeyPem: string;
}): string => {
	const encode = (value: object): string => {
		return Buffer.from(JSON.stringify(value)).toString("base64url");
	};

	const issuedAt = Math.floor(Date.now() / 1000) - 60;
	const header = encode({ alg: "RS256", typ: "JWT" });
	const payload = encode({ iat: issuedAt, exp: issuedAt + JWT_LIFETIME_SECONDS, iss: appId });
	const signer = createSign("RSA-SHA256");
	signer.update(`${header}.${payload}`);

	return `${header}.${payload}.${signer.sign(privateKeyPem, "base64url")}`;
};

/**
 * 해당 페르소나 봇의 installation access token을 발급받는다.
 * @description 토큰 수명은 1시간이며 캐싱하지 않고 호출 시마다 새로 발급한다.
 */
export const issueInstallationToken = async (persona: TPersona): Promise<string> => {
	const config = loadReviewerConfig();
	const bot = config.bots[persona];
	const privateKeyPem = readFileSync(expandHome(bot.privateKeyPath), "utf8");
	const jwt = buildAppJwt({ appId: bot.appId, privateKeyPem });

	const response = await fetch(
		`${GITHUB_API_BASE}/app/installations/${bot.installationId}/access_tokens`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${jwt}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);

	if (!response.ok) {
		throw new Error(
			`${persona} 봇 토큰 발급 실패 (${response.status}): ${await response.text()}`,
		);
	}

	const body = (await response.json()) as { token: string };

	return body.token;
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer/appToken.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 실제 토큰 발급 검증 (Task 4 완료 필요)**

```bash
node --input-type=module -e "
import { issueInstallationToken } from './scripts/ai-reviewer/appToken.ts';
for (const persona of ['intern', 'senior']) {
  const token = await issueInstallationToken(persona);
  console.log(persona, token.slice(0, 8) + '...');
}
"
```

Expected: `intern ghs_xxxx...` / `senior ghs_xxxx...` 두 줄 출력.
401이면 `appId`나 private key가 잘못된 것이고, 404면 `installationId`가 잘못된 것이다.

- [ ] **Step 6: 커밋**

```bash
git add scripts/ai-reviewer/appToken.ts scripts/ai-reviewer/appToken.test.ts
git commit -m "feat: GitHub App installation token 발급 모듈 추가"
```

---

## Task 6: GitHub API 래퍼

**Files:**
- Create: `scripts/ai-reviewer/github.ts`
- Test: `scripts/ai-reviewer/github.test.ts`

**Interfaces:**
- Consumes: `markers.ts` — `TPersona`; `threads.ts` — `IFReviewComment`; `appToken.ts` — `issueInstallationToken`, `loadReviewerConfig`
- Produces:
  - `githubRequest({ persona, method, path, body }: { persona: TPersona; method: string; path: string; body?: unknown }): Promise<unknown>`
  - `listReviewComments(pullNumber: number): Promise<IFReviewComment[]>`
  - `getPullRequest(pullNumber: number): Promise<{ headSha: string; body: string }>`
  - `postReviewComment({ persona, pullNumber, path, line, body, commitSha }): Promise<void>`
  - `postReviewReply({ persona, pullNumber, rootId, body }): Promise<void>`
  - `postIssueComment({ persona, pullNumber, body }): Promise<void>`
  - `updatePullRequestBody({ persona, pullNumber, body }): Promise<void>`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/ai-reviewer/github.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { listReviewComments, postReviewReply } from "./github.ts";

vi.mock("./appToken.ts", () => {
	return {
		issueInstallationToken: async () => "ghs_test_token",
		loadReviewerConfig: () => {
			return {
				repo: "guesung/web-memo",
				prAuthor: "guesung",
				bots: {
					intern: { displayName: "이도현", role: "인턴 개발자" },
					senior: { displayName: "박성우", role: "시니어 개발자" },
				},
			};
		},
	};
});

const jsonResponse = (data: unknown): Response => {
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("listReviewComments", () => {
	it("페이지네이션을 따라가 모든 코멘트를 모은다", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }))))
			.mockResolvedValueOnce(jsonResponse([{ id: 101 }]));
		vi.stubGlobal("fetch", fetchMock);

		const comments = await listReviewComments(412);

		expect(comments).toHaveLength(101);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("Authorization 헤더에 발급받은 토큰을 넣는다", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
		vi.stubGlobal("fetch", fetchMock);

		await listReviewComments(412);

		const [, init] = fetchMock.mock.calls[0];
		expect(init.headers.Authorization).toBe("Bearer ghs_test_token");
	});
});

describe("postReviewReply", () => {
	it("루트 코멘트의 replies 엔드포인트로 POST 한다", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 999 }));
		vi.stubGlobal("fetch", fetchMock);

		await postReviewReply({ persona: "intern", pullNumber: 412, rootId: 77, body: "답글" });

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toContain("/repos/guesung/web-memo/pulls/412/comments/77/replies");
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body)).toEqual({ body: "답글" });
	});

	it("에러 응답이면 상태 코드를 담아 예외를 던진다", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 })),
		);

		await expect(
			postReviewReply({ persona: "intern", pullNumber: 412, rootId: 77, body: "답글" }),
		).rejects.toThrow(/404/);
	});
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer/github.test.ts`
Expected: FAIL — `Failed to load ./github.ts`

- [ ] **Step 3: 최소 구현 작성**

`scripts/ai-reviewer/github.ts`:

```ts
import { issueInstallationToken, loadReviewerConfig } from "./appToken.ts";
import type { TPersona } from "./markers.ts";
import type { IFReviewComment } from "./threads.ts";

const GITHUB_API_BASE = "https://api.github.com";
const PAGE_SIZE = 100;

/**
 * 지정한 페르소나 봇의 토큰으로 GitHub API를 호출한다.
 * @description 실패 시 상태 코드와 응답 본문을 포함한 예외를 던진다.
 */
export const githubRequest = async ({
	persona,
	method,
	path,
	body,
}: {
	persona: TPersona;
	method: string;
	path: string;
	body?: unknown;
}): Promise<unknown> => {
	const token = await issueInstallationToken(persona);

	const response = await fetch(`${GITHUB_API_BASE}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"Content-Type": "application/json",
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`GitHub API ${method} ${path} 실패 (${response.status}): ${await response.text()}`);
	}

	return response.json();
};

/**
 * PR의 리뷰 코멘트를 전부 가져온다.
 * @description 페이지당 100건씩 끝까지 순회한다. 읽기 전용이라 인턴 봇 토큰을 사용한다.
 */
export const listReviewComments = async (pullNumber: number): Promise<IFReviewComment[]> => {
	const { repo } = loadReviewerConfig();
	const collected: IFReviewComment[] = [];
	let page = 1;

	while (true) {
		const chunk = (await githubRequest({
			persona: "intern",
			method: "GET",
			path: `/repos/${repo}/pulls/${pullNumber}/comments?per_page=${PAGE_SIZE}&page=${page}`,
		})) as IFReviewComment[];

		collected.push(...chunk);

		if (chunk.length < PAGE_SIZE) {
			return collected;
		}

		page += 1;
	}
};

/** PR의 head 커밋 SHA와 본문을 가져온다 */
export const getPullRequest = async (
	pullNumber: number,
): Promise<{ headSha: string; body: string }> => {
	const { repo } = loadReviewerConfig();
	const pull = (await githubRequest({
		persona: "intern",
		method: "GET",
		path: `/repos/${repo}/pulls/${pullNumber}`,
	})) as { head: { sha: string }; body: string | null };

	return { headSha: pull.head.sha, body: pull.body ?? "" };
};

/**
 * 특정 파일·라인에 인라인 리뷰 코멘트를 단다.
 * @description `commitSha`가 현재 head와 다르면 GitHub이 422를 반환하므로
 * 호출 직전에 `getPullRequest`로 최신 SHA를 받아 넘긴다.
 */
export const postReviewComment = async ({
	persona,
	pullNumber,
	path,
	line,
	body,
	commitSha,
}: {
	persona: TPersona;
	pullNumber: number;
	path: string;
	line: number;
	body: string;
	commitSha: string;
}): Promise<void> => {
	const { repo } = loadReviewerConfig();

	await githubRequest({
		persona,
		method: "POST",
		path: `/repos/${repo}/pulls/${pullNumber}/comments`,
		body: { commit_id: commitSha, path, line, side: "RIGHT", body },
	});
};

/** 기존 리뷰 스레드에 답글을 단다 */
export const postReviewReply = async ({
	persona,
	pullNumber,
	rootId,
	body,
}: {
	persona: TPersona;
	pullNumber: number;
	rootId: number;
	body: string;
}): Promise<void> => {
	const { repo } = loadReviewerConfig();

	await githubRequest({
		persona,
		method: "POST",
		path: `/repos/${repo}/pulls/${pullNumber}/comments/${rootId}/replies`,
		body: { body },
	});
};

/**
 * PR에 일반 코멘트를 단다.
 * @description 리뷰 코멘트가 아니므로 미답변 스레드 판별 대상에서 자동 제외된다.
 * 시니어의 지적 요약 코멘트에 사용한다 (스펙 §5.3).
 */
export const postIssueComment = async ({
	persona,
	pullNumber,
	body,
}: {
	persona: TPersona;
	pullNumber: number;
	body: string;
}): Promise<void> => {
	const { repo } = loadReviewerConfig();

	await githubRequest({
		persona,
		method: "POST",
		path: `/repos/${repo}/issues/${pullNumber}/comments`,
		body: { body },
	});
};

/** PR 본문을 통째로 교체한다 */
export const updatePullRequestBody = async ({
	persona,
	pullNumber,
	body,
}: {
	persona: TPersona;
	pullNumber: number;
	body: string;
}): Promise<void> => {
	const { repo } = loadReviewerConfig();

	await githubRequest({
		persona,
		method: "PATCH",
		path: `/repos/${repo}/pulls/${pullNumber}`,
		body: { body },
	});
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer/github.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add scripts/ai-reviewer/github.ts scripts/ai-reviewer/github.test.ts
git commit -m "feat: GitHub API 호출 래퍼 추가"
```

---

## Task 7: CLI 엔트리포인트

**Files:**
- Create: `scripts/ai-reviewer/cli.ts`

**Interfaces:**
- Consumes: `markers.ts`, `threads.ts`, `followup.ts`, `appToken.ts`, `github.ts` 전체
- Produces: 세 서브커맨드. 슬래시 커맨드가 이 인터페이스에 의존한다.

```bash
node scripts/ai-reviewer/cli.ts pending --pr <번호>
#   → stdout: { "prAuthor": string, "threads": IFPendingThread[] }

node scripts/ai-reviewer/cli.ts post --pr <번호> --input <파일.json>
#   입력 파일: {
#     "questions": [{ "persona": "intern"|"senior", "path": string, "line": number, "body": string, "kind": string }],
#     "replies":   [{ "persona": "intern"|"senior", "rootId": number, "body": string }],
#     "scan":      { "persona": "senior", "body": string } | null
#   }
#   세 키 모두 선택. 없으면 빈 배열/null로 간주한다.

node scripts/ai-reviewer/cli.ts followup --pr <번호> --input <파일.json>
#   입력 파일: { "items": string[] }
```

- [ ] **Step 1: CLI 구현 작성**

`scripts/ai-reviewer/cli.ts`:

```ts
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadReviewerConfig } from "./appToken.ts";
import { upsertFollowupSection } from "./followup.ts";
import {
	getPullRequest,
	listReviewComments,
	postIssueComment,
	postReviewComment,
	postReviewReply,
	updatePullRequestBody,
} from "./github.ts";
import { buildMarker } from "./markers.ts";
import type { TPersona } from "./markers.ts";
import { findPendingThreads } from "./threads.ts";

interface IFQuestionInput {
	persona: TPersona;
	path: string;
	line: number;
	body: string;
	/** 마커 종류. 보통 `q1`, `q2`, ... */
	kind: string;
}

interface IFReplyInput {
	persona: TPersona;
	rootId: number;
	body: string;
}

interface IFPostInput {
	questions?: IFQuestionInput[];
	replies?: IFReplyInput[];
	scan?: { persona: TPersona; body: string } | null;
}

const readJsonFile = <TValue>(path: string): TValue => {
	return JSON.parse(readFileSync(path, "utf8")) as TValue;
};

const withMarker = ({
	body,
	persona,
	kind,
}: {
	body: string;
	persona: TPersona;
	kind: string;
}): string => {
	return `${body.trimEnd()}\n\n${buildMarker({ persona, kind })}`;
};

const runPending = async (pullNumber: number): Promise<void> => {
	const { prAuthor } = loadReviewerConfig();
	const comments = await listReviewComments(pullNumber);
	const threads = findPendingThreads({ comments, prAuthor });

	console.log(JSON.stringify({ prAuthor, threads }, null, 2));
};

const runPost = async ({
	pullNumber,
	inputPath,
}: {
	pullNumber: number;
	inputPath: string;
}): Promise<void> => {
	const input = readJsonFile<IFPostInput>(inputPath);
	const questions = input.questions ?? [];
	const replies = input.replies ?? [];

	if (questions.length > 0) {
		const { headSha } = await getPullRequest(pullNumber);

		for (const question of questions) {
			await postReviewComment({
				persona: question.persona,
				pullNumber,
				path: question.path,
				line: question.line,
				commitSha: headSha,
				body: withMarker({
					body: question.body,
					persona: question.persona,
					kind: question.kind,
				}),
			});
			console.error(`질문 게시: ${question.persona} ${question.path}:${question.line}`);
		}
	}

	for (const reply of replies) {
		await postReviewReply({
			persona: reply.persona,
			pullNumber,
			rootId: reply.rootId,
			body: withMarker({ body: reply.body, persona: reply.persona, kind: "reply" }),
		});
		console.error(`재답변 게시: ${reply.persona} 스레드 ${reply.rootId}`);
	}

	if (input.scan !== null && input.scan !== undefined) {
		await postIssueComment({
			persona: input.scan.persona,
			pullNumber,
			body: withMarker({ body: input.scan.body, persona: input.scan.persona, kind: "scan" }),
		});
		console.error("지적 요약 코멘트 게시");
	}
};

const runFollowup = async ({
	pullNumber,
	inputPath,
}: {
	pullNumber: number;
	inputPath: string;
}): Promise<void> => {
	const { items } = readJsonFile<{ items: string[] }>(inputPath);

	if (items.length === 0) {
		console.error("후속 작업 항목이 없어 PR 본문을 변경하지 않습니다.");
		return;
	}

	const { body } = await getPullRequest(pullNumber);
	const updated = upsertFollowupSection({ body, items });

	if (updated === body) {
		console.error("PR 본문에 변경할 내용이 없습니다.");
		return;
	}

	await updatePullRequestBody({ persona: "senior", pullNumber, body: updated });
	console.error(`후속 작업 ${items.length}건을 PR 본문에 반영했습니다.`);
};

const main = async (): Promise<void> => {
	const [subcommand] = process.argv.slice(2);
	const { values } = parseArgs({
		args: process.argv.slice(3),
		options: {
			pr: { type: "string" },
			input: { type: "string" },
		},
	});

	if (values.pr === undefined) {
		throw new Error("--pr <번호> 가 필요합니다.");
	}

	const pullNumber = Number(values.pr);

	if (Number.isNaN(pullNumber)) {
		throw new Error(`--pr 값이 숫자가 아닙니다: ${values.pr}`);
	}

	if (subcommand === "pending") {
		await runPending(pullNumber);
		return;
	}

	if (values.input === undefined) {
		throw new Error(`${subcommand} 서브커맨드에는 --input <파일.json> 이 필요합니다.`);
	}

	if (subcommand === "post") {
		await runPost({ pullNumber, inputPath: values.input });
		return;
	}

	if (subcommand === "followup") {
		await runFollowup({ pullNumber, inputPath: values.input });
		return;
	}

	throw new Error(`알 수 없는 서브커맨드: ${subcommand} (pending | post | followup)`);
};

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
```

- [ ] **Step 2: 인자 검증 동작 확인**

```bash
node scripts/ai-reviewer/cli.ts bogus --pr 1
```

Expected: `알 수 없는 서브커맨드: bogus (pending | post | followup)` 출력 후 exit code 1

```bash
node scripts/ai-reviewer/cli.ts pending
```

Expected: `--pr <번호> 가 필요합니다.` 출력 후 exit code 1

- [ ] **Step 3: 기존 테스트가 모두 통과하는지 확인**

Run: `pnpm exec vitest run scripts/ai-reviewer`
Expected: PASS (39 tests: markers 7, threads 14, followup 9, appToken 5, github 4)

- [ ] **Step 4: 커밋**

```bash
git add scripts/ai-reviewer/cli.ts
git commit -m "feat: AI 리뷰 CLI 엔트리포인트 추가"
```

---

## Task 8: 페르소나 프롬프트 + `/ai-review` 커맨드

**Files:**
- Create: `scripts/ai-reviewer/personas/intern.md`
- Create: `scripts/ai-reviewer/personas/senior.md`
- Create: `.claude/commands/ai-review.md`

**Interfaces:**
- Consumes: Task 7의 `cli.ts post` 입력 스키마
- Produces: `/ai-review [질문개수]` 슬래시 커맨드

- [ ] **Step 1: 인턴 페르소나 프롬프트 작성**

`scripts/ai-reviewer/personas/intern.md`:

```markdown
# 이도현 — 인턴 개발자

## 정체성

입사 6개월차 인턴 개발자. React/TypeScript 기본기는 있지만 이 프로젝트의
도메인(브라우저 확장, Supabase, TanStack Query 캐시 전략)은 아직 낯설다.
배우려는 의욕이 있고, 모르는 걸 모른다고 말하는 데 거리낌이 없다.

## 목적

**PR 작성자가 자기 코드의 의도를 언어로 설명하게 만드는 것.**
설명하는 과정에서 작성자 스스로 정리가 되고, 그 설명이 JSDoc으로 남는다.

## 절대 금지

- **코드 지적 금지.** "이건 버그 같은데요", "여기 타입이 안 맞아요" 류 일절 없음.
- **개선 제안 금지.** "이렇게 하면 더 좋을 것 같아요" 일절 없음.
- **아는 척 금지.** "아마 ~때문이겠지만", "제 생각엔 ~인 것 같은데" 로 시작하지 않는다.
  추측을 앞세우면 질문이 아니라 확인 요청이 된다.

6개월차가 시니어 코드를 지적하기 시작하면 페르소나가 무너지고,
작성자가 설명 대신 방어를 하게 되어 이 워크플로우의 목적이 사라진다.

## 질문 규칙

- 오직 **"왜 이렇게 하셨는지"** 만 묻는다.
- 코드를 읽고 **실제로 이해가 안 가는 지점**을 고른다. 형식적으로 채우지 않는다.
- 좋은 대상: 비직관적인 조건 분기, 이유가 안 보이는 상수/매직넘버,
  특이한 캐시 키 구성, 왜 이 위치에 있는지 모르겠는 로직, 우회처럼 보이는 코드.
- 나쁜 대상: 자명한 렌더링 코드, 단순 타입 정의, import 정리, 이름만 봐도 아는 함수.
- 한 질문은 **한 가지만** 묻는다. "그리고 이것도"로 묶지 않는다.
- 질문 하나는 2~4문장. 왜 헷갈렸는지 짧게 밝히고 묻는다.

## 톤

존댓말. 공손하지만 굽신대지 않는다. 이모지 쓰지 않는다.
"~여쭤봐도 될까요?", "~인지 궁금합니다", "~이 잘 이해가 안 갔습니다" 정도의 결.

## 출력 형식

각 질문의 `body`는 아래로 시작한다 (마커는 CLI가 자동으로 붙인다):

```
**이도현** · 인턴 개발자

(질문 본문)
```
```

- [ ] **Step 2: 시니어 페르소나 프롬프트 작성**

`scripts/ai-reviewer/personas/senior.md`:

```markdown
# 박성우 — 시니어 개발자

## 정체성

10년차 시니어 개발자. 프론트엔드 아키텍처와 상태 관리에 강하고,
장애를 여러 번 겪어봐서 "지금은 되지만 나중에 터지는" 코드를 잘 알아본다.
잔소리하지 않고 핵심만 짚는다.

## 목적

**PR 작성자가 놓친 케이스를 스스로 떠올리게 만드는 것.**
질문 단계에서 답을 줘 버리면 작성자가 생각할 기회가 사라진다.

## 질문 단계 규칙 (`/ai-review`)

- **답을 주지 않는다.** "이렇게 고치세요"가 아니라 **"X 상황에서는 어떻게 되나요?"** 로 묻는다.
- 좋은 대상: 경계 조건, 동시성/경쟁 상태, 에러 경로, 캐시 무효화 타이밍,
  데이터가 커졌을 때의 동작, 롤백 가능성, 다른 플랫폼(web/extension/app)과의 일관성.
- 나쁜 대상: 네이밍 취향, 포맷팅, 이미 컨벤션 검사로 잡히는 것(→ 지적 요약으로 보낸다).
- 한 질문은 **한 가지만** 묻는다.
- 질문 하나는 2~4문장. 어떤 상황을 떠올렸는지 밝히고 묻는다.

## 재답변 단계 규칙 (`/ai-review-reply`)

여기서는 **답을 준다.** 질문으로 작성자 생각을 먼저 끌어낸 뒤 그 위에 얹는 구조다.

- 작성자 답변을 먼저 인정하거나 반박한다. 두루뭉술하게 넘어가지 않는다.
- 수정이 필요하면 GitHub suggested change 블록으로 구체적인 코드를 제시한다.
- 작성자가 "의도한 것"이라고 답했고 그 근거가 타당하면 수긍하고 끝낸다.
  억지로 후속 작업을 만들지 않는다.

## 지적 요약 코멘트 규칙 (`/ai-review` 마지막)

질문과 **별개로**, 답변이 필요 없는 기계적 지적을 코멘트 1건에 모은다.

- 대상: 오타, 명백한 버그, `AGENTS.md` 컨벤션 위반(JSDoc 누락, 축약 변수명,
  `then` 사용, `if` 블록 미사용, 타입 접두사 누락 등).
- 각 항목은 `파일:라인 — 문제 (근거)` 한 줄.
- 지적할 게 없으면 이 코멘트를 아예 만들지 않는다. 빈 코멘트를 달지 않는다.
- 첫 줄에 "답변 안 하셔도 됩니다"를 명시한다.

## 톤

존댓말. 간결하고 단정적. 이모지 쓰지 않는다.
빈말 칭찬("좋은 PR이네요!")을 하지 않는다. 바로 본론으로 들어간다.

## 출력 형식

각 코멘트의 `body`는 아래로 시작한다 (마커는 CLI가 자동으로 붙인다):

```
**박성우** · 시니어 개발자

(본문)
```
```

- [ ] **Step 3: `/ai-review` 커맨드 작성**

`.claude/commands/ai-review.md`:

````markdown
---
description: 인턴(이도현)·시니어(박성우) 봇이 현재 PR에 질문 코멘트를 단다. 인자로 페르소나별 질문 개수를 줄 수 있다(기본 3).
---

현재 브랜치의 PR에 두 AI 페르소나 명의로 질문 코멘트를 게시한다.

## 인자

`$ARGUMENTS` — 페르소나별 질문 개수. 비어 있으면 **3**.

## 절차

### 1. PR 번호 확인

```bash
gh pr view --json number,author --jq '{number: .number, author: .author.login}'
```

PR이 없으면 중단하고 "먼저 `/pr`로 PR을 생성하세요"라고 안내한다.

### 2. 이미 질문이 달려 있는지 확인

```bash
node scripts/ai-reviewer/cli.ts pending --pr <번호>
```

`threads`가 비어 있지 않으면 이미 진행 중인 스레드가 있다는 뜻이다.
사용자에게 알리고, 그래도 새 질문을 추가할지 확인받는다.

### 3. 변경 내역 수집

```bash
git diff origin/master...HEAD --stat
git diff origin/master...HEAD
```

**베이스는 `master`다. `develop` 아님.**

### 4. 컨텍스트 수집 (로컬 실행의 핵심 이점)

diff만 보고 질문하면 뻔한 질문이 나온다. 반드시 아래를 함께 읽는다.

- 변경된 파일들의 **전체 내용** (diff 조각이 아니라 파일 전체)
- 새로 추가/수정된 함수·훅의 **주요 호출부** (Grep으로 찾는다)
- `AGENTS.md` — 프로젝트 컨벤션
- 변경 파일이 속한 패키지의 인접 파일 (기존 패턴 파악용)

### 5. 페르소나 프롬프트 로딩

`scripts/ai-reviewer/personas/intern.md` 와 `scripts/ai-reviewer/personas/senior.md`
를 Read로 읽고 각 규칙을 정확히 따른다.

### 6. 질문 생성

**두 페르소나의 질문을 한 번에 생각한다.** 따로 생성하면 같은 코드에 대해
중복 질문이 나온다.

- 인턴 질문 N개, 시니어 질문 N개 (N = 1단계의 인자, 기본 3)
- 각 질문은 서로 다른 위치를 가리킨다
- `line`은 **diff에서 실제로 추가/변경된 라인**이어야 한다. 변경되지 않은
  라인을 지정하면 GitHub이 422를 반환한다
- 정말 물어볼 게 없으면 개수를 채우지 않는다. 형식적 질문은 워크플로우를 죽인다

시니어의 지적 요약도 함께 만든다 (없으면 `scan`을 `null`로 둔다).

### 7. 입력 파일 작성 후 게시

`.git/ai-review-input.json` 에 아래 형태로 쓴다. (`.git/` 안이라 커밋되지 않는다)

```json
{
	"questions": [
		{
			"persona": "intern",
			"path": "packages/shared/src/hooks/useMemoQuery.ts",
			"line": 34,
			"kind": "q1",
			"body": "**이도현** · 인턴 개발자\n\n(질문 본문)"
		}
	],
	"scan": {
		"persona": "senior",
		"body": "**박성우** · 시니어 개발자\n\n질문과 별개로 눈에 띈 것들입니다. 답변 안 하셔도 됩니다.\n\n- `파일:라인` — 내용"
	}
}
```

`kind`는 페르소나별로 `q1`부터 순번을 매긴다.

```bash
node scripts/ai-reviewer/cli.ts post --pr <번호> --input .git/ai-review-input.json
```

### 8. 결과 보고

게시된 질문을 페르소나별로 나열하고, PR URL을 함께 출력한다.
사용자에게 "GitHub에서 답변한 뒤 `/ai-review-reply`를 실행하세요"라고 안내한다.

## 주의

- 게시 실패 시 어떤 질문이 실패했는지 그대로 보고한다. 조용히 넘어가지 않는다.
- 422 오류는 대부분 `line`이 diff 범위 밖인 경우다. 해당 질문의 라인을 고쳐 재시도한다.
````

- [ ] **Step 4: 커맨드 인식 확인**

Claude Code 세션에서 `/ai-review`를 입력했을 때 커맨드 목록에 나타나는지 확인한다.
(파일 저장 즉시 인식된다. 인식되지 않으면 frontmatter 형식을 확인한다.)

- [ ] **Step 5: 커밋**

```bash
git add scripts/ai-reviewer/personas .claude/commands/ai-review.md
git commit -m "feat: 인턴·시니어 페르소나 프롬프트와 /ai-review 커맨드 추가"
```

---

## Task 9: `/ai-review-reply` 커맨드

**Files:**
- Create: `.claude/commands/ai-review-reply.md`

**Interfaces:**
- Consumes: Task 7의 `cli.ts pending` 출력 스키마, `cli.ts post` / `cli.ts followup` 입력 스키마; Task 8의 페르소나 프롬프트
- Produces: `/ai-review-reply` 슬래시 커맨드

- [ ] **Step 1: 커맨드 작성**

`.claude/commands/ai-review-reply.md`:

````markdown
---
description: 내가 답변한 AI 리뷰 스레드에 인턴·시니어가 1회 재답변하고, 결과를 코드 주석 제안과 후속 작업 체크리스트로 남긴다.
---

내가 답변한 리뷰 스레드를 찾아 각 봇이 재답변하고 산출물을 반영한다.

## 절차

### 1. PR 번호 확인

```bash
gh pr view --json number --jq .number
```

### 2. 미답변 스레드 조회

```bash
node scripts/ai-reviewer/cli.ts pending --pr <번호>
```

출력 형태:

```json
{
	"prAuthor": "guesung",
	"threads": [
		{
			"rootId": 123456,
			"persona": "intern",
			"path": "packages/shared/src/hooks/useMemoQuery.ts",
			"line": 34,
			"question": "...",
			"authorReply": "..."
		}
	]
}
```

`threads`가 비어 있으면 "재답변할 스레드가 없습니다"라고 안내하고 종료한다.
아직 답변하지 않았거나, 이미 봇이 답한 상태다.

### 3. 코드 컨텍스트 읽기

각 스레드의 `path` 파일을 **전체** 읽는다. 질문 당시와 코드가 달라졌을 수 있으므로
`line` 주변만 보지 않는다.

### 4. 페르소나 프롬프트 로딩

`scripts/ai-reviewer/personas/intern.md`, `scripts/ai-reviewer/personas/senior.md`
를 Read로 읽는다. **재답변 단계 규칙**을 적용한다.

### 5. 재답변 생성 (전체를 한 번에)

모든 스레드를 한 번에 읽고 답한다. 스레드 하나씩 처리하면 서로 모순되는 답이 나온다.

**인턴 스레드** — 이해한 내용을 요약하고, 작성자 설명을 JSDoc으로 정리해
suggested change 블록으로 제안한다.

````
**이도현** · 인턴 개발자

아 캐시 무효화 때문이었군요. 이해했습니다!
나중에 저 같은 사람이 또 헷갈릴 것 같아서 설명해주신 걸 주석으로 정리해봤는데 맞을까요?

```suggestion
/**
 * 메모 목록 쿼리
 * @description 태그 필터 변경 시에도 캐시를 유지하기 위해 queryKey에서 tag를 제외한다.
 */
export const useMemoListQuery = ...
```
````

**suggestion 블록의 필수 조건**: 코멘트가 달린 라인의 코드를 **정확히** 교체해야 한다.
- 현재 파일에서 해당 라인의 실제 내용을 확인한다
- 라인이 어긋났거나 코드가 바뀌었으면 **suggestion 없이** 일반 답글만 단다
  (스펙 §6.2의 폴백)
- JSDoc은 `AGENTS.md` 컨벤션을 따른다

**시니어 스레드** — 작성자 답변을 인정하거나 반박하고, 필요하면 구체적 개선안을
suggestion으로 제시한다.

### 6. 후속 작업 항목 추출

시니어 스레드 중 **작성자가 문제를 인정한 것만** 후속 작업으로 뽑는다.

- 인정한 경우("아 그건 놓쳤네요", "고쳐야겠네요") → 항목 추가
- 의도적이라고 답했고 근거가 타당한 경우 → **추가하지 않는다**

각 항목은 한 줄로, 스레드를 찾아갈 수 있게 파일명을 포함한다.
예: `useMemoQuery.ts 캐시 무효화 범위 축소`

### 7. 게시

`.git/ai-review-reply.json`:

```json
{
	"replies": [
		{ "persona": "intern", "rootId": 123456, "body": "**이도현** · 인턴 개발자\n\n..." }
	]
}
```

```bash
node scripts/ai-reviewer/cli.ts post --pr <번호> --input .git/ai-review-reply.json
```

후속 작업이 있으면 `.git/ai-review-followup.json`:

```json
{ "items": ["useMemoQuery.ts 캐시 무효화 범위 축소"] }
```

```bash
node scripts/ai-reviewer/cli.ts followup --pr <번호> --input .git/ai-review-followup.json
```

후속 작업이 하나도 없으면 이 명령을 실행하지 않는다.

### 8. 결과 보고

- 재답변한 스레드 수와 페르소나
- suggestion을 제안한 스레드와, 폴백한 스레드(이유 포함)
- PR 본문에 추가된 후속 작업 항목
- PR URL

## 주의

- **1턴 제한.** 각 스레드에 봇은 한 번만 답한다. `pending`이 이미 이를 보장하므로
  같은 스레드를 두 번 처리하려 하지 않는다.
- 이 커맨드를 다시 실행해도 이미 답한 스레드는 조회되지 않는다. 정상 동작이다.
````

- [ ] **Step 2: 커맨드 인식 확인**

Claude Code 세션에서 `/ai-review-reply`가 커맨드 목록에 나타나는지 확인한다.

- [ ] **Step 3: 커밋**

```bash
git add .claude/commands/ai-review-reply.md
git commit -m "feat: /ai-review-reply 커맨드 추가"
```

---

## Task 10: 전체 워크플로우 검증

Task 4(GitHub App 생성)와 Task 9까지 완료된 뒤 수행한다.
실제 PR에 코멘트가 달리므로 **검증 전용 PR을 따로 만든다.**

**Files:**
- Modify: `docs/superpowers/specs/2026-08-17-ai-review-personas-design.md` (검증 결과 반영이 필요한 경우)

- [ ] **Step 1: 검증용 PR 생성**

> **베이스 브랜치 주의.** 검증 브랜치는 `master`가 아니라 **작업 브랜치에서 분기**한다.
> `master`에는 Task 1~9의 `scripts/ai-reviewer/`가 없어 `/ai-review`가 실행되지 않는다.
> PR base도 작업 브랜치로 두어야 diff에 리뷰어 코드가 섞이지 않는다.

```bash
WORK_BRANCH=guesung/코드-리뷰-워크플로우-만들기
git checkout "$WORK_BRANCH"
git push -u origin "$WORK_BRANCH"   # PR base로 쓰려면 원격에 있어야 한다
git checkout -b guesung/ai-review-smoke-test
```

의도적으로 질문거리가 있는 파일을 하나 만든다 (매직넘버 + JSDoc 누락 + 비직관적 조건):

`packages/shared/src/utils/smokeTest.ts`:

```ts
export const calculateRetryDelay = (attempt: number): number => {
	if (attempt > 7) {
		return 30000;
	}

	return Math.min(1000 * 2 ** attempt, 30000);
};
```

```bash
git add packages/shared/src/utils/smokeTest.ts
git commit -m "test: AI 리뷰 워크플로우 검증용 임시 파일 추가"
git push -u origin guesung/ai-review-smoke-test
gh pr create --base "$WORK_BRANCH" --title "test: AI 리뷰 워크플로우 검증" --body "검증 후 닫습니다."
```

**이 검증 한정으로 `/ai-review`의 diff 기준을 바꾼다.** 커맨드는 기본적으로
`origin/master...HEAD`를 쓰지만, 이 PR은 base가 작업 브랜치이므로 실행 시
`git diff origin/guesung/코드-리뷰-워크플로우-만들기...HEAD`를 쓰도록 지시한다.
그래야 diff가 `smokeTest.ts` 한 파일로 좁혀지고, 리뷰어 자기 코드가 섞이지 않는다.

- [ ] **Step 2: `/ai-review` 실행 및 확인**

Claude Code에서 `/ai-review 2` 실행 후 PR에서 확인한다.

| 확인 항목 | 기대 결과 |
|-----------|-----------|
| 인턴 코멘트 작성자 | `lee-dohyun[bot]` + 인턴 아바타 |
| 시니어 코멘트 작성자 | `park-seongwoo[bot]` + 시니어 아바타 |
| 본문 첫 줄 | `**이도현** · 인턴 개발자` / `**박성우** · 시니어 개발자` |
| 코멘트 위치 | 지정한 파일의 지정한 라인에 인라인으로 달림 |
| 마커 | 렌더링된 화면에 보이지 않음 (raw에는 존재) |
| 인턴 질문 성격 | 지적·제안 없이 "왜 이렇게 했는지"만 물음 |
| 시니어 질문 성격 | 답을 주지 않고 되물음 |
| 지적 요약 | 별도 **일반 코멘트**로 달림 (인라인 아님) |

- [ ] **Step 3: 지적 요약이 재답변 대상에서 제외되는지 확인**

지적 요약 코멘트에 아무 답글이나 단 뒤:

```bash
node scripts/ai-reviewer/cli.ts pending --pr <번호>
```

Expected: 지적 요약 스레드가 `threads`에 **포함되지 않음**
(일반 코멘트라 `/pulls/{n}/comments`에 잡히지 않는다)

- [ ] **Step 4: 답변 후 `/ai-review-reply` 실행**

GitHub 웹에서 인턴 질문 1개, 시니어 질문 1개에 답변한다.
시니어 질문 중 하나는 **"아 그건 놓쳤네요"** 로 인정하는 답변을 단다 (후속 작업 반영 확인용).

```bash
node scripts/ai-reviewer/cli.ts pending --pr <번호>
```

Expected: 답변한 2개 스레드만 `threads`에 나타남

Claude Code에서 `/ai-review-reply` 실행 후 확인한다.

| 확인 항목 | 기대 결과 |
|-----------|-----------|
| 재답변 작성자 | 원 질문과 같은 봇 |
| 인턴 재답변 | JSDoc suggestion 블록 포함, GitHub에서 "Commit suggestion" 버튼 표시 |
| 시니어 재답변 | 작성자 답변에 대한 인정/반박 포함 |
| PR 본문 | `## 🔭 후속 작업 (시니어 리뷰)` 섹션 생성, 인정한 항목만 포함 |
| PR 템플릿 내용 | 손상 없이 보존됨 |

- [ ] **Step 5: 1턴 제한 확인**

`/ai-review-reply` 를 **한 번 더** 실행한다.

Expected: "재답변할 스레드가 없습니다" 출력. 중복 코멘트가 달리지 않음.

이어서 봇 재답변 아래에 작성자 답글을 하나 더 단 뒤 재실행한다.

Expected: 여전히 "재답변할 스레드가 없습니다" (스펙 §4.4의 의도된 동작)

- [ ] **Step 6: suggestion 폴백 확인**

답변하지 않은 나머지 질문이 가리키는 라인의 코드를 수정하고 push 한 뒤,
그 질문에 답변하고 `/ai-review-reply`를 실행한다.

Expected: suggestion 블록 없이 일반 답글만 달림. 커맨드 출력에 폴백 사유가 보고됨.

- [ ] **Step 7: 정리**

```bash
gh pr close <번호> --delete-branch
git checkout guesung/코드-리뷰-워크플로우-만들기
```

- [ ] **Step 8: 검증 결과 반영**

Step 2~6에서 스펙과 다르게 동작한 부분이 있으면 설계 문서를 고친다.
없으면 이 단계를 건너뛴다.

```bash
git add docs/superpowers/specs/2026-08-17-ai-review-personas-design.md
git commit -m "docs: AI 리뷰 워크플로우 검증 결과 반영"
```

- [ ] **Step 9: 최종 검증**

```bash
pnpm exec vitest run scripts/ai-reviewer
pnpm type-check
```

Expected: 전체 테스트 PASS, 타입 오류 없음

- [ ] **Step 10: PR 생성**

```bash
/pr
```

---

## 부록: 문제 해결

| 증상 | 원인 | 대응 |
|------|------|------|
| 토큰 발급 401 | `appId` 오류 또는 private key 불일치 | `config.json`의 `appId`를 App 설정 페이지 값과 대조 |
| 토큰 발급 404 | `installationId` 오류 | `https://github.com/settings/installations/` 에서 재확인 |
| 코멘트 게시 403 | App 권한 부족 | Pull requests를 **Read and write**로 변경 후 재설치 |
| 인라인 코멘트 422 | `line`이 diff 범위 밖 | 변경된 라인으로 수정. `commit_id`가 head SHA인지도 확인 |
| suggestion 커밋 버튼 없음 | 코멘트 라인과 제안 코드가 불일치 | 해당 라인의 실제 내용을 다시 읽고 정확히 교체 |
| `pending`이 항상 빈 배열 | `config.json`의 `prAuthor` 오타 | GitHub 로그인명과 정확히 일치시킨다 |
| 봇이 자기 코멘트에 답함 | 마커 누락 | `cli.ts`가 모든 게시 본문에 마커를 붙이는지 확인 |
