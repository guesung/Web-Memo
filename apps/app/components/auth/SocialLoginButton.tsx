import { Text, TouchableOpacity } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

interface SocialLoginButtonProps {
  provider: "google" | "kakao" | "apple";
  onPress: () => void;
  disabled?: boolean;
}

function KakaoIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <G>
        <Path fill="none" d="M0 0h24v24H0z" />
        <Path
          d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 0 0-.656-.678l-1.928 1.866V9.282a.472.472 0 0 0-.944 0v2.557a.471.471 0 0 0 0 .222V13.5a.472.472 0 0 0 .944 0v-1.363l.427-.413 1.428 2.033a.472.472 0 1 0 .773-.543l-1.514-2.155zm-2.958 1.924h-1.46V9.297a.472.472 0 0 0-.943 0v4.159c0 .26.21.472.471.472h1.932a.472.472 0 1 0 0-.944zm-5.857-1.092l.696-1.707.638 1.707H9.092zm2.523.488l.002-.016a.469.469 0 0 0-.127-.32l-1.046-2.8a.69.69 0 0 0-.627-.474.696.696 0 0 0-.653.447l-1.661 4.075a.472.472 0 0 0 .874.357l.33-.813h2.07l.299.8a.472.472 0 1 0 .884-.33l-.345-.926zM8.293 9.302a.472.472 0 0 0-.471-.472H4.577a.472.472 0 1 0 0 .944h1.16v3.736a.472.472 0 0 0 .944 0V9.774h1.14c.261 0 .472-.212.472-.472z"
          fill="#191919"
        />
      </G>
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={10} fill="white" />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.4 10.1515C16.4 9.67875 16.3576 9.22421 16.2788 8.78784H10V11.3666H13.5879C13.4333 12.2 12.9636 12.906 12.2576 13.3788V15.0515H14.4121C15.6727 13.8909 16.4 12.1818 16.4 10.1515Z"
        fill="#4285F4"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.0009 16.6667C11.8009 16.6667 13.31 16.0698 14.413 15.0516L12.2585 13.3788C11.6615 13.7788 10.8979 14.0152 10.0009 14.0152C8.26455 14.0152 6.79485 12.8425 6.27061 11.2667H4.04333V12.994C5.1403 15.1728 7.39485 16.6667 10.0009 16.6667Z"
        fill="#34A853"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.26974 11.2666C6.1364 10.8666 6.06065 10.4393 6.06065 9.99992C6.06065 9.56053 6.1364 9.13325 6.26974 8.73325V7.00598H4.04246C3.59095 7.90598 3.33337 8.92416 3.33337 9.99992C3.33337 11.0757 3.59095 12.0939 4.04246 12.9939L6.26974 11.2666Z"
        fill="#FBBC05"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.0009 5.98489C10.9797 5.98489 11.8585 6.32125 12.5494 6.98186L14.4615 5.06974C13.307 3.99398 11.7979 3.33337 10.0009 3.33337C7.39485 3.33337 5.1403 4.82731 4.04333 7.0061L6.27061 8.73337C6.79485 7.15762 8.26455 5.98489 10.0009 5.98489Z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.64-2.2.45-3.06-.4C3.79 16.17 4.36 9.51 8.7 9.27c1.26.06 2.14.72 2.88.76.99-.2 1.94-.78 3-.84 1.42-.09 2.51.52 3.22 1.6-3.01 1.81-2.28 5.4.73 6.5-.6 1.38-1.37 2.77-2.48 3.01ZM12.03 9.2C11.88 7.09 13.55 5.34 15.5 5.17c.31 2.38-2.13 4.17-3.47 4.03Z"
        fill="#fff"
      />
    </Svg>
  );
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
      <Text className="text-base font-medium" style={{ color: config.textColor }}>
        {config.label}
      </Text>
    </TouchableOpacity>
  );
}
