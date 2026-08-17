import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

/** `post` 서브커맨드 입력의 질문 하나 */
export interface IFQuestionInput {
	persona: TPersona;
	path: string;
	line: number;
	body: string;
	/** 마커 종류. 보통 `q1`, `q2`, ... LLM이 생성한 값이라 형식이 어긋날 수 있다 */
	kind: string;
}

/** `post` 서브커맨드 입력의 답글 하나 */
export interface IFReplyInput {
	persona: TPersona;
	rootId: number;
	body: string;
}

/** `post` 서브커맨드 입력 파일 스키마. 세 키 모두 선택이며 없으면 빈 배열/null로 간주한다 */
export interface IFPostInput {
	questions?: IFQuestionInput[];
	replies?: IFReplyInput[];
	scan?: { persona: TPersona; body: string } | null;
}

/** `followup` 서브커맨드 입력 파일 스키마 */
export interface IFFollowupInput {
	items: string[];
}

const readJsonFile = <TValue>(path: string): TValue => {
	return JSON.parse(readFileSync(path, "utf8")) as TValue;
};

/**
 * 코멘트 본문 끝에 봇 마커를 붙인다.
 * @description buildMarker가 만든 HTML 주석을 빈 줄로 구분해 본문 뒤에 붙이므로,
 * 결과 문자열을 parseMarker에 다시 넣으면 원래 persona/kind가 그대로 복원된다.
 */
export const withMarker = ({
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

/** buildMarker/appToken.ts가 아는 유효한 persona 값. LLM 출력 검증에 쓴다 */
const VALID_PERSONAS: readonly string[] = ["intern", "senior"] satisfies readonly TPersona[];

/** 런타임에 들어온 값이 유효한 TPersona인지 검사한다 (타입은 신뢰하지 않는다) */
const isValidPersona = (value: unknown): value is TPersona => {
	return typeof value === "string" && VALID_PERSONAS.includes(value);
};

/** 값이 1 이상의 정수인지 검사한다. 문자열 등 다른 타입은 전부 거부한다 */
const isPositiveInteger = (value: unknown): value is number => {
	return typeof value === "number" && Number.isInteger(value) && value > 0;
};

/**
 * `post` 입력 전체(questions/replies/scan)의 `persona`·`kind`·`line`·`rootId`를 미리 검사한다.
 * @description 이 값들은 전부 LLM이 작성한 JSON에서 오므로 형식이 어긋날 수 있다.
 * `buildMarker`는 `kind`만 정규식으로 검사하고 `persona`는 그대로 문자열 템플릿에 꽂아
 * 넣어 통과시키며, `line`·`rootId`도 게시 시점까지 아무도 검사하지 않는다 — `"line": "34"`
 * (문자열)나 정수가 아닌 `rootId`는 GitHub이 422로 거부할 때야 드러나는데, 그 시점엔 이미
 * 앞선 항목들이 GitHub에 게시된 뒤일 수 있다. 그래서 네 항목 모두 첫 네트워크 호출보다
 * 먼저, questions/replies/scan 전체에 걸쳐 검사하고, 문제 있는 항목을 전부 모아 한 번에
 * 보고한다.
 * @throws 하나라도 유효하지 않으면 Error. 배열 이름과 인덱스(`questions[1].kind` 등)로
 * 위치를 명시하며, 여러 항목·여러 필드가 동시에 잘못돼도 같은 메시지에 모두 나열한다.
 */
export const validatePostInput = ({
	questions,
	replies,
	scan,
}: {
	questions: IFQuestionInput[];
	replies: IFReplyInput[];
	scan: { persona: TPersona; body: string } | null;
}): void => {
	const problems: string[] = [];

	questions.forEach((question, index) => {
		if (!isValidPersona(question.persona)) {
			problems.push(`questions[${index}].persona 가 유효하지 않습니다: "${question.persona}"`);
		}

		if (!isPositiveInteger(question.line)) {
			problems.push(`questions[${index}].line 이 유효하지 않습니다: ${JSON.stringify(question.line)}`);
		}

		try {
			buildMarker({ persona: question.persona, kind: question.kind });
		} catch {
			problems.push(`questions[${index}].kind 가 유효하지 않습니다: "${question.kind}"`);
		}
	});

	replies.forEach((reply, index) => {
		if (!isValidPersona(reply.persona)) {
			problems.push(`replies[${index}].persona 가 유효하지 않습니다: "${reply.persona}"`);
		}

		if (!isPositiveInteger(reply.rootId)) {
			problems.push(`replies[${index}].rootId 가 유효하지 않습니다: ${JSON.stringify(reply.rootId)}`);
		}
	});

	if (scan !== null && !isValidPersona(scan.persona)) {
		problems.push(`scan.persona 가 유효하지 않습니다: "${scan.persona}"`);
	}

	if (problems.length > 0) {
		throw new Error(
			`post 입력이 유효하지 않아 게시를 중단합니다:\n${problems.map((problem) => `- ${problem}`).join("\n")}`,
		);
	}
};

const runPending = async (pullNumber: number): Promise<void> => {
	const { prAuthor } = loadReviewerConfig();
	const comments = await listReviewComments(pullNumber);
	const threads = findPendingThreads({ comments, prAuthor });

	console.log(JSON.stringify({ prAuthor, threads }, null, 2));
};

/**
 * 게시가 어느 항목에서 멈췄는지를 진단 로그용 위치 문자열로 나타낸다.
 * @description questions → replies → scan은 항상 순차로 진행되고 각 항목은 완전히
 * 성공하거나 아예 실패하므로, "성공한 개수"만으로 실패 지점을 역산할 수 있다.
 */
const describeFailurePosition = ({
	questionsTotal,
	questionsPosted,
	repliesTotal,
	repliesPosted,
	hasScan,
	scanPosted,
}: {
	questionsTotal: number;
	questionsPosted: number;
	repliesTotal: number;
	repliesPosted: number;
	hasScan: boolean;
	scanPosted: boolean;
}): string => {
	if (questionsPosted < questionsTotal) {
		return `questions[${questionsPosted}]`;
	}

	if (repliesPosted < repliesTotal) {
		return `replies[${repliesPosted}]`;
	}

	if (hasScan && !scanPosted) {
		return "scan";
	}

	return "알 수 없음";
};

/**
 * `post` 서브커맨드의 게시 로직 본체.
 * @description 이미 파싱된 입력 객체를 받으므로 파일 I/O 없이 테스트할 수 있다.
 * questions → replies → scan 순서로 진행하되, 각 단계 내부는 반드시 for...of + await로
 * 순차 게시한다. appToken.ts는 페르소나별 installation token을 프로세스 생애주기 동안
 * 캐싱하는데, 캐싱 대상이 "발급 중인 Promise"가 아니라 "발급된 값"이라 같은 페르소나에
 * 대한 동시 호출은 각자 토큰을 중복 발급받는 경쟁이 생긴다. 순차 게시는 이 경쟁을
 * 막을 뿐 아니라, 실패 시 정확히 몇 번째 코멘트까지 게시됐는지 보고할 수 있게 해준다.
 * 게시는 validatePostInput으로 전체 배치(persona·kind·line·rootId)를 먼저 검증한 뒤에만 시작한다.
 * 쓰기는 되돌릴 수 없고 복구는 운영자가 수동으로 해야 하므로, 각 게시 로그에 몇 번째/전체
 * 건수인지 명시하고, 도중에 실패하면 무엇이 이미 게시됐고 어디서 멈췄는지 stderr에 남긴 뒤
 * 원본 에러를 그대로 전파한다(재시도·롤백·재개 로직은 없다 — 보고만 한다).
 */
export const runPostWithInput = async ({
	pullNumber,
	input,
}: {
	pullNumber: number;
	input: IFPostInput;
}): Promise<void> => {
	const questions = input.questions ?? [];
	const replies = input.replies ?? [];
	const scan = input.scan ?? null;

	validatePostInput({ questions, replies, scan });

	let questionsPosted = 0;
	let repliesPosted = 0;
	let scanPosted = false;

	try {
		if (questions.length > 0) {
			const { headSha } = await getPullRequest(pullNumber);

			for (const [index, question] of questions.entries()) {
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
				questionsPosted += 1;
				console.error(
					`질문 게시 ${index + 1}/${questions.length}: ${question.persona} ${question.path}:${question.line}`,
				);
			}
		}

		for (const [index, reply] of replies.entries()) {
			await postReviewReply({
				persona: reply.persona,
				pullNumber,
				rootId: reply.rootId,
				body: withMarker({ body: reply.body, persona: reply.persona, kind: "reply" }),
			});
			repliesPosted += 1;
			console.error(`재답변 게시 ${index + 1}/${replies.length}: ${reply.persona} 스레드 ${reply.rootId}`);
		}

		if (scan !== null) {
			await postIssueComment({
				persona: scan.persona,
				pullNumber,
				body: withMarker({ body: scan.body, persona: scan.persona, kind: "scan" }),
			});
			scanPosted = true;
			console.error("지적 요약 코멘트 게시");
		}
	} catch (error) {
		const failurePosition = describeFailurePosition({
			questionsTotal: questions.length,
			questionsPosted,
			repliesTotal: replies.length,
			repliesPosted,
			hasScan: scan !== null,
			scanPosted,
		});

		console.error(
			`게시 중단 (실패 지점: ${failurePosition}) — 성공: questions ${questionsPosted}/${questions.length}건, ` +
				`replies ${repliesPosted}/${replies.length}건, scan ${scan === null ? "대상 없음" : scanPosted ? "게시됨" : "미게시"}. ` +
				"이미 게시된 항목은 GitHub에 그대로 남아 있으니 재실행 전에 확인하세요.",
		);

		throw error;
	}
};

const runPost = async ({
	pullNumber,
	inputPath,
}: {
	pullNumber: number;
	inputPath: string;
}): Promise<void> => {
	const input = readJsonFile<IFPostInput>(inputPath);

	await runPostWithInput({ pullNumber, input });
};

/**
 * `followup` 서브커맨드의 반영 로직 본체.
 * @description 이미 파싱된 `items`를 받으므로 파일 I/O 없이 테스트할 수 있다.
 */
export const runFollowupWithItems = async ({
	pullNumber,
	items,
}: {
	pullNumber: number;
	items: string[];
}): Promise<void> => {
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

const runFollowup = async ({
	pullNumber,
	inputPath,
}: {
	pullNumber: number;
	inputPath: string;
}): Promise<void> => {
	const { items } = readJsonFile<IFFollowupInput>(inputPath);

	await runFollowupWithItems({ pullNumber, items });
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

	// Number("")는 0이라 위 NaN 검사를 그냥 통과한다. `--pr` 없이 빈 문자열만 넘어오면
	// PR #0을 조회하려 시도해 알아보기 힘든 403으로 이어지므로, 여기서 막는다.
	if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
		throw new Error(`--pr 값은 양의 정수여야 합니다: ${JSON.stringify(values.pr)}`);
	}

	if (subcommand === "pending") {
		await runPending(pullNumber);
		return;
	}

	// post/followup 인지 먼저 확인해, --input 누락 에러가 미지의 서브커맨드를
	// 가려버리지 않도록 한다.
	if (subcommand !== "post" && subcommand !== "followup") {
		throw new Error(`알 수 없는 서브커맨드: ${subcommand} (pending | post | followup)`);
	}

	if (values.input === undefined) {
		throw new Error(`${subcommand} 서브커맨드에는 --input <파일.json> 이 필요합니다.`);
	}

	if (subcommand === "post") {
		await runPost({ pullNumber, inputPath: values.input });
		return;
	}

	await runFollowup({ pullNumber, inputPath: values.input });
};

/** 이 CLI가 요구하는 최소 Node 버전. `isNodeVersionAtLeast`와 함께 쓴다 */
const MINIMUM_NODE_VERSION = "24.2.0";

/**
 * 실행 중인 Node 버전이 `minimum` 이상인지 검사한다.
 * @description 이 CLI가 쓰는 버전 표기는 항상 `major.minor.patch` 세 자리이므로
 * 전체 semver 스펙(프리릴리스 태그 등)은 다루지 않는다.
 */
const isNodeVersionAtLeast = (minimum: string): boolean => {
	const toParts = (version: string): [number, number, number] => {
		const [major, minor, patch] = version.split(".").map(Number);

		return [major ?? 0, minor ?? 0, patch ?? 0];
	};
	const [currentMajor, currentMinor, currentPatch] = toParts(process.versions.node);
	const [minMajor, minMinor, minPatch] = toParts(minimum);

	if (currentMajor !== minMajor) {
		return currentMajor > minMajor;
	}

	if (currentMinor !== minMinor) {
		return currentMinor > minMinor;
	}

	return currentPatch >= minPatch;
};

/**
 * 이 파일이 `node scripts/ai-reviewer/cli.ts ...`로 직접 실행됐는지 판별한다.
 * @description `import.meta.main`은 Node 24.2.0부터만 지원되고, 그보다 낮은 버전에서는
 * `undefined`가 되어 그 값만으로는 "직접 실행됐는지"를 판별할 수 없다. 게다가 vitest처럼
 * 모듈을 가로채 실행하는 러너는 Node 버전과 무관하게 이 값을 아예 채워주지 않는다. 그래서
 * Node 버전에 의존하지 않는 `process.argv[1]`과 이 파일의 실제 경로를 비교해 판별한다 —
 * vitest가 이 파일을 import할 때는 `process.argv[1]`이 vitest 자신의 진입점이라 항상
 * false가 되므로, 테스트 중에는 아래 블록이 실행되지 않는다.
 */
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
	// import.meta.main만으로 직접 실행 여부를 판별했다면, Node 24.2 미만에서
	// import.meta.main이 `undefined`가 되어 이 블록 전체가 조용히 건너뛰어지고
	// main()이 한 번도 호출되지 않은 채 exit code 0으로 끝났을 것이다 — 슬래시
	// 커맨드는 "성공"으로 읽지만 실제로는 아무 코멘트도 게시되지 않는 상태다.
	// 위 isMainModule은 그 문제를 구조적으로 없애지만, 이 CLI가 요구하는 최소
	// 버전을 명시적으로 안내하기 위해 버전 검사도 큰 소리로 실패시킨다.
	if (!isNodeVersionAtLeast(MINIMUM_NODE_VERSION)) {
		console.error(
			`이 CLI는 Node ${MINIMUM_NODE_VERSION} 이상이 필요합니다. 현재 Node 버전: ${process.versions.node}`,
		);
		process.exit(1);
	}

	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
