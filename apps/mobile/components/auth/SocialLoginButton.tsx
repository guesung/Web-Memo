import { Pressable, StyleSheet, Text, View } from "react-native";

type Provider = "google" | "apple" | "kakao";

interface SocialLoginButtonProps {
	provider: Provider;
	onPress: () => void;
	disabled?: boolean;
}

const providerConfig: Record<
	Provider,
	{ label: string; bgColor: string; textColor: string; icon: string }
> = {
	google: {
		label: "Google로 계속하기",
		bgColor: "#fff",
		textColor: "#1a1a1a",
		icon: "G",
	},
	apple: {
		label: "Apple로 계속하기",
		bgColor: "#000",
		textColor: "#fff",
		icon: "",
	},
	kakao: {
		label: "카카오로 계속하기",
		bgColor: "#FEE500",
		textColor: "#000",
		icon: "💬",
	},
};

export function SocialLoginButton({
	provider,
	onPress,
	disabled,
}: SocialLoginButtonProps) {
	const config = providerConfig[provider];

	return (
		<Pressable
			style={[
				styles.button,
				{ backgroundColor: config.bgColor },
				provider === "google" && styles.googleBorder,
				disabled && styles.disabled,
			]}
			onPress={onPress}
			disabled={disabled}
		>
			<View style={styles.iconContainer}>
				<Text style={styles.icon}>{config.icon}</Text>
			</View>
			<Text style={[styles.label, { color: config.textColor }]}>
				{config.label}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 12,
	},
	googleBorder: {
		borderWidth: 1,
		borderColor: "#e0e0e0",
	},
	disabled: {
		opacity: 0.6,
	},
	iconContainer: {
		width: 24,
		height: 24,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	icon: {
		fontSize: 18,
	},
	label: {
		fontSize: 16,
		fontWeight: "600",
	},
});
