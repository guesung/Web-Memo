/**
 * 버전 문자열을 다루는 순수 함수 모음.
 *
 * @description GitHub API를 치는 쪽(`github.ts`)과 분리해 둡니다. 버전 비교와 치환은
 * 배포 여부를 가르는 판정이라 네트워크 없이 테스트로 고정할 수 있어야 합니다.
 */

/** 파싱된 semver 세 자리. 이 레포는 프리릴리스 태그를 쓰지 않습니다(docs/versioning.md). */
type TSemver = [major: number, minor: number, patch: number];

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

/** `1.2.3`을 숫자 세 자리로 파싱합니다. 형식이 아니면 null. */
export const parseSemver = (value: string): TSemver | null => {
	const matched = SEMVER_PATTERN.exec(value.trim());

	if (!matched) return null;

	return [Number(matched[1]), Number(matched[2]), Number(matched[3])];
};

/** a가 b보다 크면 양수, 같으면 0, 작으면 음수. */
export const compareSemver = (a: TSemver, b: TSemver): number => {
	for (let index = 0; index < a.length; index += 1) {
		if (a[index] !== b[index]) return a[index] - b[index];
	}

	return 0;
};

/**
 * 입력한 버전이 현재 버전보다 실제로 높은지 봅니다.
 *
 * @description 현재 버전을 못 읽었을 때(`currentVersion`이 없음)는 비교를 건너뛰고
 * 통과시킵니다 — 조회 실패 때문에 정상적인 버전업까지 막으면 안 됩니다.
 */
export const isVersionAhead = ({
	nextVersion,
	currentVersion,
}: {
	nextVersion: TSemver;
	currentVersion?: string;
}): boolean => {
	if (!currentVersion) return true;

	const parsedCurrent = parseSemver(currentVersion);

	if (!parsedCurrent) return true;

	return compareSemver(nextVersion, parsedCurrent) > 0;
};

/**
 * JSON 원문에서 버전 문자열 한 곳만 바꿉니다.
 *
 * @description `JSON.parse` → `JSON.stringify`로 다시 쓰면 들여쓰기·줄바꿈·키 순서가
 * 모두 재작성돼 diff가 파일 전체로 번집니다. 그래서 원문을 문자열로 두고 해당 한 줄만
 * 치환합니다. 바꿀 자리를 못 찾거나 여러 곳이 걸리면 조용히 넘기지 않고 던집니다 —
 * 엉뚱한 곳을 고친 커밋이 master에 남는 것보다 낫습니다.
 *
 * @param currentVersion 원문에 실제로 들어 있는 값. 이 값으로 자리를 특정합니다.
 */
export const replaceVersionInJson = ({
	source,
	currentVersion,
	nextVersion,
}: {
	source: string;
	currentVersion: string;
	nextVersion: string;
}): string => {
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
