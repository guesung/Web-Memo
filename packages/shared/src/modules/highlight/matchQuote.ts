import search from "approx-string-match";
import { CONTEXT_LENGTH } from "./constants";

/**
 * 문서 텍스트에서 인용문의 위치를 찾는다.
 * @description 매칭 전략은 hypothesis 클라이언트(src/annotator/anchoring/match-quote.ts)를 참고했다.
 * 정확 매칭을 먼저 시도하고 실패했을 때만 근사 매칭으로 넘어간다.
 */

/** 근사 매칭 시 허용할 최대 오류 수의 상한 */
const MAX_ERRORS_CAP = 256;

const SCORE_WEIGHT = {
	quote: 50,
	prefix: 20,
	suffix: 20,
	position: 2,
} as const;

/** 근사 매칭이 엉뚱한 위치를 고르는 것을 막기 위한 최소 점수 컷 (인용문 가중치의 절반) */
const MIN_SCORE = SCORE_WEIGHT.quote * 0.5;

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

	const best = scored.reduce((best, current) => (current.score > best.score ? current : best));

	if (best.score < MIN_SCORE) {
		return null;
	}

	return best;
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

	const maxErrors = Math.min(MAX_ERRORS_CAP, Math.floor(quote.length / 2));

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
				text.slice(Math.max(0, candidate.start - CONTEXT_LENGTH), candidate.start),
				options.prefix,
			)
		: 0;

	const suffixScore = options.suffix
		? similarityFromStart(text.slice(candidate.end, candidate.end + CONTEXT_LENGTH), options.suffix)
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
		actual[actual.length - 1 - matched] === expected[expected.length - 1 - matched]
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
