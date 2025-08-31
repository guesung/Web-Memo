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
		const { pageContent, category = "others", language = "ko" } = body;

		// 필수 파라미터 검증
		if (!pageContent) {
			return NextResponse.json(
				{ error: "페이지 콘텐츠가 필요합니다." },
				{ status: 400, headers: corsHeaders },
			);
		}

		// 텍스트 길이 제한 (약 100,000자 = 약 25,000 토큰)
		const maxLength = 100000;
		let processedContent = pageContent;

		if (pageContent.length > maxLength) {
			// 대용량 텍스트인 경우 앞부분만 사용
			processedContent =
				pageContent.substring(0, maxLength) +
				"\n\n[내용이 길어서 일부만 요약합니다]";
		}

		// 프롬프트 생성 함수
		const getSystemPrompt = (language: string, category: string) => {
			const prompts = {
				ko: {
					youtube: `당신은 유튜브 영상의 자막을 요약하는 전문가입니다.
다음 지침을 따라 요약해주세요:
1. 핵심 내용을 3-5개의 주요 포인트로 구성하세요
2. 각 포인트는 명확하고 간결하게 작성하세요
3. 영상의 전체적인 메시지를 놓치지 않도록 주의하세요
4. 불필요한 반복이나 광고성 내용은 제외하세요
5. 한국어로 자연스럽게 작성하세요`,

					others: `당신은 웹페이지 내용을 요약하는 전문가입니다.
다음 지침을 따라 요약해주세요:
1. 페이지의 핵심 정보를 3-5개의 주요 포인트로 구성하세요
2. 중요한 데이터나 수치가 있다면 포함하세요
3. 광고나 네비게이션 요소는 제외하세요
4. 각 포인트는 명확하고 실용적으로 작성하세요
5. 한국어로 자연스럽게 작성하세요`,
				},
				en: {
					youtube: `You are an expert at summarizing YouTube video transcripts.
Please follow these guidelines:
1. Structure the summary into 3-5 key points
2. Write each point clearly and concisely
3. Don't miss the overall message of the video
4. Exclude unnecessary repetitions or promotional content
5. Write naturally in English`,

					others: `You are an expert at summarizing web page content.
Please follow these guidelines:
1. Structure the summary into 3-5 key points
2. Include important data or figures if present
3. Exclude ads or navigation elements
4. Write each point clearly and practically
5. Write naturally in English`,
				},
			};

			return (
				prompts[language as keyof typeof prompts]?.[
					category as keyof typeof prompts.ko
				] || prompts.ko.others
			);
		};

		const systemPrompt = getSystemPrompt(language, category);

		// 스트리밍 응답 설정
		const encoder = new TextEncoder();

		const customReadable = new ReadableStream({
			async start(controller) {
				try {
					const stream = await openai.chat.completions.create({
						model: "gpt-4o-mini",
						messages: [
							{ role: "system", content: systemPrompt },
							{ role: "user", content: processedContent },
						],
						stream: true,
						max_tokens: 1000, // 토큰 수 제한으로 비용 최적화
						temperature: 0.3, // 일관성 있는 요약을 위한 낮은 temperature
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

		// API 키 관련 오류 처리
		if (error instanceof Error && error.message.includes("API key")) {
			return NextResponse.json(
				{ error: "OpenAI API 키가 설정되지 않았습니다." },
				{ status: 500, headers: corsHeaders },
			);
		}

		// API 한도 초과 오류 처리
		if (error instanceof Error && error.message.includes("quota")) {
			return NextResponse.json(
				{ error: "API 사용 한도를 초과했습니다." },
				{ status: 429, headers: corsHeaders },
			);
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
