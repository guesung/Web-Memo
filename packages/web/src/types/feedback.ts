export interface Feedback {
  id: string;
  content: string;
  created_at: string;
  user_id?: string;
}

export interface CreateFeedbackDTO {
  content: string;
  user_id?: string;
}
