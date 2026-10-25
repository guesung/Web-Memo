/**
 * 워크플로 실행 맥락에서 값을 읽어옵니다.
 *
 * 세 알림 스크립트(notify-build-ready / notify-release-result /
 * notify-staging-deploy)가 같은 코드를 각자 갖고 있던 것을 여기로 모았습니다.
 */

import { execFileSync } from "node:child_process";

/**
 * 반드시 있어야 하는 환경변수를 읽습니다.
 *
 * 없으면 던집니다. 빈 값으로 흘려보내면 알림이 "undefined"를 달고 나가거나,
 * 링크가 엉뚱한 곳을 가리킨 채로 조용히 성공합니다.
 */
export const requireEnv = (name) => {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} 이(가) 설정되지 않았습니다`);
	}

	return value;
};

/**
 * GitHub이 머지 커밋에 붙이는 제목. 본문 첫 줄에 PR 제목이 들어갑니다.
 * master로 들어오는 커밋은 거의 전부 이 형태입니다.
 * 캡처 그룹은 차례로 PR 번호와 머지된 브랜치입니다.
 */
const MERGE_SUBJECT_PATTERN = /^Merge pull request #(\d+) from (\S+)/;

/**
 * 알림에 실을 커밋 한 줄. 얕은 체크아웃이라 해당 커밋이 없으면 빈 문자열입니다.
 *
 * 머지 커밋의 제목("Merge pull request #463 from guesung/chore/bump")은 브랜치명만
 * 알려줄 뿐이라, 그 경우에는 본문 첫 줄(= PR 제목)을 대신 씁니다.
 *
 * 제목을 못 읽었다고 알림 자체를 실패시키지는 않습니다. 알림의 본체는
 * 성패와 링크이고, 제목은 거들 뿐입니다.
 */
export const readCommitSubject = (commitSha) => {
	try {
		// %x1e(레코드 구분자)는 커밋 메시지에 나올 일이 없어 제목·본문을 가릅니다.
		const raw = execFileSync(
			"git",
			["log", "-1", "--format=%s%n%x1e%n%b", commitSha],
			{ encoding: "utf8" },
		);
		const [rawSubject = "", body = ""] = raw.split("\n\u001e\n");
		const subject = rawSubject.trim();

		if (!MERGE_SUBJECT_PATTERN.test(subject)) {
			return subject;
		}

		const prTitle = body
			.split("\n")
			.map((line) => line.trim())
			.find(Boolean);

		return prTitle ?? subject;
	} catch {
		return "";
	}
};

/**
 * 머지 커밋 제목에서 PR 번호와 머지된 브랜치를 읽습니다.
 * PR 머지 커밋이 아니면 null입니다.
 *
 * 브랜치는 GitHub이 제목에 적는 그대로 "작성자/브랜치" 형태입니다.
 * (예: `Merge pull request #512 from guesung/fix/ga` -> `guesung/fix/ga`)
 *
 * @param {string} subject 커밋 제목(첫 줄)
 * @returns {{ prNumber: number, branch: string } | null}
 */
export const parseMergeSource = (subject) => {
	const matched = MERGE_SUBJECT_PATTERN.exec(subject.trim());

	if (!matched) {
		return null;
	}

	return { prNumber: Number(matched[1]), branch: matched[2] };
};

/**
 * 커밋이 PR 머지 커밋이면 그 PR 번호와 브랜치를 돌려줍니다. 아니면 null입니다.
 *
 * `Merge branch 'X' into develop`이나 일반 커밋은 PR 번호가 없으므로 null이고,
 * 얕은 체크아웃이라 커밋을 못 읽는 경우도 null입니다. 알림의 본체는 성패와
 * 링크라서, 출처를 못 읽었다고 알림을 실패시키지 않습니다.
 *
 * @param {string} commitSha
 * @returns {{ prNumber: number, branch: string } | null}
 */
export const readMergeSource = (commitSha) => {
	try {
		const subject = execFileSync("git", ["log", "-1", "--format=%s", commitSha], {
			encoding: "utf8",
		});

		return parseMergeSource(subject);
	} catch {
		return null;
	}
};
