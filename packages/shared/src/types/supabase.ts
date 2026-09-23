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
			highlight: {
				Row: {
					color: string;
					created_at: string;
					exact_text: string;
					favIconUrl: string | null;
					id: number;
					note: string | null;
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
					sent_at: string;
					user_id: string;
				};
				Insert: {
					id?: number;
					memo_id: number;
					sent_at?: string;
					user_id: string;
				};
				Update: {
					id?: number;
					memo_id?: number;
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
					show_impression: boolean;
					user_id: string | null;
				};
				Insert: {
					id?: number;
					show_action_item?: boolean;
					show_impression?: boolean;
					user_id?: string | null;
				};
				Update: {
					id?: number;
					show_action_item?: boolean;
					show_impression?: boolean;
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
			get_highlight_counts: {
				Args: { target_urls: string[] };
				Returns: {
					count: number;
					url: string;
				}[];
			};
			get_memo_count: { Args: never; Returns: number };
			get_public_stats: { Args: never; Returns: Json };
			get_user_growth: {
				Args: { days_ago?: number; include_admin?: boolean };
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
