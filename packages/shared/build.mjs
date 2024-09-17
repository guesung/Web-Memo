import * as esbuild from 'esbuild';
import dotenv from 'dotenv';
dotenv.config();

const define = {};

for (const k in process.env) {
  define[`process.env.${k}`] = JSON.stringify(process.env[k]);
}

/**
 * @type { import("esbuild").BuildOptions }
 */
const buildOptions = {
  entryPoints: ['./index.ts', './lib/utils/extension/index.ts'],
  tsconfig: './tsconfig.json',
  bundle: false,
  target: 'es6',
  outdir: './dist',
  sourcemap: true,
  define,
};

await esbuild.build(buildOptions);
