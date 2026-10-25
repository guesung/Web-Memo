#!/usr/bin/env node
/**
 * generate-supabase-inventory.mjs가 다시 쓴 문서를 master와 비교해 자동화 전용 브랜치의 PR 하나를 맞춥니다.
 * - 문서가 master와 다르면 PR을 만들거나, 열린 PR의 브랜치를 새 내용으로 갱신합니다.
 * - 문서가 master와 같아졌는데 열린 PR이 있으면 불필요해진 PR을 닫습니다.
 * 자동 머지는 하지 않습니다. 생성기가 실패하면 워크플로가 이 스크립트까지 오지 않아 열린 PR이 그대로 남습니다.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BRANCH = "chore/supabase-inventory";
const DOCUMENT = "docs/supabase-inventory.md";
const PR_TITLE = "docs: Supabase 인벤토리를 운영 상태에 맞춰 갱신한다";
const PR_BODY = `## 설명

매일 08:00 KST에 운영 Supabase를 읽기 전용으로 조회한 결과가 \`${DOCUMENT}\`와 달라 자동으로 연 PR입니다.
변경 내용은 Files changed 탭에서 확인합니다. 운영 상태가 다시 master 문서와 같아지면 이 PR은 자동으로 닫힙니다.

자동 머지는 하지 않습니다. 의도한 운영 변경인지 확인한 뒤 머지합니다.

## 관련 이슈

- 생성 워크플로: \`.github/workflows/chore-supabase-inventory.yml\`
`;

/**
 * 문서 비교 결과로 PR에 할 일을 정합니다.
 * 열린 PR의 브랜치가 이미 같은 내용이면 다시 push하지 않습니다 — 매일 같은 내용으로 CI를 돌리지 않기 위해서입니다.
 */
export const decideInventoryPrAction = ({ documentChanged, openPrNumber, branchDocumentMatches }) => {
	if (!documentChanged) {
		return openPrNumber ? "close" : "noop";
	}

	if (!openPrNumber) {
		return "create";
	}

	return branchDocumentMatches ? "noop" : "update";
};

const run = (command, args) => execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const runInherit = (command, args) => {
	execFileSync(command, args, { stdio: "inherit" });
};

const tryRun = (command, args) => {
	try {
		return run(command, args);
	} catch {
		return null;
	}
};

const findOpenPrNumber = () => {
	const number = run("gh", ["pr", "list", "--head", BRANCH, "--base", "master", "--state", "open", "--json", "number", "--jq", ".[0].number // empty"]);

	return number ? Number(number) : null;
};

/** 원격 브랜치가 없으면 fetch가 실패하므로 "같지 않음"으로 봅니다. */
const readBranchDocument = () => {
	if (tryRun("git", ["fetch", "--quiet", "origin", BRANCH]) === null) {
		return null;
	}

	return tryRun("git", ["show", `FETCH_HEAD:${DOCUMENT}`]);
};

const pushDocument = () => {
	runInherit("git", ["config", "user.name", process.env.GIT_USER_NAME ?? "github-actions[bot]"]);
	runInherit("git", ["config", "user.email", process.env.GIT_USER_EMAIL ?? "41898282+github-actions[bot]@users.noreply.github.com"]);
	runInherit("git", ["switch", "--force-create", BRANCH]);
	runInherit("git", ["add", DOCUMENT]);
	runInherit("git", ["commit", "--quiet", "--message", PR_TITLE]);
	// 브랜치는 이 자동화만 씁니다. 매번 master 위에 커밋 하나로 다시 세워 이력이 쌓이지 않게 합니다.
	runInherit("git", ["push", "--quiet", "--force", "origin", BRANCH]);
};

const main = () => {
	const documentChanged = run("git", ["status", "--porcelain", "--", DOCUMENT]) !== "";
	const openPrNumber = findOpenPrNumber();
	const branchDocument = documentChanged && openPrNumber ? readBranchDocument() : null;
	const action = decideInventoryPrAction({
		documentChanged,
		openPrNumber,
		// git show는 끝 개행을 떼지 않지만 run()이 trim하므로 양쪽을 같은 방식으로 맞춰 비교합니다.
		branchDocumentMatches: branchDocument !== null && branchDocument === readFileSync(DOCUMENT, "utf8").trim(),
	});

	console.log(`인벤토리 PR 동작: ${action}${openPrNumber ? ` (#${openPrNumber})` : ""}`);

	if (action === "close") {
		runInherit("gh", ["pr", "close", String(openPrNumber), "--delete-branch", "--comment", "운영 상태가 master의 인벤토리 문서와 다시 같아져 닫습니다."]);

		return;
	}

	if (action === "create") {
		pushDocument();
		runInherit("gh", ["pr", "create", "--base", "master", "--head", BRANCH, "--title", PR_TITLE, "--body", PR_BODY]);

		return;
	}

	if (action === "update") {
		pushDocument();
	}
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
