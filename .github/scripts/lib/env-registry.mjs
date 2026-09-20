/**
 * GitHub·Vercel·Supabase에 실제로 등록된 환경 변수 이름을 조회해 매니페스트와 대조합니다.
 *
 * 이름만 다룹니다. 세 API 모두 값(또는 값의 다이제스트)을 응답에 실어 보내지만 여기서는
 * 이름과 대상 환경만 골라 담고 나머지는 즉시 버립니다. 응답 본문은 로그에도 남기지 않습니다.
 *
 * 저장소마다 조회 권한이 달라 토큰이 없거나 거절될 수 있습니다. 그때 전체를 실패시키면
 * 토큰을 하나씩 준비하는 동안 감사가 통째로 꺼지므로, 조회하지 못한 저장소는 사유와 함께
 * "미조회"로 돌려주고 나머지를 계속 대조합니다.
 */

import { requestJson } from "./http.mjs";

const VERCEL_ENVIRONMENTS = ["production", "preview", "development"];

/** Supabase가 Edge Function에 주입하는 예약 변수. 우리가 등록하는 값이 아닙니다. */
const SUPABASE_RESERVED_PREFIX = "SUPABASE_";

/** 사유 문자열에 응답 본문이 길게 딸려 오지 않도록 자릅니다. */
const summarizeError = (error) => String(error.message ?? error).slice(0, 160);

/** GitHub 저장소 Actions 시크릿 이름 목록 */
export const fetchGithubSecretNames = async ({ repository, token }) => {
	const names = new Set();

	for (let page = 1; ; page += 1) {
		const body = await requestJson(
			`https://api.github.com/repos/${repository}/actions/secrets?per_page=100&page=${page}`,
			{
				headers: {
					authorization: `Bearer ${token}`,
					accept: "application/vnd.github+json",
					"x-github-api-version": "2022-11-28",
				},
			},
		);

		for (const secret of body.secrets) {
			names.add(secret.name);
		}

		if (names.size >= body.total_count || body.secrets.length === 0) {
			return names;
		}
	}
};

/** Vercel 프로젝트 환경변수 이름과 대상 환경. 이름 → 환경 집합 */
export const fetchVercelEnvNames = async ({ project, teamSlug, token }) => {
	const body = await requestJson(
		`https://api.vercel.com/v9/projects/${project}/env?slug=${teamSlug}`,
		{ headers: { authorization: `Bearer ${token}` } },
	);
	const names = new Map();

	for (const env of body.envs) {
		const environments = names.get(env.key) ?? new Set();

		for (const target of [env.target].flat()) {
			if (VERCEL_ENVIRONMENTS.includes(target)) {
				environments.add(target);
			}
		}

		names.set(env.key, environments);
	}

	return names;
};

/** Supabase 프로젝트의 Edge Function secrets 이름 목록 */
export const fetchSupabaseSecretNames = async ({ projectRef, token }) => {
	const body = await requestJson(
		`https://api.supabase.com/v1/projects/${projectRef}/secrets`,
		{ headers: { authorization: `Bearer ${token}` } },
	);

	return new Set(body.map((secret) => secret.name));
};

/**
 * 저장소 하나를 조회하고, 못 했으면 사유와 함께 미조회로 돌려줍니다.
 *
 * @param tokenName 사유에 적을 환경변수 이름
 */
export const tryFetch = async ({ store, tokenName, token, fetcher }) => {
	if (!token) {
		return { store, skipped: `${tokenName} 없음` };
	}

	try {
		return { store, names: await fetcher() };
	} catch (error) {
		return { store, skipped: summarizeError(error) };
	}
};

const declaredIn = (entries, matcher) =>
	entries.filter(
		(entry) => entry.kind !== "platform" && entry.stores.some(matcher),
	);

const compareNameSets = ({ store, entries, actualNames }) => {
	const findings = [];
	const declared = declaredIn(entries, (candidate) => candidate === store);
	const declaredNames = new Set(declared.map((entry) => entry.name));

	for (const entry of declared) {
		if (entry.required && !actualNames.has(entry.name)) {
			findings.push({ store, type: "missing", name: entry.name });
		}
	}

	for (const name of actualNames) {
		if (declaredNames.has(name)) {
			continue;
		}

		// 예약 변수만 예외입니다. 그 밖의 platform 이름이 등록돼 있으면 잘못 등록된 것입니다.
		if (store === "supabase" && name.startsWith(SUPABASE_RESERVED_PREFIX)) {
			continue;
		}

		findings.push({ store, type: "unregistered", name });
	}

	return findings;
};

const compareVercel = ({ entries, actualEnvironments }) => {
	const findings = [];
	const declared = declaredIn(entries, (store) => store.startsWith("vercel:"));
	const declaredByName = new Map(
		declared.map((entry) => [
			entry.name,
			{
				entry,
				environments: new Set(
					entry.stores
						.filter((store) => store.startsWith("vercel:"))
						.map((store) => store.replace("vercel:", "")),
				),
			},
		]),
	);

	for (const [name, { entry, environments }] of declaredByName) {
		const actual = actualEnvironments.get(name) ?? new Set();

		if (entry.required) {
			for (const environment of environments) {
				if (!actual.has(environment)) {
					findings.push({
						store: "vercel",
						type: "missing",
						name,
						detail: environment,
					});
				}
			}
		}

		for (const environment of actual) {
			if (!environments.has(environment)) {
				findings.push({
					store: "vercel",
					type: "extra-environment",
					name,
					detail: environment,
				});
			}
		}
	}

	// platform 값은 플랫폼이 주입하므로 어느 저장소에도 등록돼 있으면 안 됩니다.
	// 그래서 declaredByName에 없는 이름은 platform이든 아니든 똑같이 미등록으로 셉니다.
	for (const [name] of actualEnvironments) {
		if (!declaredByName.has(name)) {
			findings.push({ store: "vercel", type: "unregistered", name });
		}
	}

	return findings;
};

/**
 * 매니페스트와 실제 등록 목록의 차이를 모읍니다.
 *
 * @param results 저장소별 조회 결과. `{ store, names }` 또는 `{ store, skipped }`
 * @returns {{ findings: object[], skipped: { store: string, reason: string }[] }}
 */
export const compareRegistry = ({ entries, results }) => {
	const findings = [];
	const skipped = [];

	for (const result of results) {
		if (result.skipped) {
			skipped.push({ store: result.store, reason: result.skipped });

			continue;
		}

		if (result.store === "vercel") {
			findings.push(
				...compareVercel({ entries, actualEnvironments: result.names }),
			);

			continue;
		}

		findings.push(
			...compareNameSets({
				store: result.store,
				entries,
				actualNames: result.names,
			}),
		);
	}

	return { findings, skipped };
};

export const STORE_LABELS = {
	github: "GitHub Secrets",
	vercel: "Vercel",
	supabase: "Supabase",
};

const FINDING_LABELS = {
	missing: "등록 안 됨",
	unregistered: "매니페스트에 없음",
	"extra-environment": "선언하지 않은 환경에 등록됨",
};

/** 차이 하나를 한 줄로 씁니다. Slack 목록과 PR 경고 주석이 같은 문장을 씁니다. */
export const formatFindingLine = (finding) => {
	const detail = finding.detail ? ` (${finding.detail})` : "";

	return `${FINDING_LABELS[finding.type]}: \`${finding.name}\`${detail}`;
};

/** 차이를 Slack에 보낼 mrkdwn 텍스트로 만듭니다. 차이가 없으면 null입니다. */
export const formatFindings = ({ findings, skipped, runUrl }) => {
	if (findings.length === 0) {
		return null;
	}

	const lines = [
		`⚠️ *환경 변수 등록 현황이 매니페스트와 다릅니다* (${findings.length}건)`,
	];

	for (const store of Object.keys(STORE_LABELS)) {
		const inStore = findings.filter((finding) => finding.store === store);

		if (inStore.length === 0) {
			continue;
		}

		lines.push(`\n*${STORE_LABELS[store]}*`);

		for (const finding of inStore) {
			lines.push(`• ${formatFindingLine(finding)}`);
		}
	}

	if (skipped.length > 0) {
		const summary = skipped
			.map(({ store, reason }) => `${STORE_LABELS[store]}(${reason})`)
			.join(", ");

		lines.push(`\n_미조회: ${summary}_`);
	}

	lines.push(
		"\n등록이 빠졌다면 콘솔에서 채우고, 의도한 변경이면 `.github/env-manifest.yml`을 고치세요.",
	);

	if (runUrl) {
		lines.push(`<${runUrl}|실행 로그 보기>`);
	}

	return lines.join("\n");
};
