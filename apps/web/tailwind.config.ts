import baseConfig from "@web-memo/tailwindcss-config";

/** @type {import('tailwindcss').Config} */
export default {
	...baseConfig,
	darkMode: ["class"],
	content: ["./src/**/*.{js,ts,jsx,tsx}", ...baseConfig.content],
	plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
};
