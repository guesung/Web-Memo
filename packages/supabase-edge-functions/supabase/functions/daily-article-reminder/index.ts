import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getLocalDateString, shouldNotifyNow } from "./timeBucket.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const supabase = createClient(
	Deno.env.get("SUPABASE_URL") ?? "",
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
	{ db: { schema: "memo" } },
);

interface NotificationSetting {
	user_id: string;
	isEnabled: boolean;
	notifyTime: string;
	timezone: string;
}

interface CandidateMemo {
	id: number;
	title: string;
	url: string;
}

/**
 * 유저의 위시리스트 중 발송 이력이 없는 가장 오래된 메모 1건을 고른다.
 */
async function pickCandidateMemo(userId: string): Promise<CandidateMemo | null> {
	const { data: sentLogs } = await supabase
		.from("notification_log")
		.select("memo_id")
		.eq("user_id", userId);

	const sentMemoIds = (sentLogs ?? []).map((log) => log.memo_id);

	let query = supabase
		.from("memo")
		.select("id, title, url")
		.eq("user_id", userId)
		.eq("isWish", true)
		.order("created_at", { ascending: true })
		.limit(1);

	if (sentMemoIds.length > 0) {
		query = query.not("id", "in", `(${sentMemoIds.join(",")})`);
	}

	const { data } = await query;

	return data?.[0] ?? null;
}

/**
 * 오늘(유저 타임존 기준) 이미 발송했는지 확인한다.
 */
async function hasSentToday(userId: string, timezone: string): Promise<boolean> {
	const { data } = await supabase
		.from("notification_log")
		.select("sent_at")
		.eq("user_id", userId)
		.order("sent_at", { ascending: false })
		.limit(1);

	const lastSentAt = data?.[0]?.sent_at;
	if (!lastSentAt) return false;

	const now = new Date();

	return (
		getLocalDateString(new Date(lastSentAt), timezone) ===
		getLocalDateString(now, timezone)
	);
}

/**
 * Expo Push API로 알림을 보내고, 죽은 토큰(DeviceNotRegistered)을 정리한다.
 * 하나 이상의 토큰으로 발송 성공하면 true.
 */
async function sendPush(
	tokens: { token: string }[],
	memo: CandidateMemo,
): Promise<boolean> {
	const messages = tokens.map(({ token }) => ({
		to: token,
		title: "오늘의 읽을거리 📖",
		body: memo.title,
		data: { url: memo.url, memoId: memo.id },
	}));

	const response = await fetch(EXPO_PUSH_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(messages),
	});

	if (!response.ok) {
		console.error("Expo Push API 오류:", response.status, await response.text());
		return false;
	}

	const { data: tickets } = await response.json();
	let hasSuccess = false;

	for (let i = 0; i < tickets.length; i++) {
		const ticket = tickets[i];
		if (ticket.status === "ok") {
			hasSuccess = true;
			continue;
		}
		if (ticket.details?.error === "DeviceNotRegistered") {
			await supabase.from("push_token").delete().eq("token", tokens[i].token);
		}
		console.error("푸시 티켓 오류:", JSON.stringify(ticket));
	}

	return hasSuccess;
}

serve(async (req) => {
	if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
		return new Response(JSON.stringify({ status: "unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const now = new Date();
	let notified = 0;
	let skipped = 0;

	const { data: settings, error } = await supabase
		.from("notification_setting")
		.select("user_id, isEnabled, notifyTime, timezone")
		.eq("isEnabled", true);

	if (error) {
		console.error("설정 조회 실패:", error.message);
		return new Response(
			JSON.stringify({ status: "error", message: error.message }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	for (const setting of (settings ?? []) as NotificationSetting[]) {
		if (!shouldNotifyNow(setting.notifyTime, setting.timezone, now)) {
			continue;
		}

		if (await hasSentToday(setting.user_id, setting.timezone)) {
			skipped++;
			continue;
		}

		const memo = await pickCandidateMemo(setting.user_id);
		if (!memo) {
			skipped++;
			continue;
		}

		const { data: tokens } = await supabase
			.from("push_token")
			.select("token")
			.eq("user_id", setting.user_id);

		if (!tokens || tokens.length === 0) {
			skipped++;
			continue;
		}

		const isSent = await sendPush(tokens, memo);
		if (!isSent) {
			skipped++;
			continue;
		}

		// 발송 성공 후에만 로그를 남긴다. UNIQUE(user_id, memo_id) 충돌은 이미
		// 발송된 것이므로 무시한다.
		const { error: logError } = await supabase.from("notification_log").insert({
			user_id: setting.user_id,
			memo_id: memo.id,
		});

		if (logError && !logError.message.includes("duplicate")) {
			console.error("발송 로그 기록 실패:", logError.message);
		}

		notified++;
	}

	return new Response(JSON.stringify({ status: "success", notified, skipped }), {
		headers: { "Content-Type": "application/json" },
	});
});
