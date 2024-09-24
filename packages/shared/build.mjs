import dotenv from 'dotenv';
import * as esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
dotenv.config();

const define = {};

for (const k in process.env) {
  define[`process.env.${k}`] = JSON.stringify(process.env[k]);
}

/**
 * @type { import("esbuild").BuildOptions }
 */
const buildOptions = {
  entryPoints: ['./src/**/index.ts'],
  outdir: 'dist',
  tsconfig: './tsconfig.json',
  bundle: true,
  sourcemap: true,
  format: 'esm',
  target: 'es6',
  plugins: [nodeExternalsPlugin()],
  define,
};

await esbuild
  .build(buildOptions)
  .then(async () => {
    console.log('Build complete');
  })
  .catch(() => process.exit(1));
