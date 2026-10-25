const MAX_DISPLAYED_ISSUES = 6;
const MAX_CODE_LENGTH = 60;
const MAX_URL_LENGTH = 180;
const MAX_AGENT_LENGTH = 30;
const MAX_FIELD_LENGTH = 60;
const SLACK_ESCAPE_CHARACTERS = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
};

/** Slack mrkdwn을 이스케이프한 최종 문자열이 지정한 길이를 넘지 않도록 축약합니다. */
const formatSlackValue = (value, maximumLength) => {
	const characters = [...String(value)];
	let formattedValue = "";
	for (const character of characters) {
		const escapedCharacter = SLACK_ESCAPE_CHARACTERS[character] ?? character;
		if (formattedValue.length + escapedCharacter.length > maximumLength - 1) {
			return `${formattedValue}…`;
		}
		formattedValue += escapedCharacter;
	}

	return formattedValue;
};

/** SEO 보고서에서 현재 오류와 이전 실행 대비 신규 경고를 추출합니다. */
export const collectSeoSlackIssues = (report) => {
	const errors = (Array.isArray(report?.pages) ? report.pages : []).flatMap((page) =>
		(Array.isArray(page.issues) ? page.issues : [])
			.filter((issue) => issue.severity === "error")
			.map((issue) => ({
				...issue,
				agent: String(page.agent ?? ""),
				url: String(page.url ?? ""),
			})),
	);
	const newWarnings =
		report?.history?.baselineStatus === "compatible"
			? (report.history.delta?.new ?? []).filter(
					(issue) => issue.severity === "warning",
				)
			: [];

	return { errors, newWarnings };
};

/** 오류 또는 신규 경고가 있을 때만 보낼 Slack 메시지를 만듭니다. */
export const buildSeoSlackPayload = ({ report, runUrl }) => {
	const { errors, newWarnings } = collectSeoSlackIssues(report);
	if (errors.length === 0 && newWarnings.length === 0) {
		return null;
	}
	const issues = [
		...errors.map((issue) => ({ ...issue, label: "오류" })),
		...newWarnings.map((issue) => ({ ...issue, label: "신규 경고" })),
	];
	const displayedIssues = issues.slice(0, MAX_DISPLAYED_ISSUES);
	const omittedCount = issues.length - displayedIssues.length;
	const issueLines = displayedIssues.map((issue) => {
		const code = formatSlackValue(issue.code || "UNKNOWN", MAX_CODE_LENGTH);
		const url = formatSlackValue(issue.url, MAX_URL_LENGTH);
		const agent = issue.agent
			? ` · ${formatSlackValue(issue.agent, MAX_AGENT_LENGTH)}`
			: "";
		const field = issue.field
			? ` · ${formatSlackValue(issue.field, MAX_FIELD_LENGTH)}`
			: "";

		return `• *${issue.label}* \`${code}\` ${url}${agent}${field}`;
	});
	if (omittedCount > 0) {
		issueLines.push(`• 나머지 ${omittedCount}건은 실행 리포트에서 확인할 수 있습니다.`);
	}
	const summary = `오류 ${errors.length}건 · 신규 경고 ${newWarnings.length}건`;
	const link = runUrl ? `\n<${runUrl}|GitHub Actions 실행 결과 보기>` : "";

	return {
		text: `🚨 SEO 감사: ${summary}`,
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `*🚨 SEO 감사 결과*\n${summary}\n${issueLines.join("\n")}${link}`,
				},
			},
		],
	};
};

/** SEO 검사 자체가 보고서를 만들기 전에 실패했을 때 보낼 Slack 메시지를 만듭니다. */
export const buildSeoFailureSlackPayload = ({ runUrl }) => ({
	text: "❌ SEO 감사가 보고서를 생성하기 전에 실패했습니다.",
	blocks: [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: `*❌ SEO 감사 실행 실패*\n보고서가 생성되지 않았습니다.${runUrl ? `\n<${runUrl}|GitHub Actions 실행 로그 보기>` : ""}`,
			},
		},
	],
});
