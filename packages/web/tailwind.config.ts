import baseConfig from "@web-memo/tailwindcss-config";

/** @type {import('tailwindcss').Config} */
export default {
	...baseConfig,
	darkMode: ["class"],
	content: [
		"./src/**/*.{js,ts,jsx,tsx}",
		"./node_modules/@web-memo/ui/lib/**/*.{tsx,ts,js,jsx}",
		"./node_modules/@web-memo/ui/src/**/*.{tsx,ts,js,jsx}",
	],
	plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
};
