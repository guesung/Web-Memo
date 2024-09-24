import dotenv from 'dotenv';
import * as esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
dotenv.config();
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  target: 'es6',
  plugins: [nodeExternalsPlugin()],
  define,
};

await esbuild.build({ ...buildOptions, format: 'cjs', outExtension: { '.js': '.cjs' } });

await esbuild.build({ ...buildOptions, format: 'esm', outExtension: { '.js': '.js' }, sourcemap: true });

await execAsync('tsc --emitDeclarationOnly --outDir dist');
