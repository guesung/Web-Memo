import { useSearchParams } from "@web-memo/shared/modules/search-params";
import { useEffect, useState } from "react";

interface UseMemoDialogReturn {
	dialogMemoId: number | null | undefined;
	setDialogMemoId: React.Dispatch<
		React.SetStateAction<number | null | undefined>
	>;
}

export default function useMemoDialog(): UseMemoDialogReturn {
	const searchParams = useSearchParams();
	const [dialogMemoId, setDialogMemoId] = useState<number | null>();

	useEffect(
		function updateDialogId() {
			const currentDialogId = searchParams.get("id");
			const newDialogId = currentDialogId ? Number(currentDialogId) : null;
			setDialogMemoId(newDialogId);
		},
		[searchParams],
	);

	useEffect(function closeDialogOnPopState() {
		const handlePopstate = () => {
			const openedMemoId = history.state?.openedMemoId;
			setDialogMemoId(openedMemoId || null);
		};

		window.addEventListener("popstate", handlePopstate);
		return () => {
			window.removeEventListener("popstate", handlePopstate);
		};
	}, []);

	return {
		dialogMemoId,
		setDialogMemoId,
	};
}
