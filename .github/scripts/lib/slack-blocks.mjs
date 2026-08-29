/**
 * Slack Block Kit 페이로드 조립.
 *
 * 버튼의 value는 apps/web의 /api/slack/interactivity가 그대로 파싱합니다.
 * 여기 스키마를 바꾸면 그쪽 파서도 같이 고쳐야 합니다.
 */

import { readAppConfig, readExtensionVersion } from "./repo-versions.mjs";

const CHANNEL_LABELS = {
	ios: "📱 iOS",
	android: "🤖 Android",
	extension: "🧩 확장",
	web: "🌐 웹",
};

/** 스토어 값이 없거나 조회에 실패했을 때 자리를 비우지 않고 이유를 보여줍니다. */
const describeUnavailable = (channelVersion) => {
	if (channelVersion?.error) return "_조회 실패_";
	if (channelVersion?.skipped) return "_자격 증명 없음_";

	return "_알 수 없음_";
};

const describeIos = (store, builtVersion) => {
	if (!store || store.error || store.skipped) {
		return `${describeUnavailable(store)} → 빌드 \`${builtVersion}\``;
	}

	const testFlight = store.testFlight
		? `TestFlight \`${store.testFlight.version} (${store.testFlight.build})\``
		: "TestFlight _없음_";
	const appStore = store.appStore
		? `App Store \`${store.appStore.version}\``
		: "App Store _없음_";

	return `${testFlight} · ${appStore} → 빌드 \`${builtVersion}\``;
};

const describeAndroid = (store, builtVersion) => {
	if (!Array.isArray(store) || store.length === 0) {
		return `${describeUnavailable(store)} → 빌드 \`${builtVersion}\``;
	}

	const tracks = store
		.map(({ track, version, versionCode }) => {
			const code = versionCode ? ` (${versionCode})` : "";

			return `${track} \`${version}${code}\``;
		})
		.join(" · ");

	return `${tracks} → 빌드 \`${builtVersion}\``;
};

const describeExtension = (store, builtVersion) => {
	if (!store || store.error || store.skipped) {
		return `${describeUnavailable(store)} → 빌드 \`${builtVersion}\``;
	}

	const published = store.published ? `\`${store.published}\`` : "_없음_";
	// 업로드는 됐지만 게시 버튼을 안 누른 상태를 드러내는 게 이 줄의 목적입니다.
	const draft = store.draft?.version
		? `초안 \`${store.draft.version}\` (${store.draft.uploadState})`
		: `초안 ${describeUnavailable(store.draft)}`;

	return `게시 ${published} · ${draft} → 빌드 \`${builtVersion}\``;
};

const describeWeb = (store, builtCommit) => {
	if (!store || store.error || store.skipped) {
		return `${describeUnavailable(store)} → 빌드 \`${builtCommit}\``;
	}

	return `배포 \`${store.commit?.slice(0, 7) ?? "?"}\` → 빌드 \`${builtCommit}\``;
};

/** 스토어 현황 + 레포의 빌드 버전을 한 덩어리로 대조합니다. */
export const buildVersionSection = ({ storeVersions, commitSha }) => {
	const { version: appVersion } = readAppConfig();
	const extensionVersion = readExtensionVersion();
	const shortSha = commitSha.slice(0, 7);

	const lines = [
		`${CHANNEL_LABELS.ios}  ${describeIos(storeVersions.ios, appVersion)}`,
		`${CHANNEL_LABELS.android}  ${describeAndroid(storeVersions.android, appVersion)}`,
		`${CHANNEL_LABELS.extension}  ${describeExtension(storeVersions.extension, extensionVersion)}`,
		`${CHANNEL_LABELS.web}  ${describeWeb(storeVersions.web, shortSha)}`,
	];

	return {
		type: "section",
		text: { type: "mrkdwn", text: lines.join("\n") },
	};
};

/**
 * 스토어 제출은 되돌리기 어렵고 채널에 그대로 노출되므로,
 * 한 번 더 묻는 confirm을 답니다. 클릭 수는 그대로 하나입니다.
 */
const buildDeployButton = ({ label, target, ref }) => ({
	type: "button",
	action_id: `deploy_${target}`,
	text: { type: "plain_text", text: label, emoji: true },
	value: JSON.stringify({ target, ref }),
	style: "primary",
	confirm: {
		title: { type: "plain_text", text: "배포할까요?" },
		text: {
			type: "mrkdwn",
			text: `*${label}* — \`${ref.slice(0, 7)}\` 을 스토어에 올립니다.`,
		},
		confirm: { type: "plain_text", text: "배포" },
		deny: { type: "plain_text", text: "취소" },
	},
});

const DEPLOY_TARGETS = [
	{ target: "app", label: "📱 앱 배포" },
	{ target: "web", label: "🌐 웹 배포" },
	{ target: "extension", label: "🧩 확장 배포" },
];

/**
 * 배포 버튼 줄을 만듭니다.
 *
 * @param targets 버튼을 노출할 대상 목록. 빌드 알림에서는 방금 빌드가 성공한 것만
 *   넘깁니다 — 빌드도 안 된 커밋을 올리는 길을 열어두지 않기 위해서입니다.
 */
export const buildActionBlock = ({ targets, ref, linkUrl, linkLabel }) => {
	const elements = DEPLOY_TARGETS.filter(({ target }) =>
		targets.includes(target),
	).map(({ target, label }) => buildDeployButton({ label, target, ref }));

	elements.push({
		type: "button",
		action_id: "deploy_custom",
		text: { type: "plain_text", text: "다른 버전…", emoji: true },
		value: JSON.stringify({ ref }),
	});

	if (linkUrl) {
		elements.push({
			type: "button",
			action_id: "open_link",
			text: { type: "plain_text", text: linkLabel ?? "GitHub에서 보기", emoji: true },
			url: linkUrl,
		});
	}

	return { type: "actions", elements };
};

/** Incoming Webhook으로 페이로드를 보냅니다. 실패는 조용히 넘기지 않습니다. */
export const postToSlack = async (webhookUrl, payload) => {
	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(
			`Slack 전송 실패: ${response.status} ${await response.text()}`,
		);
	}
};
