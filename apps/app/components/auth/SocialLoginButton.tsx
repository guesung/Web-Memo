import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

interface SocialLoginButtonProps {
  provider: "google" | "kakao";
  onPress: () => void;
  disabled?: boolean;
}

const PROVIDER_CONFIG = {
  google: {
    label: "Continue with Google",
    backgroundColor: "#fff",
    textColor: "#333",
    borderColor: "#ddd",
  },
  kakao: {
    label: "Continue with Kakao",
    backgroundColor: "#FEE500",
    textColor: "#191919",
    borderColor: "#FEE500",
  },
};

export function SocialLoginButton({
  provider,
  onPress,
  disabled,
}: SocialLoginButtonProps) {
  const config = PROVIDER_CONFIG[provider];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: config.textColor }]}>
        {config.label}
      </Text>
    </TouchableOpacity>
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
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
