import deepmerge from "deepmerge";
import type { Config } from "tailwindcss";

import config from "../../tailwind.config";

export const withUI = (tailwindConfig: Config) =>
	deepmerge(
		tailwindConfig,
		deepmerge(config, {
			content: [
				"./node_modules/@web-memo/ui/lib/**/*.{tsx,ts,js,jsx}",
				"./node_modules/@web-memo/ui/src/**/*.{tsx,ts,js,jsx}",
			],
		}),
	);
