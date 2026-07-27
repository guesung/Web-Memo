import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { CORS_HEADERS, ERROR_MESSAGES, HTTP_STATUS } from "../constant";
import { createErrorResponse, handleOpenAIError } from "../util";
import {
	OPENAI_MODEL,
	OPENAI_SETTINGS,
	PAGE_CONTENT_MAX_LENGTH,
	QA_SYSTEM_MESSAGE,
	SUMMARIZE_SYSTEM_MESSAGE,
} from "./constant";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
	console.warn("OPENAI_API_KEY is not configured");
}

/** 요청의 Bearer 토큰이 로그인한 사용자의 것인지 검증한다 (앱은 origin 헤더를 보내지 않음) */
const verifyUser = async (request: NextRequest) => {
	const authHeader = request.headers.get("authorization");
	const token = authHeader?.replace("Bearer ", "");
	if (!token) return null;

	const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
	const {
		data: { user },
	} = await supabase.auth.getUser(token);
	return user;
};

export async function POST(request: NextRequest) {
	if (!OPENAI_API_KEY) {
		return createErrorResponse(
			"OpenAI API key not configured",
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}

	try {
		const user = await verifyUser(request);
		if (!user) {
			return createErrorResponse(
				ERROR_MESSAGES.UNAUTHORIZED,
				HTTP_STATUS.FORBIDDEN,
			);
		}

		const body = await request.json();
		const content = typeof body.content === "string" ? body.content : "";
		const question = typeof body.question === "string" ? body.question : "";

		if (!content.trim()) {
			return createErrorResponse(
				"content가 필요합니다.",
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		const truncatedContent = content.slice(0, PAGE_CONTENT_MAX_LENGTH);
		const isQuestion = !!question.trim();

		const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

		const completion = await openai.chat.completions.create({
			model: OPENAI_MODEL,
			messages: [
				{
					role: "system",
					content: isQuestion ? QA_SYSTEM_MESSAGE : SUMMARIZE_SYSTEM_MESSAGE,
				},
				{
					role: "user",
					content: isQuestion
						? `기사 본문:\n${truncatedContent}\n\n질문: ${question.trim()}`
						: `다음 기사를 요약해줘:\n${truncatedContent}`,
				},
			],
			temperature: OPENAI_SETTINGS.temperature,
		});

		const responseContent = completion.choices[0]?.message?.content;

		if (!responseContent) {
			return NextResponse.json(
				{ [isQuestion ? "answer" : "summary"]: null },
				{ headers: CORS_HEADERS },
			);
		}

		return NextResponse.json(
			{ [isQuestion ? "answer" : "summary"]: responseContent },
			{ headers: CORS_HEADERS },
		);
	} catch (error) {
		console.error("Webpage QA error:", error);

		if (error instanceof Error) {
			return handleOpenAIError(error);
		}

		return createErrorResponse(
			ERROR_MESSAGES.GENERAL_SERVER_ERROR,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}
}

export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: CORS_HEADERS,
	});
}
