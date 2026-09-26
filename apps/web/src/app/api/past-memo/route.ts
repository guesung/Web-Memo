import {
	findPastMemo,
	parsePastMemoRequest,
	reportPastMemoFailure,
} from "@src/modules/pastMemo";
import { checkPastMemoRateLimit } from "@src/modules/ratelimit";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "@web-memo/shared/constants";
import type { IFPastMemoResponse } from "@web-memo/shared/types";
import { type NextRequest, NextResponse } from "next/server";

/** 확장(사이드 패널)이 Bearer 토큰을 실어 부르므로 Authorization 헤더를 허용한다. */
const PAST_MEMO_CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const EMPTY_RESPONSE: IFPastMemoResponse = { duplicate: null, related: [] };

const createMessageResponse = ({
	message,
	status,
	headers,
}: {
	message: string;
	status: number;
	headers?: Record<string, string>;
}) =>
	NextResponse.json(
		{ message },
		{ status, headers: { ...PAST_MEMO_CORS_HEADERS, ...headers } },
	);

const getBearerToken = (request: NextRequest): string | null => {
	const authorization = request.headers.get("authorization");

	if (!authorization?.startsWith("Bearer ")) {
		return null;
	}

	return authorization.slice("Bearer ".length).trim() || null;
};

/**
 * 현재 페이지와 같은 글·관련 있는 글을 사용자의 과거 메모에서 찾는다.
 * @description 401(토큰 없음·무효), 400(본문 형식 오류), 429(레이트 리밋) 외의 실패는 전부
 * 200 `{ duplicate: null, related: [] }`로 끝나고 Sentry에 보고된다.
 */
export const POST = async (request: NextRequest) => {
	const accessToken = getBearerToken(request);

	if (!accessToken) {
		return createMessageResponse({
			message: "로그인이 필요합니다.",
			status: 401,
		});
	}

	let userId: string | null = null;

	try {
		const supabaseClient = createClient(SUPABASE.url, SUPABASE.anonKey);
		const { data } = await supabaseClient.auth.getUser(accessToken);

		userId = data.user?.id ?? null;
	} catch (error) {
		reportPastMemoFailure({ error, stage: "auth" });

		return NextResponse.json(EMPTY_RESPONSE, {
			headers: PAST_MEMO_CORS_HEADERS,
		});
	}

	if (!userId) {
		return createMessageResponse({
			message: "로그인이 필요합니다.",
			status: 401,
		});
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return createMessageResponse({
			message: "요청 본문이 JSON이 아닙니다.",
			status: 400,
		});
	}

	const page = parsePastMemoRequest(body);

	if (!page) {
		return createMessageResponse({
			message: "pageUrl, pageTitle, pageExcerpt는 문자열이어야 합니다.",
			status: 400,
		});
	}

	try {
		const rateLimitResult = await checkPastMemoRateLimit(userId);

		if (!rateLimitResult.success) {
			return createMessageResponse({
				message: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
				status: 429,
				headers: { "Retry-After": String(rateLimitResult.resetInSeconds) },
			});
		}
	} catch (error) {
		reportPastMemoFailure({ error, stage: "ratelimit" });

		return NextResponse.json(EMPTY_RESPONSE, {
			headers: PAST_MEMO_CORS_HEADERS,
		});
	}

	const pastMemoResponse = await findPastMemo({ accessToken, userId, page });

	return NextResponse.json(pastMemoResponse, {
		headers: PAST_MEMO_CORS_HEADERS,
	});
};

/** CORS preflight에 응답한다. */
export const OPTIONS = async () =>
	new Response(null, { status: 200, headers: PAST_MEMO_CORS_HEADERS });
