import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * 소프트 키보드의 표시 여부와 높이를 구독한다.
 *
 * @description
 * Android는 edge-to-edge 환경(Android 15+)에서 `windowSoftInputMode="adjustResize"`가 무시되어
 * 창이 키보드 높이만큼 줄어들지 않는다. 이때 React Native가 키보드 이벤트로 내려주는 좌표(screenY)는
 * `getWindowVisibleDisplayFrame()` 기준이라 화면 하단 그대로 남고, 그 값을 쓰는 `KeyboardAvoidingView`는
 * 여백을 전혀 만들지 못한다. 반면 `endCoordinates.height`는 IME inset에서 시스템 바를 뺀 값이라
 * 항상 정확하므로, 레이아웃을 직접 밀어 올릴 때는 이 높이를 사용한다.
 *
 * Android에서 이 높이에는 내비게이션 바가 포함되지 않으므로, 화면 하단부터의 실제 여백이 필요하면
 * `useSafeAreaInsets().bottom`을 더해야 한다.
 */
export function useKeyboardHeight(): TUseKeyboardHeightReturn {
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	useEffect(() => {
		const showEvent =
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
		const hideEvent =
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

		const showSubscription = Keyboard.addListener(showEvent, (event) => {
			setKeyboardHeight(event.endCoordinates.height);
		});
		const hideSubscription = Keyboard.addListener(hideEvent, () => {
			setKeyboardHeight(0);
		});

		return () => {
			showSubscription.remove();
			hideSubscription.remove();
		};
	}, []);

	return { isKeyboardVisible: keyboardHeight > 0, keyboardHeight };
}

/** {@link useKeyboardHeight}의 반환값 */
type TUseKeyboardHeightReturn = {
	/** 키보드가 화면에 떠 있는지 여부 */
	isKeyboardVisible: boolean;
	/** 키보드 높이(dp). 숨겨진 상태에서는 0 */
	keyboardHeight: number;
};
