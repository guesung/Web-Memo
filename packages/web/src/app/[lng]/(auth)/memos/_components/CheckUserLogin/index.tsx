"use client";

import { PATHS } from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { AuthService } from "@web-memo/shared/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CheckUserLogin() {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const router = useRouter();

	useEffect(() => {
		const checkUserLogin = async () => {
			const isUserLogin = await new AuthService(
				supabaseClient,
			).checkUserLogin();

			if (!isUserLogin) router.replace(PATHS.login);
		};

		checkUserLogin();
	}, [supabaseClient, router]);

	return null;
}
