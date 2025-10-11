"use client";

import { useEffect } from "react";
import useSupabaseUserQuery from "../../hooks/supabase/queries/useSupabaseUserQuery";
import { analytics } from "./Analytics";

export function AnalyticsUserTracking() {
	const { user } = useSupabaseUserQuery();

	useEffect(() => {
		const userId = user?.data?.user?.id;
		analytics.setUserId(userId);
	}, [user]);

	return null;
}
