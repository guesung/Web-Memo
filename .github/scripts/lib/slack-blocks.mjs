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

/**
 * 보여줄 Play 트랙과 그 라벨.
 *
 * Play API는 과거에 만든 트랙까지 전부 돌려주는데, 릴리스 이름이 버전이 아니라
 * 임의 문자열("웹 메모")인 경우가 많아 줄만 길어지고 읽히지 않습니다.
 * 우리가 올리는 곳(internal)과 실사용자에게 나간 것(production)만 남겨
 * iOS의 `TestFlight · App Store`와 대칭을 맞춥니다.
 */
const ANDROID_TRACKS = [
	{ track: "internal", label: "내부 테스트" },
	{ track: "production", label: "프로덕션" },
];

const describeAndroid = (store, builtVersion) => {
	if (!Array.isArray(store) || store.length === 0) {
		return `${describeUnavailable(store)} → 빌드 \`${builtVersion}\``;
	}

	const tracks = ANDROID_TRACKS.map(({ track, label }) => {
		const release = store.find((candidate) => candidate.track === track);

		if (!release) return `${label} _없음_`;

		const code = release.versionCode ? ` (${release.versionCode})` : "";

		return `${label} \`${release.version}${code}\``;
	}).join(" · ");

	return `${tracks} → 빌드 \`${builtVersion}\``;
};

const describeExtension = (store, builtVersion) => {
	if (!store || store.error || store.skipped) {
		return `${describeUnavailable(store)} → 빌드 \`${builtVersion}\``;
	}

	const published = store.published ? `\`${store.published}\`` : "_없음_";
	const draftVersion = store.draft?.version;

	// 업로드는 됐지만 게시 버튼을 안 누른 상태를 드러내는 게 이 줄의 목적입니다.
	// 게시본과 초안이 같으면 알릴 게 없으므로 한 줄로 줄입니다.
	// uploadState는 내부 상태값이라(NOT_FOUND 등) 그대로 노출하지 않습니다.
	if (!draftVersion || draftVersion === store.published) {
		return `게시 ${published} → 빌드 \`${builtVersion}\``;
	}

	return `게시 ${published} · 초안 \`${draftVersion}\` 게시 대기 → 빌드 \`${builtVersion}\``;
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
const buildDeployButton = ({ label, detail, target, ref }) => ({
	type: "button",
	action_id: `deploy_${target}`,
	text: { type: "plain_text", text: label, emoji: true },
	value: JSON.stringify({ target, ref }),
	style: "primary",
	confirm: {
		title: { type: "plain_text", text: "배포할까요?" },
		text: {
			type: "mrkdwn",
			text: `\`${ref.slice(0, 7)}\` 을 올립니다.\n${detail}`,
		},
		confirm: { type: "plain_text", text: "배포" },
		deny: { type: "plain_text", text: "취소" },
	},
});

// 앱 버튼 하나가 iOS·Android를 동시에 올립니다(cd-app.yml의 matrix).
// 라벨에 드러내지 않으면 어느 쪽이 올라가는지 버튼만 봐서는 알 수 없습니다.
const DEPLOY_TARGETS = [
	{ target: "app", label: "📱 앱 배포 (iOS+AOS)", detail: "iOS TestFlight · Android 내부 테스트에 함께 올립니다." },
	{ target: "web", label: "🌐 웹 배포", detail: "Vercel 프로덕션에 배포합니다." },
	{ target: "extension", label: "🧩 확장 배포", detail: "크롬 웹 스토어에 업로드합니다. 게시는 대시보드에서 수동입니다." },
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
	).map(({ target, label, detail }) =>
		buildDeployButton({ label, detail, target, ref }),
	);

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
