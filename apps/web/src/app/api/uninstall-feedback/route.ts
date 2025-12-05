import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import { SUPABASE } from "@web-memo/shared/constants";
import type { Database } from "@web-memo/shared/types";
import { NextResponse, type NextRequest } from "next/server";

const getFeedbackSupabaseClient = () => {
	return createClient<Database, "feedback">(
		CONFIG.supabaseUrl,
		CONFIG.supabaseAnonKey,
		{
			db: { schema: SUPABASE.schema.feedback },
		},
	);
};

interface UninstallFeedbackRequest {
	reason: string;
	feedback: string;
	phoneNumber?: string;
}

export async function POST(request: NextRequest) {
	try {
		const body: UninstallFeedbackRequest = await request.json();

		if (!body.reason && !body.feedback) {
			return NextResponse.json(
				{ error: "Reason or feedback is required" },
				{ status: 400 },
			);
		}

		const supabase = getFeedbackSupabaseClient();

		const content = JSON.stringify({
			type: "uninstall",
			reason: body.reason,
			feedback: body.feedback,
			phoneNumber: body.phoneNumber || null,
			timestamp: new Date().toISOString(),
		});

		const { error } = await supabase.from("feedbacks").insert({
			content,
		});

		if (error) {
			console.error("Failed to save uninstall feedback:", error);
			return NextResponse.json(
				{ error: "Failed to save feedback" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Uninstall feedback error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
