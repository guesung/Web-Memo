import { useSearchParams } from "@web-memo/shared/modules/search-params";
import { useEffect, useState } from "react";

export function useMemoDialog() {
	const searchParams = useSearchParams();
	const [dialogMemoId, setDialogMemoId] = useState<number | null>(null);

	useEffect(
		function syncDialogIdWithSearchParams() {
			const idParam = searchParams.get("id");
			const newDialogId = idParam ? Number(idParam) : null;
			setDialogMemoId(newDialogId);
		},
		[searchParams],
	);

	useEffect(function syncDialogIdWithPopState() {
		const handlePopstate = () => {
			const openedMemoId = history.state?.openedMemoId;
			setDialogMemoId(openedMemoId || null);
		};

		window.addEventListener("popstate", handlePopstate);
		return () => {
			window.removeEventListener("popstate", handlePopstate);
		};
	}, []);

	return { dialogMemoId };
}
