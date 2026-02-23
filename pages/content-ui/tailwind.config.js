import baseConfig from "@web-memo/tailwindcss-config";

/** @type {import('tailwindcss').Config} */
export default {
	...baseConfig,
	content: ["./src/**/*.{js,ts,jsx,tsx}", ...baseConfig.content],
};
