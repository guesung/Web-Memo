import dotenv from "dotenv";
import { defineConfig } from "tsup";

const envFile =
	process.env.NODE_ENV === "production" ? ".env.production" : ".env";

export default defineConfig({
	entry: ["src/index.ts"],
	sourcemap: true,
	clean: true,
	env: dotenv.config({ path: envFile }).parsed,
	dts: true,
	format: ["esm", "cjs"],
});
