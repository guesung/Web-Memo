import { useSearchParams } from "@web-memo/shared/modules/search-params";
import { useState } from "react";
import { closeDialogWithNavigation } from "../utils/navigation";

interface UseMemoDialogParams {
	memoId: number;
	checkIfEdited: () => boolean;
	saveMemo: () => void;
}

export function useMemoDialog({ memoId, checkIfEdited, saveMemo }: UseMemoDialogParams) {
	const [showAlert, setShowAlert] = useState(false);
	const searchParams = useSearchParams();

	const closeDialog = () => {
		closeDialogWithNavigation(memoId, searchParams);
	};

	const checkEditedAndCloseDialog = () => {
		const isEdited = checkIfEdited();

		if (isEdited) {
			setShowAlert(true);
		} else {
			closeDialog();
		}
	};

	const handleSaveAndClose = () => {
		saveMemo();
		closeDialog();
	};

	const handleCancelAlert = () => {
		setShowAlert(false);
	};

	return {
		showAlert,
		closeDialog,
		checkEditedAndCloseDialog,
		handleSaveAndClose,
		handleCancelAlert,
	};
}
