import { useLocalMemoByUrl } from "@/lib/hooks/useLocalMemos";
import { useSupabaseMemoByUrl } from "@/lib/hooks/useMemoByUrl";
import { sortMemoCandidates } from "@/lib/memoCandidates";

/** 로그인 상태와 선택 ID에 따라 현재 페이지의 편집 후보를 찾는다. */
export const useMemoPanelCandidates = ({
	url,
	isLoggedIn,
	selectedMemoId,
}: {
	url: string;
	isLoggedIn: boolean;
	selectedMemoId: number | string | null;
}) => {
	const {
		data: localCandidates,
		isLoading: isLocalLoading,
		error: localError,
	} = useLocalMemoByUrl(url);
	const {
		data: supabaseCandidates,
		isLoading: isSupabaseLoading,
		error: supabaseError,
	} = useSupabaseMemoByUrl(url, isLoggedIn);
	const pendingLocalMemos = isLoggedIn
		? (localCandidates ?? []).filter((candidate) => !candidate.synced)
		: [];
	const candidates = sortMemoCandidates(
		isLoggedIn
			? [...(supabaseCandidates ?? []), ...pendingLocalMemos]
			: (localCandidates ?? []),
	);
	const selectedMemo =
		selectedMemoId === null
			? candidates.length === 1
				? candidates[0]
				: undefined
			: candidates.find((candidate) => candidate.id === selectedMemoId);

	return {
		pendingLocalMemos,
		candidates,
		selectedMemo,
		isChoosingMemo:
			!selectedMemo && (candidates.length > 1 || selectedMemoId !== null),
		isLoadingMemo: isLoggedIn
			? isSupabaseLoading || isLocalLoading
			: isLocalLoading,
		memoError: isLoggedIn ? (supabaseError ?? localError) : localError,
	};
};
