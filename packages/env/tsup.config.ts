import dotenv from "dotenv";
import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	sourcemap: true,
	clean: true,
	env: dotenv.config().parsed,
	dts: true,
	format: ["esm", "cjs"],
});
