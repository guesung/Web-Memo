#!/usr/bin/env node
/**
 * 슬랙 배포 모달에서 적어 보낸 버전을 레포 파일에 반영합니다.
 * .github/workflows/release.yml 의 bump-version 잡에서 호출합니다.
 *
 * 버전 트랙이 왜 앱·확장으로 갈라져 있는지는 docs/versioning.md를 참고하세요.
 * 두 값은 서로 무관하며, 한쪽만 넘어오면 그 파일만 고칩니다.
 *
 * JSON을 다시 직렬화하지 않고 `"version"` 줄만 바꿉니다. 두 파일 모두 그 키가
 * 하나뿐이라 안전하고, 나머지 바이트가 그대로 남아 diff가 한 줄로 유지됩니다.
 *
 * 로컬에서 그대로 돌려볼 수 있습니다(파일을 실제로 고치므로 확인 후 되돌리세요).
 *
 *   APP_VERSION=1.0.9 node .github/scripts/bump-versions.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readAppConfig, readExtensionVersion } from "./lib/repo-versions.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

/** 올릴 수 있는 버전 트랙. 각 항목이 파일 하나를 소유합니다. */
const TRACKS = [
	{
		label: "앱",
		envName: "APP_VERSION",
		relativePath: "apps/app/app.json",
		readCurrent: () => readAppConfig().version,
	},
	{
		label: "확장",
		envName: "EXTENSION_VERSION",
		relativePath: "apps/chrome-extension/package.json",
		readCurrent: readExtensionVersion,
	},
];

/**
 * `1.2.10` 이 `1.2.9` 보다 크다고 판정합니다.
 *
 * @description 문자열 비교로는 `"1.2.10" < "1.2.9"` 가 되어 정상적인 버전업이 막힙니다.
 */
const isGreater = (next, current) => {
	const nextParts = next.split(".").map(Number);
	const currentParts = current.split(".").map(Number);

	for (let index = 0; index < 3; index += 1) {
		if (nextParts[index] !== currentParts[index]) {
			return nextParts[index] > currentParts[index];
		}
	}

	return false;
};

/**
 * 파일 안의 `"version"` 줄 하나를 새 값으로 바꿉니다.
 *
 * @description 줄을 못 찾으면 조용히 넘어가지 않고 실패시킵니다. 여기서 넘어가면
 * 버전이 안 올라간 채로 빌드가 성공해, 스토어에 같은 버전이 다시 올라갑니다.
 */
const writeVersion = ({ relativePath, current, next }) => {
	const absolutePath = join(REPO_ROOT, relativePath);
	const source = readFileSync(absolutePath, "utf8");
	const pattern = new RegExp(`("version":\\s*")${current}(")`);

	if (!pattern.test(source)) {
		throw new Error(
			`${relativePath} 에서 "version": "${current}" 줄을 찾지 못했습니다`,
		);
	}

	writeFileSync(absolutePath, source.replace(pattern, `$1${next}$2`));
};

const main = () => {
	const changes = [];

	for (const track of TRACKS) {
		const next = (process.env[track.envName] ?? "").trim();

		if (!next) continue;

		const current = track.readCurrent();

		if (!SEMVER_PATTERN.test(next)) {
			throw new Error(
				`${track.label} 버전 "${next}" 은 x.y.z 형식이 아닙니다`,
			);
		}

		// 크롬 웹 스토어는 단조 증가를 요구하고 App Store도 한 번 나간 버전을
		// 되돌릴 수 없습니다. 커밋을 만들기 전에 여기서 막습니다.
		if (!isGreater(next, current)) {
			throw new Error(
				`${track.label} 버전은 현재 ${current} 보다 커야 합니다 (받은 값: ${next})`,
			);
		}

		writeVersion({ relativePath: track.relativePath, current, next });
		changes.push(`${track.label} ${current} → ${next}`);
	}

	if (changes.length === 0) {
		throw new Error("올릴 버전이 하나도 넘어오지 않았습니다");
	}

	console.log(changes.join(", "));
};

try {
	main();
} catch (error) {
	console.error(`::error::${error.message}`);
	process.exit(1);
}
