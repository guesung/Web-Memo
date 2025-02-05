import { exec } from 'child_process';
import dotenv from 'dotenv';
import * as esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  bundle: true,
  alias: {
    '@src': resolve(__dirname, './src'),
  },
  format: 'esm',
  outExtension: { '.js': '.js' },
  sourcemap: true,
};

const build = async () => {
  const startTime = performance.now();

  console.log('🚀 빌드 프로세스 시작...');

  try {
    await esbuild.build(libBuildOptions);
    console.log('✅ esbuild 빌드 완료');

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
