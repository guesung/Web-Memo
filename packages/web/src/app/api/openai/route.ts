import { CONFIG } from "@web-memo/env";
import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: CONFIG.openApiKey,
});

export async function POST(request: NextRequest) {
	try {
		// CORS 헤더 설정
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		// 요청 본문 파싱
		const body = await request.json();
		const { messages } = body;

		// 필수 파라미터 검증
		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return NextResponse.json(
				{ error: "메시지가 필요합니다." },
				{ status: 400, headers: corsHeaders },
			);
		}

		// 메시지 형식 검증
		const isValidMessage = messages.every((msg: unknown) => {
			if (!msg || typeof msg !== "object") return false;
			const message = msg as Record<string, unknown>;
			return (
				typeof message.role === "string" && typeof message.content === "string"
			);
		});

		if (!isValidMessage) {
			return NextResponse.json(
				{ error: "올바른 메시지 형식이 아닙니다." },
				{ status: 400, headers: corsHeaders },
			);
		}

		// 스트리밍 응답 처리

		const encoder = new TextEncoder();

		const customReadable = new ReadableStream({
			async start(controller) {
				try {
					const stream = await openai.chat.completions.create({
						model: "gpt-4o-mini",
						messages,
						stream: true,
						temperature: 0.3,
					});

					for await (const chunk of stream) {
						const content = chunk.choices[0]?.delta?.content;
						if (content) {
							controller.enqueue(
								encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
							);
						}
					}

					controller.enqueue(encoder.encode("data: [DONE]\n\n"));
					controller.close();
				} catch (error) {
					console.error("OpenAI API Error:", error);
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ error: "요약 생성 중 오류가 발생했습니다." })}\n\n`,
						),
					);
					controller.close();
				}
			},
		});

		return new Response(customReadable, {
			headers: {
				...corsHeaders,
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Route handler error:", error);

		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		// OpenAI API 관련 오류 처리
		if (error instanceof Error) {
			if (error.message.includes("API key")) {
				return NextResponse.json(
					{ error: "OpenAI API 키가 설정되지 않았습니다." },
					{ status: 500, headers: corsHeaders },
				);
			}

			if (
				error.message.includes("quota") ||
				error.message.includes("rate_limit")
			) {
				return NextResponse.json(
					{ error: "API 사용 한도를 초과했습니다." },
					{ status: 429, headers: corsHeaders },
				);
			}

			if (error.message.includes("context_length_exceeded")) {
				return NextResponse.json(
					{ error: "입력 텍스트가 너무 깁니다." },
					{ status: 400, headers: corsHeaders },
				);
			}
		}

		// 일반적인 오류 처리
		return NextResponse.json(
			{ error: "서버 오류가 발생했습니다." },
			{ status: 500, headers: corsHeaders },
		);
	}
}

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}
