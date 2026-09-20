"use client";
import { setTag, setUser } from "@sentry/nextjs";
import type { Language } from "@src/modules/i18n";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { useEffect } from "react";

interface InitSentryUserInfoProps {
	lng?: Language;
}

/**
 * 로그인한 사용자의 정보를 Sentry 스코프에 붙인다.
 *
 * @description 사용자 조회 쿼리(네트워크)를 기다리지 않고 Supabase가 로컬에 가진 세션에서 읽는다.
 * 쿼리를 기다리면 다른 쿼리가 먼저 실패하거나 네트워크가 끊겨 사용자 조회 자체가 실패했을 때
 * 그 오류 이벤트에 사용자가 붙지 않는다.
 */
export default function InitSentryUserInfo({ lng }: InitSentryUserInfoProps) {
	const { data: supabaseClient } = useSupabaseClientQuery();

	useEffect(() => {
		const {
			data: { subscription },
		} = supabaseClient.auth.onAuthStateChange((_event, session) => {
			setUser({
				username: session?.user?.identities?.[0]?.identity_data?.name,
				email: session?.user?.email,
				id: session?.user?.id,
				ip_address: "{{auto}}",
			});
		});

		return () => subscription.unsubscribe();
	}, [supabaseClient]);

	useEffect(() => {
		setTag("lng", lng ?? "");
	}, [lng]);

	return null;
}
