import * as esbuild from 'esbuild';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
dotenv.config();

const define = {};

for (const k in process.env) {
  define[`process.env.${k}`] = JSON.stringify(process.env[k]);
}

/**
 * @type { import("esbuild").BuildOptions }
 */
const buildOptions = {
  tsconfig: 'tsconfig.json',
  entryPoints: ['./src/**/*'],
  bundle: false,
  target: 'es6',
  outdir: './dist',
  sourcemap: true,
  define,
  plugins: [
    {
      name: 'TypeScriptDeclarationsPlugin',
      setup(build) {
        build.onEnd(result => {
          if (result.errors.length > 0) return;
          execSync('tsc');
        });
      },
    },
  ],
};

await esbuild.build(buildOptions);
