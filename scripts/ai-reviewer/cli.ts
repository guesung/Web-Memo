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

/**
 * `questions` 배열의 모든 `kind`가 buildMarker가 허용하는 형식인지 미리 검사한다.
 * @description `kind`는 LLM이 작성한 JSON에서 오므로 형식이 어긋날 수 있다. 게시
 * 루프 도중에야 buildMarker가 던지면 그 앞의 질문들은 이미 GitHub에 실제로
 * 게시된 뒤라, 재실행 시 중복 게시로 이어진다. 그래서 첫 네트워크 호출보다
 * 먼저 배치 전체를 검사하고, 문제 있는 항목을 전부 모아 한 번에 보고한다.
 * @throws 하나라도 유효하지 않으면 Error. 메시지에 인덱스·persona·kind를 모두 나열한다.
 */
export const validateQuestionKinds = (questions: IFQuestionInput[]): void => {
	const invalidEntries: string[] = [];

	for (const [index, question] of questions.entries()) {
		try {
			buildMarker({ persona: question.persona, kind: question.kind });
		} catch {
			invalidEntries.push(`#${index} (persona: ${question.persona}, kind: "${question.kind}")`);
		}
	}

	if (invalidEntries.length > 0) {
		throw new Error(
			`questions에 유효하지 않은 kind가 있어 게시를 중단합니다:\n${invalidEntries
				.map((entry) => `- ${entry}`)
				.join("\n")}`,
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
 * `post` 서브커맨드의 게시 로직 본체.
 * @description 이미 파싱된 입력 객체를 받으므로 파일 I/O 없이 테스트할 수 있다.
 * questions → replies → scan 순서로 진행하되, 각 단계 내부는 반드시 for...of + await로
 * 순차 게시한다. appToken.ts는 페르소나별 installation token을 프로세스 생애주기 동안
 * 캐싱하는데, 캐싱 대상이 "발급 중인 Promise"가 아니라 "발급된 값"이라 같은 페르소나에
 * 대한 동시 호출은 각자 토큰을 중복 발급받는 경쟁이 생긴다. 순차 게시는 이 경쟁을
 * 막을 뿐 아니라, 실패 시 정확히 몇 번째 코멘트까지 게시됐는지 보고할 수 있게 해준다.
 * questions 게시는 validateQuestionKinds로 전체 배치를 먼저 검증한 뒤에만 시작한다.
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

	validateQuestionKinds(questions);

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

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
