import { EXTENSION } from "@web-memo/shared/constants";
import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { CORS_HEADERS, ERROR_MESSAGES, HTTP_STATUS } from "../constant";
import { createErrorResponse, handleOpenAIError } from "../util";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
	console.warn("OPENAI_API_KEY is not configured");
}

function buildCategoryPrompt(data: CategorySuggestionRequest): string {
	const categoryList =
		data.existingCategories.length > 0
			? data.existingCategories.map((c) => c.name).join(", ")
			: "None (please suggest a new category)";

	return `You are a category classifier for a memo/bookmark application.

Context:
- Page Title: ${data.pageTitle}
- Page URL: ${data.pageUrl}
- Page Content (excerpt): ${data.pageContent.slice(0, 2000)}
- User's Memo: ${data.memoText}
- Page Language: ${data.pageLanguage}

User's existing categories: [${categoryList}]

Task: Suggest ONE category for this memo.

Rules:
1. If content matches an existing category, use that EXACT name (case-sensitive)
2. If no existing category fits well, suggest a NEW concise name (1-3 words)
3. Category name MUST be in ${data.pageLanguage === "ko" ? "Korean" : "the same language as the page content"}
4. Be specific but not too narrow (e.g., "개발" over "React useState 버그")
5. Return confidence 0.0-1.0 based on how well the category fits

Response format (JSON only, no markdown):
{
  "categoryName": "string",
  "isExisting": boolean,
  "confidence": number
}`;
}

function validateRequest(
	body: unknown,
): body is CategorySuggestionRequest & { valid: true } {
	if (!body || typeof body !== "object") return false;
	const data = body as Record<string, unknown>;

	return (
		typeof data.pageTitle === "string" &&
		typeof data.pageUrl === "string" &&
		typeof data.pageContent === "string" &&
		typeof data.memoText === "string" &&
		Array.isArray(data.existingCategories) &&
		typeof data.pageLanguage === "string"
	);
}

function parseAIResponse(responseContent: string): ParsedAIResponse | null {
	try {
		const parsed = JSON.parse(responseContent);

		if (
			typeof parsed.categoryName !== "string" ||
			typeof parsed.isExisting !== "boolean" ||
			typeof parsed.confidence !== "number"
		) {
			return null;
		}

		return {
			categoryName: parsed.categoryName,
			isExisting: parsed.isExisting,
			confidence: parsed.confidence,
		};
	} catch {
		return null;
	}
}

export async function POST(request: NextRequest) {
	// Check API key first
	if (!OPENAI_API_KEY) {
		return createErrorResponse(
			"OpenAI API key not configured",
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
		);
	}

	try {
		const origin = request.headers.get("origin");
		const validOrigin = `chrome-extension://${EXTENSION.id}`;

		if (origin !== validOrigin) {
			return createErrorResponse(
				ERROR_MESSAGES.UNAUTHORIZED,
				HTTP_STATUS.FORBIDDEN,
			);
		}

		const body = await request.json();

		if (!validateRequest(body)) {
			return createErrorResponse(
				"Invalid request format",
				HTTP_STATUS.BAD_REQUEST,
			);
		}

		const openai = new OpenAI({
			apiKey: OPENAI_API_KEY,
		});

		const prompt = buildCategoryPrompt(body);

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are a helpful assistant that categorizes web pages and memos. Always respond with valid JSON only, no markdown formatting.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			temperature: 0.3,
			response_format: { type: "json_object" },
		});

		const responseContent = completion.choices[0]?.message?.content;

		if (!responseContent) {
			return NextResponse.json(
				{ suggestion: null } satisfies CategorySuggestionResponse,
				{ headers: CORS_HEADERS },
			);
		}

		const parsed = parseAIResponse(responseContent);

		if (!parsed) {
			return NextResponse.json(
				{ suggestion: null } satisfies CategorySuggestionResponse,
				{ headers: CORS_HEADERS },
			);
		}

		// Find matching existing category ID if isExisting is true
		let existingCategoryId: number | undefined;
		if (parsed.isExisting) {
			const matchedCategory = body.existingCategories.find(
				(c) => c.name.toLowerCase() === parsed.categoryName.toLowerCase(),
			);
			existingCategoryId = matchedCategory?.id;

			// If AI said isExisting but we can't find it, treat as new
			if (!existingCategoryId) {
				parsed.isExisting = false;
			}
		}

		const response: CategorySuggestionResponse = {
			suggestion: {
				categoryName: parsed.categoryName,
				isExisting: parsed.isExisting,
				existingCategoryId,
				confidence: parsed.confidence,
			},
		};

		return NextResponse.json(response, { headers: CORS_HEADERS });
	} catch (error) {
		console.error("Category suggestion error:", error);

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

interface CategorySuggestionRequest {
	pageTitle: string;
	pageUrl: string;
	pageContent: string;
	memoText: string;
	existingCategories: { id: number; name: string }[];
	pageLanguage: string;
}

interface CategorySuggestionResponse {
	suggestion: {
		categoryName: string;
		isExisting: boolean;
		existingCategoryId?: number;
		confidence: number;
	} | null;
}

interface ParsedAIResponse {
	categoryName: string;
	isExisting: boolean;
	confidence: number;
}
