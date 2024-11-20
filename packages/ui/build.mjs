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
  entryPoints: ['./index.ts', './tailwind.config.js'],
  tsconfig: './tsconfig.json',
  bundle: true,
  target: 'es6',
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  alias: {
    '@': resolve(__dirname, './src'),
  },
  jsx: 'automatic',
  external: ['react', 'react-dom'],
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.jsx': 'jsx',
    '.js': 'jsx',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};

const build = async () => {
  await esbuild.build(buildOptions);
  fs.copyFileSync(resolve('global.css'), resolve('dist', 'global.css'));

  const execAsync = promisify(exec);
  await execAsync('tsc --emitDeclarationOnly --outDir dist');
};

build().catch(error => {
  console.log(error);
  process.exit(1);
});
