import dotenv from 'dotenv';
import * as esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();
const define = {};
for (const k in process.env) {
  define[`process.env.${k}`] = JSON.stringify(process.env[k]);
}

/**
 * @type { import("esbuild").BuildOptions }
 */
const libBuildOptions = {
  entryPoints: ['./src/**/*'],
  outdir: 'dist',
  tsconfig: './tsconfig.json',
  target: 'es6',
  plugins: [nodeExternalsPlugin()],
  define,
};

const build = async () => {
  await esbuild.build({ ...libBuildOptions, format: 'esm', outExtension: { '.js': '.js' }, sourcemap: true });

  const execAsync = promisify(exec);
  await execAsync('tsc --emitDeclarationOnly --outDir dist');
};

build().catch(error => {
  console.log(error);
  process.exit(1);
});
