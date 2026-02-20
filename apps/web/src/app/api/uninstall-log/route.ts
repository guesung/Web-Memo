import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import { SUPABASE } from "@web-memo/shared/constants";
import type { Database } from "@web-memo/shared/types";
import { type NextRequest, NextResponse } from "next/server";

const getFeedbackSupabaseClient = () => {
	return createClient<Database, "feedback">(
		CONFIG.supabaseUrl,
		CONFIG.supabaseAnonKey,
		{
			db: { schema: SUPABASE.schema.feedback },
		},
	);
};

interface UninstallLogRequest {
	userId?: string;
}

export async function POST(request: NextRequest) {
	try {
		const body: UninstallLogRequest = await request.json();
		const { userId } = body;

		const supabase = getFeedbackSupabaseClient();

		if (userId) {
			const { data: existing } = await supabase
				.from("feedbacks")
				.select("id")
				.eq("user_id", userId)
				.like("content", '%"type":"uninstall_page_visit"%')
				.limit(1);

			if (existing && existing.length > 0) {
				return NextResponse.json({ success: true, skipped: true });
			}
		}

		const content = JSON.stringify({
			type: "uninstall_page_visit",
			timestamp: new Date().toISOString(),
		});

		const { error } = await supabase.from("feedbacks").insert({
			user_id: userId || null,
			content,
		});

		if (error) {
			console.error("Failed to save uninstall log:", error);
			return NextResponse.json(
				{ error: "Failed to save log" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Uninstall log error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
