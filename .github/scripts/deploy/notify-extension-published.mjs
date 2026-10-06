#!/usr/bin/env node
/**
 * 레포의 확장 버전이 크롬 웹스토어에 게시되면 Slack으로 한 번 알립니다.
 * .github/workflows/notify-extension-published.yml 이 30분마다 호출합니다.
 *
 * 웹스토어에는 심사 완료 웹훅이 없어 폴링만 가능합니다. release.yml은 제출까지만 알리므로,
 * "심사를 통과해 사용자에게 실제로 나갔다"는 시점은 이 스크립트가 게시본을 대조해 알아냅니다.
 *
 * 같은 버전을 반복해서 알리지 않는 판정은 워크플로가 캐시로 합니다. 이 스크립트는 알렸으면
 * GITHUB_OUTPUT에 notified=true를 적고, 워크플로가 그걸 보고 캐시에 표시를 남깁니다.
 * 그래서 Slack 전송이 실패하면 notified를 적지 않습니다. 다음 실행이 다시 시도합니다.
 *
 * 조회·전송 실패는 ::warning::만 남기고 exit 0입니다. 30분마다 도는 잡이라 일시 오류를
 * 실패로 올리면 Actions 실패 메일이 쌓이고, 다음 실행이 어차피 다시 봅니다.
 *
 * 로컬 실행 (SLACK_WEBHOOK_URL 없이 돌리면 판정과 페이로드만 stdout에 찍습니다):
 *   node .github/scripts/deploy/notify-extension-published.mjs
 */

import { appendFileSync } from "node:fs";

import {
	readExtensionId,
	readExtensionVersion,
} from "../shared/repo-versions.mjs";
import { postToSlack } from "../shared/slack-blocks.mjs";
import { fetchExtensionVersions } from "./store-versions.mjs";

/** 사용자가 보는 웹스토어 상세 페이지. 주소 규칙은 packages/shared의 ExternalLink.ts와 같습니다. */
const toListingUrl = (extensionId) =>
	`https://chromewebstore.google.com/detail/web-memo/${extensionId}`;

const buildPublishedPayload = ({ version, listingUrl }) => ({
	text: `🧩 확장 v${version} 웹스토어 게시 완료`,
	blocks: [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: `*🧩 확장 v${version} 웹스토어 게시 완료*\n심사를 통과해 사용자에게 배포되기 시작했습니다. <${listingUrl}|웹스토어에서 보기>`,
			},
		},
	],
});

/** 워크플로 밖(로컬)에서는 GITHUB_OUTPUT이 없으므로 건너뜁니다. */
const writeOutput = (name, value) => {
	if (!process.env.GITHUB_OUTPUT) return;

	appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
};

const main = async () => {
	const repoVersion = readExtensionVersion();

	// 게시본은 공개 업데이트 매니페스트라 토큰이 필요 없습니다. 초안까지 보려고 토큰을 넘기면
	// 이 잡에 웹스토어 자격 증명이 늘어나기만 하므로 일부러 넘기지 않습니다.
	let published = null;

	try {
		({ published } = await fetchExtensionVersions({}));
	} catch (error) {
		console.warn(`::warning::웹스토어 게시 버전 조회 실패: ${error.message}`);

		return;
	}

	console.log(`게시 ${published ?? "(없음)"} · 레포 ${repoVersion}`);

	if (published !== repoVersion) {
		return;
	}

	const payload = buildPublishedPayload({
		version: published,
		listingUrl: toListingUrl(readExtensionId()),
	});

	if (!process.env.SLACK_WEBHOOK_URL) {
		console.log(JSON.stringify(payload, null, 2));

		return;
	}

	try {
		await postToSlack(process.env.SLACK_WEBHOOK_URL, payload);
	} catch (error) {
		console.warn(`::warning::${error.message}`);

		return;
	}

	writeOutput("notified", "true");
};

await main();
