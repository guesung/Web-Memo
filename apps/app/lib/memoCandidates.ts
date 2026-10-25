import type { MemoRow } from "@web-memo/shared/types";
import type { LocalMemo } from "@/lib/storage/localMemo";

/** 원격 및 로컬 메모 후보. */
export type TMemoCandidate = MemoRow | LocalMemo;

/** 서로 다른 저장소의 후보를 최근 수정 순으로 정렬한다. */
export const sortMemoCandidates = (
	candidates: TMemoCandidate[],
): TMemoCandidate[] =>
	[...candidates].sort((first, second) => {
		const firstUpdatedAt =
			"updatedAt" in first ? first.updatedAt : first.updated_at;
		const secondUpdatedAt =
			"updatedAt" in second ? second.updatedAt : second.updated_at;

		return (secondUpdatedAt ?? "").localeCompare(firstUpdatedAt ?? "");
	});

/** 로그인 상태에서 원격 메모와 미동기화 로컬 메모를 함께 조회한다. */
export const loadMemoCandidates = async ({
	url,
	isLoggedIn,
	loadLocal,
	loadRemote,
}: {
	url: string;
	isLoggedIn: boolean;
	loadLocal: (url: string) => Promise<LocalMemo[]>;
	loadRemote: (
		url: string,
	) => Promise<{ data: MemoRow[] | null; error: Error | null }>;
}): Promise<TMemoCandidate[]> => {
	const localCandidates = await loadLocal(url);
	if (!isLoggedIn) {
		return sortMemoCandidates(localCandidates);
	}
	const remoteResult = await loadRemote(url);
	if (remoteResult.error) {
		throw remoteResult.error;
	}

	return sortMemoCandidates([
		...(remoteResult.data ?? []),
		...localCandidates.filter((candidate) => !candidate.synced),
	]);
};
