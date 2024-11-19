import * as esbuild from 'esbuild';
import * as fs from 'fs';
import { resolve } from 'node:path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @type { import("esbuild").BuildOptions }
 */
const buildOptions = {
  entryPoints: ['./index.ts', './tailwind.config.ts', './lib/**/*', './src/**/*'],
  tsconfig: './tsconfig.json',
  bundle: true,
  target: 'es6',
  outdir: './dist',
  sourcemap: true,
  alias: {
    '@': resolve(__dirname, './src'),
  },
};

const build = async () => {
  await esbuild.build(buildOptions);
  fs.copyFileSync(resolve('lib', 'global.css'), resolve('dist', 'global.css'));

  const execAsync = promisify(exec);
  await execAsync('tsc --emitDeclarationOnly --outDir dist');
};

build().catch(error => {
  console.log(error);
  process.exit(1);
});
