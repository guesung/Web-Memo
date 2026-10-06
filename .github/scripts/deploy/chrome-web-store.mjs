/**
 * Chrome 웹스토어 API v2 호출 모음.
 *
 * 확장 업로드(upload-extension-to-store.mjs)와 스토어 버전 조회(store-versions.mjs)가 함께 씁니다.
 * v1은 2026-10-15에 종료되므로 모든 호출이 v2 경로(publishers/<게시자>/items/<확장>)를 씁니다.
 * https://developer.chrome.com/docs/webstore/api
 */

import { requestJson } from "../shared/http.mjs";

const API_ORIGIN = "https://chromewebstore.googleapis.com";

/** 업로드가 끝났는지 물어보는 간격과 최대 횟수. 큰 패키지도 보통 수 초 안에 끝납니다. */
const UPLOAD_POLL_INTERVAL_MS = 5_000;
const UPLOAD_POLL_MAX_ATTEMPTS = 36;

/** 게시 요청이 돌려주는 상태 중 "이 버전이 스토어에서 살아 있지 않다"는 뜻인 것들. */
const FAILED_ITEM_STATES = ["REJECTED", "CANCELLED"];

const sleepFor = (milliseconds) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));

const authorization = (accessToken) => ({
	authorization: `Bearer ${accessToken}`,
});

/** API가 항목을 가리키는 이름. `publishers/<게시자 ID>/items/<확장 ID>` */
export const toItemName = ({ publisherId, extensionId }) =>
	`publishers/${publisherId}/items/${extensionId}`;

/**
 * 게시본과 심사 중인 버전의 상태.
 * 읽기 전용이라 자격 증명과 게시자 ID가 맞는지 확인하는 데도 씁니다.
 */
export const fetchItemStatus = async ({ accessToken, itemName }) =>
	await requestJson(`${API_ORIGIN}/v2/${itemName}:fetchStatus`, {
		headers: authorization(accessToken),
	});

/** zip을 그대로 본문에 실어 올립니다. 매니페스트 버전이 이전보다 커야 성공합니다. */
export const uploadPackage = async ({ accessToken, itemName, zip }) =>
	await requestJson(`${API_ORIGIN}/upload/v2/${itemName}:upload`, {
		method: "POST",
		headers: authorization(accessToken),
		body: zip,
	});

/** 심사를 통과하는 즉시 게시되도록 제출합니다(DEFAULT_PUBLISH). 공개 범위는 대시보드 설정을 따릅니다. */
export const publishItem = async ({ accessToken, itemName }) =>
	await requestJson(`${API_ORIGIN}/v2/${itemName}:publish`, {
		method: "POST",
		headers: { ...authorization(accessToken), "content-type": "application/json" },
		body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
	});

/**
 * 업로드가 IN_PROGRESS로 끝나면 SUCCEEDED나 FAILED가 될 때까지 상태를 물어봅니다.
 * lastAsyncUploadState는 최근 24시간의 업로드만 보여 줍니다.
 */
export const waitForUpload = async ({
	accessToken,
	itemName,
	sleep = sleepFor,
}) => {
	for (let attempt = 1; attempt <= UPLOAD_POLL_MAX_ATTEMPTS; attempt += 1) {
		await sleep(UPLOAD_POLL_INTERVAL_MS);

		const status = await fetchItemStatus({ accessToken, itemName });
		const uploadState = status.lastAsyncUploadState;

		if (uploadState === "SUCCEEDED" || uploadState === "FAILED") {
			return uploadState;
		}
	}

	throw new Error(
		`업로드가 ${(UPLOAD_POLL_INTERVAL_MS * UPLOAD_POLL_MAX_ATTEMPTS) / 1000}초 안에 끝나지 않았습니다`,
	);
};

/**
 * 업로드하고 게시를 제출합니다. 어느 단계든 실패하면 던집니다.
 * 업로드가 실패했는데 게시를 제출하면 이전 버전이 다시 제출될 수 있어 그 사이에서 멈춥니다.
 */
export const uploadAndPublish = async ({
	accessToken,
	itemName,
	zip,
	sleep,
}) => {
	const uploaded = await uploadPackage({ accessToken, itemName, zip });
	const uploadState =
		uploaded.uploadState === "IN_PROGRESS"
			? await waitForUpload({ accessToken, itemName, sleep })
			: uploaded.uploadState;

	if (uploadState !== "SUCCEEDED") {
		throw new Error(
			`업로드가 ${uploadState}로 끝났습니다(매니페스트 버전이 이전보다 커야 합니다): ${JSON.stringify(uploaded)}`,
		);
	}

	const published = await publishItem({ accessToken, itemName });

	if (FAILED_ITEM_STATES.includes(published.state)) {
		throw new Error(`게시 제출이 ${published.state}입니다: ${JSON.stringify(published)}`);
	}

	return { crxVersion: uploaded.crxVersion, publishState: published.state };
};
