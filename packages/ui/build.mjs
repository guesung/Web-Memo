import { resolve } from 'node:path';

import { exec } from 'child_process';
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

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
  const startTime = performance.now();

  console.log('🚀 빌드 프로세스 시작...');

  fs.rmSync(resolve(__dirname, 'dist'), { recursive: true, force: true });
  try {
    await esbuild.build(buildOptions);
    console.log('✅ esbuild 빌드 완료');

    fs.copyFileSync(resolve('global.css'), resolve('dist', 'global.css'));
    console.log('✅ global.css 파일 복사 완료');

    const execAsync = promisify(exec);
    await execAsync('tsc --emitDeclarationOnly --outDir dist');
    console.log('✅ TypeScript 선언 파일 생성 완료');

    const endTime = performance.now();
    const buildTime = (endTime - startTime) / 1000;
    console.log(`🕒 총 빌드 시간: ${buildTime.toFixed(2)}초`);
  } catch (error) {
    console.error('❌ 빌드 중 오류 발생:', error);
    throw error;
  }
};

build().catch(() => {
  process.exit(1);
});
