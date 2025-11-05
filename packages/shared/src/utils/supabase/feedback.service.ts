import type { FeedbackSupabaseClient, FeedbackTable } from "../../types";

/**
 * FeedbackService - 피드백 관련 Supabase 작업을 처리하는 서비스
 *
 * Note: FeedbackSupabaseClient는 별도 클라이언트를 사용하므로 BaseSupabaseService를 상속하지 않음
 */
export class FeedbackService {
	constructor(
		private readonly feedbackSupabaseClient: FeedbackSupabaseClient,
	) {}

	insertFeedback = async (feedback: FeedbackTable["Insert"]) =>
		this.feedbackSupabaseClient.from("feedbacks").insert(feedback);
}
