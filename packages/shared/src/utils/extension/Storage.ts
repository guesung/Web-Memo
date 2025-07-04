import type { Session } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import { SUPABASE } from "../../constants";

export const getSession = async () => {
	const cookie = await chrome.cookies.get({
		name: SUPABASE.authToken,
		url: CONFIG.webUrl,
	});
	if (!cookie) return;

	return JSON.parse(cookie.value) as Session;
};

export const removeSession = async () => {
	await chrome.cookies.remove({
		name: SUPABASE.authToken,
		url: CONFIG.webUrl,
	});
};
