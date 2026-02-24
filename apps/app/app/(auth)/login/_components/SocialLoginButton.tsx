import { AppleIcon, GoogleIcon, KakaoIcon } from "./icons";
import { Text, TouchableOpacity } from "react-native";

interface SocialLoginButtonProps {
	provider: "google" | "kakao" | "apple";
	onPress: () => void;
	disabled?: boolean;
}

const PROVIDER_CONFIG = {
	google: {
		label: "Google로 계속하기",
		backgroundColor: "#fff",
		textColor: "#333",
		borderColor: "#e5e7eb",
		borderWidth: 2,
		icon: GoogleIcon,
	},
	kakao: {
		label: "카카오로 계속하기",
		backgroundColor: "#FEE500",
		textColor: "#191919",
		borderColor: "#FEE500",
		borderWidth: 0,
		icon: KakaoIcon,
	},
	apple: {
		label: "Apple로 계속하기",
		backgroundColor: "#000",
		textColor: "#fff",
		borderColor: "#000",
		borderWidth: 0,
		icon: AppleIcon,
	},
};

export function SocialLoginButton({
	provider,
	onPress,
	disabled,
}: SocialLoginButtonProps) {
	const config = PROVIDER_CONFIG[provider];
	const Icon = config.icon;

	return (
		<TouchableOpacity
			className="flex-row items-center justify-center h-14 rounded-xl gap-2"
			style={[
				{
					backgroundColor: config.backgroundColor,
					borderColor: config.borderColor,
					borderWidth: config.borderWidth,
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.1,
					shadowRadius: 4,
					elevation: 3,
				},
				disabled && { opacity: 0.5 },
			]}
			onPress={onPress}
			disabled={disabled}
			activeOpacity={0.7}
		>
			<Icon />
			<Text
				className="text-base font-medium"
				style={{ color: config.textColor }}
			>
				{config.label}
			</Text>
		</TouchableOpacity>
	);
}
