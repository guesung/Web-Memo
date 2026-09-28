import type { InitialProps } from "expo-share-extension";
import { Text, View } from "react-native";

/**
 * iOS 공유 시트에서 뜨는 위시 저장 화면의 루트 컴포넌트.
 * @description 지금은 최소 골격이다. 위시 저장·메모 입력·후보/오류/비로그인 상태 분기는
 * 뒤이은 TDL 항목에서 채운다.
 */
export default function ShareExtension({ url, text }: InitialProps) {
	const sharedUrl = url ?? text ?? "";

	return (
		<View className="flex-1 items-center justify-center bg-white p-6">
			<Text>{sharedUrl || "공유할 수 있는 링크가 없어요."}</Text>
		</View>
	);
}
