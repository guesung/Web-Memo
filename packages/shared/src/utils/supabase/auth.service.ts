import type { MemoSupabaseClient } from "../../types";
import { BaseSupabaseService } from "./base.service";

/**
 * AuthService - 인증 관련 Supabase 작업을 처리하는 서비스
 */
export class AuthService extends BaseSupabaseService {
	constructor(supabaseClient: MemoSupabaseClient) {
		super(supabaseClient);
	}

	getUser = () => this.supabaseClient.auth.getUser();

	checkUserLogin = async () => {
		const user = await this.supabaseClient.auth.getUser();
		return !!user?.data?.user;
	};

	signout = () => this.supabaseClient.auth.signOut();
}
