import localFont from "next/font/local";

export const pretendard = localFont({
	src: [
		{ path: "../../fonts/PretendardVariableSubset.woff2" },
		{ path: "../../fonts/PretendardVariableSubset.woff" },
	],
	display: "swap",
	weight: "45 920",
	variable: "--font-pretendard",
	preload: true,
	fallback: [
		"-apple-system",
		"BlinkMacSystemFont",
		"system-ui",
		"Roboto",
		"sans-serif",
	],
});
