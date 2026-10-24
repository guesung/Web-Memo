#!/usr/bin/env node
/** GA4 공지 ID 이벤트 차원을 한 번만 등록하고 실제 설정을 다시 확인한다. */
import { pathToFileURL } from "node:url";
import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";
import { requestJson } from "../shared/http.mjs";
import { requireEnv } from "../shared/run-context.mjs";

const SCOPE = "https://www.googleapis.com/auth/analytics.edit";

export async function registerNoticeDimension({ propertyId, serviceAccountJson }) {
	const accessToken = await exchangeServiceAccountToken({ serviceAccount: JSON.parse(serviceAccountJson), scope: SCOPE });
	const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/customDimensions`;
	const headers = { authorization: `Bearer ${accessToken}` };
	const list = async () => {
		const dimensions = [];
		let pageToken;
		do {
			const page = await requestJson(`${url}?${new URLSearchParams({ pageSize: "200", ...(pageToken ? { pageToken } : {}) })}`, { headers });
			dimensions.push(...(page.customDimensions ?? []));
			pageToken = page.nextPageToken;
		} while (pageToken);
		return dimensions;
	};
	const existing = (await list()).find((item) => item.parameterName === "notice_id" && item.scope === "EVENT");
	if (existing) return { status: "already_registered", name: existing.name };

	const created = await requestJson(url, {
		method: "POST",
		headers: { ...headers, "content-type": "application/json" },
		body: JSON.stringify({
			parameterName: "notice_id",
			displayName: "Notice ID",
			description: "Notice identifier for exposure and return events",
			scope: "EVENT",
		}),
	});
	const verified = (await list()).find((item) => item.name === created.name && item.parameterName === "notice_id" && item.scope === "EVENT");
	if (!verified) throw new Error("notice_id 차원 생성 응답을 받았지만 재조회에서 확인하지 못했습니다");
	return { status: "created", name: verified.name };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		const result = await registerNoticeDimension({
			propertyId: requireEnv("GA4_PROPERTY_ID"),
			serviceAccountJson: requireEnv("GA4_SERVICE_ACCOUNT_JSON"),
		});
		console.log(JSON.stringify(result));
	} catch (error) {
		console.error(`오류: ${error.message}`);
		process.exitCode = 1;
	}
}
