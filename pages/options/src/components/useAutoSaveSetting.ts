import { useEffect, useRef, useState } from "react";

/** 설정 항목의 자동 저장 상태입니다. */
export type TSaveStatus = "idle" | "saving" | "saved" | "failed";

/** 자동 저장 항목을 구성하는 값과 저장 함수입니다. */
interface IFAutoSaveSettingOptions<TValue> {
	initialValue: TValue;
	onSave: (value: TValue) => Promise<void>;
}

/** 항목별 변경을 순서대로 저장하고 실패한 선택을 재시도할 수 있게 합니다. */
export const useAutoSaveSetting = <TValue>(
	options: IFAutoSaveSettingOptions<TValue>,
) => {
	const [value, setValue] = useState(options.initialValue);
	const [status, setStatus] = useState<TSaveStatus>("idle");
	const savedValue = useRef(options.initialValue);
	const desiredValue = useRef(options.initialValue);
	const failedValue = useRef<TValue | null>(null);
	const isSaving = useRef(false);
	const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isMounted = useRef(true);
	const saveAction = useRef(options.onSave);
	saveAction.current = options.onSave;

	useEffect(() => {
		isMounted.current = true;

		return () => {
			isMounted.current = false;
			if (successTimer.current) {
				clearTimeout(successTimer.current);
			}
		};
	}, []);

	const drainChanges = async () => {
		if (isSaving.current) {
			return;
		}
		isSaving.current = true;

		while (desiredValue.current !== savedValue.current) {
			const nextValue = desiredValue.current;
			if (isMounted.current) {
				setStatus("saving");
			}

			try {
				await saveAction.current(nextValue);
				savedValue.current = nextValue;
			} catch {
				if (desiredValue.current !== nextValue) {
					continue;
				}
				failedValue.current = nextValue;
				desiredValue.current = savedValue.current;
				if (isMounted.current) {
					setValue(savedValue.current);
					setStatus("failed");
				}
				isSaving.current = false;

				return;
			}
		}

		isSaving.current = false;
		if (isMounted.current) {
			setStatus("saved");
			successTimer.current = setTimeout(() => {
				if (isMounted.current) {
					setStatus("idle");
				}
			}, 2000);
		}
	};

	const changeValue = (nextValue: TValue) => {
		if (successTimer.current) {
			clearTimeout(successTimer.current);
		}
		failedValue.current = null;
		desiredValue.current = nextValue;
		setValue(nextValue);
		if (isSaving.current) {
			setStatus("saving");
			return;
		}
		if (nextValue === savedValue.current) {
			setStatus("idle");
			return;
		}
		void drainChanges();
	};

	const retrySave = () => {
		if (failedValue.current !== null) {
			changeValue(failedValue.current);
		}
	};

	return { value, status, changeValue, retrySave };
};
