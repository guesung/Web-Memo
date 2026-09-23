import type { FeedbackSupabaseClient, FeedbackTable } from "../../types";

/** 사용자 피드백을 저장한다. */
export class FeedbackService {
	constructor(
		private readonly feedbackSupabaseClient: FeedbackSupabaseClient,
	) {}

	insertFeedback = async (feedback: FeedbackTable["Insert"]) =>
		this.feedbackSupabaseClient.from("feedbacks").insert(feedback);
}
