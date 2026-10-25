import type { MemoSupabaseClient } from "../../types";

/** 인증 사용자와 로그인 상태를 조회한다. */
export class AuthService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	getUser = () => this.supabaseClient.auth.getUser();

	checkUserLogin = async () => {
		const user = await this.supabaseClient.auth.getUser();
		return !!user?.data?.user;
	};

	signout = () => this.supabaseClient.auth.signOut();
}
