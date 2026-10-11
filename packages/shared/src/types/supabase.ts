export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "12.2.3 (519615d)";
	};
	feedback: {
		Tables: {
			feedbacks: {
				Row: {
					content: string | null;
					created_at: string;
					email: string | null;
					id: number;
					user_id: string | null;
				};
				Insert: {
					content?: string | null;
					created_at?: string;
					email?: string | null;
					id?: number;
					user_id?: string | null;
				};
				Update: {
					content?: string | null;
					created_at?: string;
					email?: string | null;
					id?: number;
					user_id?: string | null;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	memo: {
		Tables: {
			blog_article: {
				Row: {
					available: boolean;
					blog_id: string;
					first_seen_at: string;
					last_seen_generation: number;
					page_key: string;
					provider_id: string;
					published_at: string | null;
					title: string;
					updated_at: string | null;
					url: string;
				};
				Insert: {
					available?: boolean;
					blog_id: string;
					first_seen_at?: string;
					last_seen_generation: number;
					page_key: string;
					provider_id: string;
					published_at?: string | null;
					title: string;
					updated_at?: string | null;
					url: string;
				};
				Update: {
					available?: boolean;
					blog_id?: string;
					first_seen_at?: string;
					last_seen_generation?: number;
					page_key?: string;
					provider_id?: string;
					published_at?: string | null;
					title?: string;
					updated_at?: string | null;
					url?: string;
				};
				Relationships: [];
			};
			blog_article_alias: {
				Row: {
					blog_id: string;
					page_key: string;
					provider_id: string;
				};
				Insert: {
					blog_id: string;
					page_key: string;
					provider_id: string;
				};
				Update: {
					blog_id?: string;
					page_key?: string;
					provider_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "blog_article_alias_blog_id_provider_id_fkey";
						columns: ["blog_id", "provider_id"];
						isOneToOne: false;
						referencedRelation: "blog_article";
						referencedColumns: ["blog_id", "provider_id"];
					},
				];
			};
			blog_subscription: {
				Row: {
					active: boolean;
					blog_id: string;
					subscribed_at: string;
					unsubscribed_at: string | null;
					user_id: string;
				};
				Insert: {
					active?: boolean;
					blog_id: string;
					subscribed_at?: string;
					unsubscribed_at?: string | null;
					user_id: string;
				};
				Update: {
					active?: boolean;
					blog_id?: string;
					subscribed_at?: string;
					unsubscribed_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			blog_sync_request: {
				Row: {
					blog_id: string;
					handled_at: string | null;
					id: number;
					requested_at: string;
					requested_by: string | null;
					status: string;
				};
				Insert: {
					blog_id: string;
					handled_at?: string | null;
					id?: never;
					requested_at?: string;
					requested_by?: string | null;
					status?: string;
				};
				Update: {
					blog_id?: string;
					handled_at?: string | null;
					id?: never;
					requested_at?: string;
					requested_by?: string | null;
					status?: string;
				};
				Relationships: [];
			};
			blog_sync_state: {
				Row: {
					blog_id: string;
					checkpoint: Json | null;
					collected_count: number;
					generation: number;
					initial_completed_at: string | null;
					last_error: string | null;
					last_started_at: string | null;
					last_success_at: string | null;
					lease_expires_at: string | null;
					lease_seconds: number;
					lease_token: string | null;
					reported_total: number | null;
					status: string;
				};
				Insert: {
					blog_id: string;
					checkpoint?: Json | null;
					collected_count?: number;
					generation?: number;
					initial_completed_at?: string | null;
					last_error?: string | null;
					last_started_at?: string | null;
					last_success_at?: string | null;
					lease_expires_at?: string | null;
					lease_seconds?: number;
					lease_token?: string | null;
					reported_total?: number | null;
					status?: string;
				};
				Update: {
					blog_id?: string;
					checkpoint?: Json | null;
					collected_count?: number;
					generation?: number;
					initial_completed_at?: string | null;
					last_error?: string | null;
					last_started_at?: string | null;
					last_success_at?: string | null;
					lease_expires_at?: string | null;
					lease_seconds?: number;
					lease_token?: string | null;
					reported_total?: number | null;
					status?: string;
				};
				Relationships: [];
			};
			category: {
				Row: {
					color: string | null;
					created_at: string;
					id: number;
					memo_count: number | null;
					name: string;
					user_id: string | null;
				};
				Insert: {
					color?: string | null;
					created_at?: string;
					id?: number;
					memo_count?: number | null;
					name: string;
					user_id?: string | null;
				};
				Update: {
					color?: string | null;
					created_at?: string;
					id?: number;
					memo_count?: number | null;
					name?: string;
					user_id?: string | null;
				};
				Relationships: [];
			};
			favorite: {
				Row: {
					created_at: string;
					favIconUrl: string | null;
					id: number;
					page_key: string;
					title: string;
					url: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					favIconUrl?: string | null;
					id?: never;
					page_key: string;
					title?: string;
					url: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					favIconUrl?: string | null;
					id?: never;
					page_key?: string;
					title?: string;
					url?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			highlight: {
				Row: {
					color: string;
					created_at: string;
					exact_text: string;
					favIconUrl: string | null;
					id: number;
					note: string | null;
					page_key: string;
					prefix_text: string | null;
					suffix_text: string | null;
					text_position_start: number | null;
					title: string | null;
					updated_at: string;
					url: string;
					user_id: string;
				};
				Insert: {
					color?: string;
					created_at?: string;
					exact_text: string;
					favIconUrl?: string | null;
					id?: never;
					note?: string | null;
					page_key?: string;
					prefix_text?: string | null;
					suffix_text?: string | null;
					text_position_start?: number | null;
					title?: string | null;
					updated_at?: string;
					url: string;
					user_id: string;
				};
				Update: {
					color?: string;
					created_at?: string;
					exact_text?: string;
					favIconUrl?: string | null;
					id?: never;
					note?: string | null;
					page_key?: string;
					prefix_text?: string | null;
					suffix_text?: string | null;
					text_position_start?: number | null;
					title?: string | null;
					updated_at?: string;
					url?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			highlight_memo_source: {
				Row: {
					color: string;
					exact_text: string;
					highlight_id: number | null;
					memo_id: number;
					prefix_text: string | null;
					suffix_text: string | null;
					text_position_start: number | null;
					url: string;
					user_id: string;
				};
				Insert: {
					color: string;
					exact_text: string;
					highlight_id?: number | null;
					memo_id: number;
					prefix_text?: string | null;
					suffix_text?: string | null;
					text_position_start?: number | null;
					url: string;
					user_id: string;
				};
				Update: {
					color?: string;
					exact_text?: string;
					highlight_id?: number | null;
					memo_id?: number;
					prefix_text?: string | null;
					suffix_text?: string | null;
					text_position_start?: number | null;
					url?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "highlight_memo_source_highlight_id_fkey";
						columns: ["highlight_id"];
						isOneToOne: true;
						referencedRelation: "highlight";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "highlight_memo_source_memo_id_fkey";
						columns: ["memo_id"];
						isOneToOne: true;
						referencedRelation: "memo";
						referencedColumns: ["id"];
					},
				];
			};
			memo: {
				Row: {
					actionItem: string | null;
					bookmark_count: number | null;
					category_id: number | null;
					comment_count: number | null;
					created_at: string | null;
					deleted_at: string | null;
					favIconUrl: string | null;
					id: number;
					impression: string | null;
					is_public: boolean | null;
					isReading: boolean | null;
					isStar: boolean | null;
					isWish: boolean | null;
					like_count: number | null;
					memo: string;
					page_key: string;
					shared_at: string | null;
					title: string;
					updated_at: string | null;
					url: string;
					user_id: string;
				};
				Insert: {
					actionItem?: string | null;
					bookmark_count?: number | null;
					category_id?: number | null;
					comment_count?: number | null;
					created_at?: string | null;
					deleted_at?: string | null;
					favIconUrl?: string | null;
					id?: number;
					impression?: string | null;
					is_public?: boolean | null;
					isReading?: boolean | null;
					isStar?: boolean | null;
					isWish?: boolean | null;
					like_count?: number | null;
					memo: string;
					page_key?: string;
					shared_at?: string | null;
					title: string;
					updated_at?: string | null;
					url: string;
					user_id?: string;
				};
				Update: {
					actionItem?: string | null;
					bookmark_count?: number | null;
					category_id?: number | null;
					comment_count?: number | null;
					created_at?: string | null;
					deleted_at?: string | null;
					favIconUrl?: string | null;
					id?: number;
					impression?: string | null;
					is_public?: boolean | null;
					isReading?: boolean | null;
					isStar?: boolean | null;
					isWish?: boolean | null;
					like_count?: number | null;
					memo?: string;
					page_key?: string;
					shared_at?: string | null;
					title?: string;
					updated_at?: string | null;
					url?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "memo_category_id_fkey";
						columns: ["category_id"];
						isOneToOne: false;
						referencedRelation: "category";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "memo_category_id_fkey";
						columns: ["category_id"];
						isOneToOne: false;
						referencedRelation: "category_with_count";
						referencedColumns: ["id"];
					},
				];
			};
			notice: {
				Row: {
					body_en: string;
					body_ko: string;
					created_at: string;
					ends_at: string | null;
					id: number;
					link_label_en: string | null;
					link_label_ko: string | null;
					link_target: string | null;
					starts_at: string | null;
					title_en: string;
					title_ko: string;
				};
				Insert: {
					body_en: string;
					body_ko: string;
					created_at?: string;
					ends_at?: string | null;
					id?: never;
					link_label_en?: string | null;
					link_label_ko?: string | null;
					link_target?: string | null;
					starts_at?: string | null;
					title_en: string;
					title_ko: string;
				};
				Update: {
					body_en?: string;
					body_ko?: string;
					created_at?: string;
					ends_at?: string | null;
					id?: never;
					link_label_en?: string | null;
					link_label_ko?: string | null;
					link_target?: string | null;
					starts_at?: string | null;
					title_en?: string;
					title_ko?: string;
				};
				Relationships: [];
			};
			notification_log: {
				Row: {
					id: number;
					memo_id: number;
					notifyTime: string | null;
					sent_at: string;
					user_id: string;
				};
				Insert: {
					id?: number;
					memo_id: number;
					notifyTime?: string | null;
					sent_at?: string;
					user_id: string;
				};
				Update: {
					id?: number;
					memo_id?: number;
					notifyTime?: string | null;
					sent_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "notification_log_memo_id_fkey";
						columns: ["memo_id"];
						isOneToOne: false;
						referencedRelation: "memo";
						referencedColumns: ["id"];
					},
				];
			};
			notification_schedule: {
				Row: {
					created_at: string;
					id: number;
					isEnabled: boolean;
					notifyTime: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					id?: number;
					isEnabled?: boolean;
					notifyTime: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: number;
					isEnabled?: boolean;
					notifyTime?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			notification_setting: {
				Row: {
					isEnabled: boolean;
					notifyTime: string;
					timezone: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					isEnabled?: boolean;
					notifyTime?: string;
					timezone?: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					isEnabled?: boolean;
					notifyTime?: string;
					timezone?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			profiles: {
				Row: {
					avatar_url: string | null;
					bio: string | null;
					created_at: string | null;
					follower_count: number | null;
					following_count: number | null;
					nickname: string | null;
					role: string;
					share_mode: string | null;
					updated_at: string | null;
					user_id: string;
					website: string | null;
				};
				Insert: {
					avatar_url?: string | null;
					bio?: string | null;
					created_at?: string | null;
					follower_count?: number | null;
					following_count?: number | null;
					nickname?: string | null;
					role?: string;
					share_mode?: string | null;
					updated_at?: string | null;
					user_id: string;
					website?: string | null;
				};
				Update: {
					avatar_url?: string | null;
					bio?: string | null;
					created_at?: string | null;
					follower_count?: number | null;
					following_count?: number | null;
					nickname?: string | null;
					role?: string;
					share_mode?: string | null;
					updated_at?: string | null;
					user_id?: string;
					website?: string | null;
				};
				Relationships: [];
			};
			push_token: {
				Row: {
					id: number;
					platform: string;
					token: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					id?: number;
					platform: string;
					token: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					id?: number;
					platform?: string;
					token?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			setting: {
				Row: {
					id: number;
					show_action_item: boolean;
					show_ai_chat: boolean;
					show_impression: boolean;
					show_summary: boolean;
					truncate_memo_content: boolean;
					user_id: string | null;
				};
				Insert: {
					id?: number;
					show_action_item?: boolean;
					show_ai_chat?: boolean;
					show_impression?: boolean;
					show_summary?: boolean;
					truncate_memo_content?: boolean;
					user_id?: string | null;
				};
				Update: {
					id?: number;
					show_action_item?: boolean;
					show_ai_chat?: boolean;
					show_impression?: boolean;
					show_summary?: boolean;
					truncate_memo_content?: boolean;
					user_id?: string | null;
				};
				Relationships: [];
			};
		};
		Views: {
			category_with_count: {
				Row: {
					color: string | null;
					created_at: string | null;
					id: number | null;
					memo_count: number | null;
					name: string | null;
					user_id: string | null;
				};
				Relationships: [];
			};
		};
		Functions: {
			blog_assert_lease: {
				Args: {
					p_blog_id: string;
					p_generation: number;
					p_lease_token: string;
				};
				Returns: {
					blog_id: string;
					checkpoint: Json | null;
					collected_count: number;
					generation: number;
					initial_completed_at: string | null;
					last_error: string | null;
					last_started_at: string | null;
					last_success_at: string | null;
					lease_expires_at: string | null;
					lease_seconds: number;
					lease_token: string | null;
					reported_total: number | null;
					status: string;
				};
				SetofOptions: {
					from: "*";
					to: "blog_sync_state";
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			blog_completed_articles: {
				Args: { p_blog_ids: string[] };
				Returns: {
					blog_id: string;
					memo_id: number;
					provider_id: string;
				}[];
			};
			blog_medium_post_id: { Args: { p_url: string }; Returns: string };
			blog_next_check_at: { Args: never; Returns: string };
			blog_page_key: { Args: { p_url: string }; Returns: string };
			blog_sources_json: { Args: { p_blog_ids: string[] }; Returns: Json };
			blog_sync_public_status: {
				Args: { p_blog_ids: string[] };
				Returns: {
					blog_id: string;
					collected_count: number;
					initial_completed_at: string;
					last_error: string;
					last_success_at: string;
					phase: string;
					resume_queued: boolean;
					status: string;
					total: number;
				}[];
			};
			blog_url_allowed: {
				Args: { p_blog_id: string; p_is_alias?: boolean; p_url: string };
				Returns: boolean;
			};
			blog_valid_memo_keys: {
				Args: never;
				Returns: {
					match_key: string;
					medium_id: string;
					memo_id: number;
				}[];
			};
			claim_blog_sync: {
				Args: {
					p_blog_id: string;
					p_force?: boolean;
					p_lease_seconds?: number;
					p_trigger: string;
				};
				Returns: Json;
			};
			create_memo_from_highlight: {
				Args: { p_highlight_id: number; p_memo: string };
				Returns: Json;
			};
			fail_blog_sync: {
				Args: {
					p_blog_id: string;
					p_checkpoint?: Json;
					p_error_code: string;
					p_generation: number;
					p_keep_checkpoint?: boolean;
					p_lease_token: string;
				};
				Returns: Json;
			};
			finish_blog_sync: {
				Args: {
					p_blog_id: string;
					p_evidence: Json;
					p_generation: number;
					p_lease_token: string;
				};
				Returns: Json;
			};
			get_active_users_stats: {
				Args: { include_admin?: boolean };
				Returns: Json;
			};
			get_admin_feedback: { Args: { feedback_id: number }; Returns: Json };
			get_admin_feedbacks: {
				Args: {
					page_limit?: number;
					page_offset?: number;
					search_query?: string;
				};
				Returns: Json;
			};
			get_admin_stats: { Args: { include_admin?: boolean }; Returns: Json };
			get_admin_users: { Args: { search_query?: string }; Returns: Json };
			get_blog_reading_page: {
				Args: {
					p_blog_id?: string;
					p_catalog_version?: string;
					p_cursor?: Json;
					p_page_size?: number;
					p_sort?: string;
				};
				Returns: Json;
			};
			get_blog_reading_summary: { Args: never; Returns: Json };
			get_highlight_counts: {
				Args: { target_urls: string[] };
				Returns: {
					count: number;
					url: string;
				}[];
			};
			get_highlight_counts_by_page_keys: {
				Args: { target_page_keys: string[] };
				Returns: {
					count: number;
					page_key: string;
				}[];
			};
			get_memo_count: { Args: never; Returns: number };
			get_public_stats: { Args: never; Returns: Json };
			get_user_growth: {
				Args: { days_ago?: number; include_admin?: boolean };
				Returns: Json;
			};
			has_blog_memo_text: { Args: { p_text: string }; Returns: boolean };
			ingest_blog_batch: {
				Args: {
					p_blog_id: string;
					p_generation: number;
					p_items: Json;
					p_lease_token: string;
				};
				Returns: Json;
			};
			is_supported_blog: { Args: { p_blog_id: string }; Returns: boolean };
			request_blog_sync: { Args: { p_blog_id: string }; Returns: Json };
			save_blog_checkpoint: {
				Args: {
					p_blog_id: string;
					p_checkpoint: Json;
					p_generation: number;
					p_lease_token: string;
				};
				Returns: Json;
			};
			set_blog_subscription: {
				Args: { p_active: boolean; p_blog_id: string };
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	feedback: {
		Enums: {},
	},
	memo: {
		Enums: {},
	},
} as const;
