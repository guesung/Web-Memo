/**
 * semver 파싱·비교·증가와 JSON 원문의 버전 치환.
 *
 * apps/web/src/modules/slack/version.ts와 같은 규칙입니다(프리릴리스 태그 없음, docs/versioning.md).
 * 그쪽은 TS라 워크플로 스크립트(.mjs)가 import할 수 없어 규칙만 맞춰 둡니다.
 */

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export const BUMP_KINDS = ["patch", "minor", "major"];

/** `1.2.3`을 [major, minor, patch]로 파싱합니다. 형식이 아니면 null. */
export const parseSemver = (value) => {
	const matched = SEMVER_PATTERN.exec(String(value).trim());

	if (!matched) return null;

	return [Number(matched[1]), Number(matched[2]), Number(matched[3])];
};

/** a가 b보다 크면 양수, 같으면 0, 작으면 음수. */
export const compareSemver = (a, b) => {
	for (let index = 0; index < a.length; index += 1) {
		if (a[index] !== b[index]) return a[index] - b[index];
	}

	return 0;
};

/**
 * 버전을 한 단계 올립니다. 올린 자리 아래는 0으로 되돌립니다.
 * semver가 아니면 던집니다 — 조용히 넘기면 엉뚱한 버전이 커밋됩니다.
 */
export const bumpVersion = (version, kind = "patch") => {
	const parsed = parseSemver(version);

	if (!parsed) {
		throw new Error(`semver 형식이 아닌 버전입니다: ${version}`);
	}

	if (!BUMP_KINDS.includes(kind)) {
		throw new Error(`알 수 없는 증가 단위입니다: ${kind}`);
	}

	const [major, minor, patch] = parsed;

	if (kind === "major") return `${major + 1}.0.0`;
	if (kind === "minor") return `${major}.${minor + 1}.0`;

	return `${major}.${minor}.${patch + 1}`;
};

/**
 * JSON 원문에서 버전 문자열 한 곳만 바꿉니다.
 *
 * JSON.parse → stringify로 다시 쓰면 들여쓰기·키 순서가 재작성돼 diff가 번지므로 해당 한 줄만 치환합니다.
 * 자리를 하나로 특정하지 못하면 던집니다 — 엉뚱한 곳을 고친 커밋이 남는 것보다 낫습니다.
 *
 * @param currentVersion 원문에 실제로 들어 있는 값. 이 값으로 자리를 특정합니다.
 */
export const replaceVersionInJson = ({
	source,
	currentVersion,
	nextVersion,
}) => {
	const escapedCurrent = currentVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const pattern = new RegExp(`("version"\\s*:\\s*")${escapedCurrent}(")`, "g");
	const matchCount = source.match(pattern)?.length ?? 0;

	if (matchCount !== 1) {
		throw new Error(
			`버전 ${currentVersion}을(를) 바꿀 자리를 하나로 특정하지 못했습니다 (${matchCount}곳)`,
		);
	}

	return source.replace(pattern, `$1${nextVersion}$2`);
};
