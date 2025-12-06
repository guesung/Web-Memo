export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	feedback: {
		Tables: {
			feedbacks: {
				Row: {
					content: string | null;
					created_at: string;
					id: number;
					user_id: string | null;
				};
				Insert: {
					content?: string | null;
					created_at?: string;
					id?: number;
					user_id?: string | null;
				};
				Update: {
					content?: string | null;
					created_at?: string;
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
			memo: {
				Row: {
					category_id: number | null;
					created_at: string | null;
					favIconUrl: string | null;
					id: number;
					isWish: boolean | null;
					is_public: boolean | null;
					memo: string;
					shared_at: string | null;
					title: string;
					updated_at: string | null;
					url: string;
					user_id: string;
				};
				Insert: {
					category_id?: number | null;
					created_at?: string | null;
					favIconUrl?: string | null;
					id?: number;
					isWish?: boolean | null;
					is_public?: boolean | null;
					memo: string;
					shared_at?: string | null;
					title: string;
					updated_at?: string | null;
					url: string;
					user_id?: string;
				};
				Update: {
					category_id?: number | null;
					created_at?: string | null;
					favIconUrl?: string | null;
					id?: number;
					isWish?: boolean | null;
					is_public?: boolean | null;
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
				];
			};
			profiles: {
				Row: {
					avatar_url: string | null;
					bio: string | null;
					created_at: string | null;
					nickname: string | null;
					share_mode: string | null;
					updated_at: string | null;
					user_id: string;
					website: string | null;
				};
				Insert: {
					avatar_url?: string | null;
					bio?: string | null;
					created_at?: string | null;
					nickname?: string | null;
					share_mode?: string | null;
					updated_at?: string | null;
					user_id: string;
					website?: string | null;
				};
				Update: {
					avatar_url?: string | null;
					bio?: string | null;
					created_at?: string | null;
					nickname?: string | null;
					share_mode?: string | null;
					updated_at?: string | null;
					user_id?: string;
					website?: string | null;
				};
				Relationships: [];
			};
			setting: {
				Row: {
					id: number;
					user_id: string | null;
				};
				Insert: {
					id?: number;
					user_id?: string | null;
				};
				Update: {
					id?: number;
					user_id?: string | null;
				};
				Relationships: [];
			};
			memo_likes: {
				Row: {
					id: number;
					memo_id: number;
					user_id: string;
					created_at: string;
				};
				Insert: {
					id?: number;
					memo_id: number;
					user_id: string;
					created_at?: string;
				};
				Update: {
					id?: number;
					memo_id?: number;
					user_id?: string;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "memo_likes_memo_id_fkey";
						columns: ["memo_id"];
						isOneToOne: false;
						referencedRelation: "memo";
						referencedColumns: ["id"];
					},
				];
			};
			memo_bookmarks: {
				Row: {
					id: number;
					memo_id: number;
					user_id: string;
					created_at: string;
				};
				Insert: {
					id?: number;
					memo_id: number;
					user_id: string;
					created_at?: string;
				};
				Update: {
					id?: number;
					memo_id?: number;
					user_id?: string;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "memo_bookmarks_memo_id_fkey";
						columns: ["memo_id"];
						isOneToOne: false;
						referencedRelation: "memo";
						referencedColumns: ["id"];
					},
				];
			};
			memo_comments: {
				Row: {
					id: number;
					memo_id: number;
					user_id: string;
					content: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: number;
					memo_id: number;
					user_id: string;
					content: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: number;
					memo_id?: number;
					user_id?: string;
					content?: string;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "memo_comments_memo_id_fkey";
						columns: ["memo_id"];
						isOneToOne: false;
						referencedRelation: "memo";
						referencedColumns: ["id"];
					},
				];
			};
			user_follows: {
				Row: {
					id: number;
					follower_id: string;
					following_id: string;
					created_at: string;
				};
				Insert: {
					id?: number;
					follower_id: string;
					following_id: string;
					created_at?: string;
				};
				Update: {
					id?: number;
					follower_id?: string;
					following_id?: string;
					created_at?: string;
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
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
		| { schema: keyof Database },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof Database },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
	? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
