import search from "approx-string-match";
import { CONTEXT_LENGTH } from "./constants";

/**
 * 문서 텍스트에서 인용문의 위치를 찾는다.
 * @description 매칭 전략은 hypothesis 클라이언트(src/annotator/anchoring/match-quote.ts)를 참고했다.
 * 정확 매칭을 먼저 시도하고 실패했을 때만 근사 매칭으로 넘어간다.
 */

/** 근사 매칭 시 허용할 최대 오류 수의 상한 */
const MAX_ERRORS_CAP = 256;

/**
 * 근사 매칭에서 허용할 오차 비율.
 * @description 매칭 엄격도는 오직 이 값으로만 통제한다. 사후 점수 컷을 두지 말 것 —
 * approx-string-match는 errors <= maxErrors인 후보만 반환하므로 인용문 점수가 항상
 * 1 - MAX_ERROR_RATIO 이상으로 보장되고, 그 값에서 유도한 컷은 어떤 입력에서도 걸리지 않는 죽은 코드가 된다.
 * hypothesis는 0.5를 쓰지만, 밑줄이 사라지는 것보다 엉뚱한 문장에 그어지는 게 더 나쁘다고 보아 0.3으로 좁혔다.
 */
const MAX_ERROR_RATIO = 0.3;

const SCORE_WEIGHT = {
	quote: 50,
	prefix: 20,
	suffix: 20,
	position: 2,
} as const;

/** 인용문 매칭 결과 */
export interface QuoteMatch {
	start: number;
	end: number;
	score: number;
}

/**
 * 문서 텍스트에서 인용문의 위치를 찾는다.
 * @description 정확 매칭을 먼저 시도하고, 실패했을 때만 근사 매칭으로 넘어간다.
 * 후보가 여러 개면 prefix/suffix/hint를 반영한 점수로 가장 그럴듯한 위치를 고른다.
 */
export function matchQuote(
	text: string,
	quote: string,
	options: { prefix?: string; suffix?: string; hint?: number } = {},
): QuoteMatch | null {
	if (quote.length === 0) {
		return null;
	}

	const candidates = findCandidates(text, quote);

	if (candidates.length === 0) {
		return null;
	}

	const scored = candidates.map((candidate) => ({
		...candidate,
		score: scoreCandidate({ text, quote, candidate, options }),
	}));

	return scored.reduce((best, current) =>
		current.score > best.score ? current : best,
	);
}

/** 근사 매칭 후보 (오류 수 포함) */
interface Candidate {
	start: number;
	end: number;
	errors: number;
}

/** 정확 매칭을 모두 모으고, 하나도 없을 때만 근사 매칭으로 넘어간다. */
function findCandidates(text: string, quote: string): Candidate[] {
	const exact: Candidate[] = [];

	let from = text.indexOf(quote);
	while (from !== -1) {
		exact.push({ start: from, end: from + quote.length, errors: 0 });
		from = text.indexOf(quote, from + 1);
	}

	if (exact.length > 0) {
		return exact;
	}

	const maxErrors = Math.min(
		MAX_ERRORS_CAP,
		Math.floor(quote.length * MAX_ERROR_RATIO),
	);

	return search(text, quote, maxErrors);
}

/** 후보의 점수를 계산한다 (인용문 정확도 + prefix/suffix 유사도 + 위치 힌트). */
function scoreCandidate({
	text,
	quote,
	candidate,
	options,
}: {
	text: string;
	quote: string;
	candidate: Candidate;
	options: { prefix?: string; suffix?: string; hint?: number };
}): number {
	const quoteScore = 1 - candidate.errors / Math.max(quote.length, 1);

	const prefixScore = options.prefix
		? similarityFromEnd(
				text.slice(
					Math.max(0, candidate.start - CONTEXT_LENGTH),
					candidate.start,
				),
				options.prefix,
			)
		: 0;

	const suffixScore = options.suffix
		? similarityFromStart(
				text.slice(candidate.end, candidate.end + CONTEXT_LENGTH),
				options.suffix,
			)
		: 0;

	const positionScore =
		options.hint === undefined
			? 0
			: 1 - Math.abs(candidate.start - options.hint) / Math.max(text.length, 1);

	return (
		quoteScore * SCORE_WEIGHT.quote +
		prefixScore * SCORE_WEIGHT.prefix +
		suffixScore * SCORE_WEIGHT.suffix +
		positionScore * SCORE_WEIGHT.position
	);
}

/** 두 문자열이 끝에서부터 몇 글자나 같은지를 0~1로 환산한다 (prefix 비교용) */
function similarityFromEnd(actual: string, expected: string): number {
	const limit = Math.min(actual.length, expected.length);
	let matched = 0;

	while (
		matched < limit &&
		actual[actual.length - 1 - matched] ===
			expected[expected.length - 1 - matched]
	) {
		matched += 1;
	}

	return limit === 0 ? 0 : matched / limit;
}

/** 두 문자열이 앞에서부터 몇 글자나 같은지를 0~1로 환산한다 (suffix 비교용) */
function similarityFromStart(actual: string, expected: string): number {
	const limit = Math.min(actual.length, expected.length);
	let matched = 0;

	while (matched < limit && actual[matched] === expected[matched]) {
		matched += 1;
	}

	return limit === 0 ? 0 : matched / limit;
}
