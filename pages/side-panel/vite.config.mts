import { withPageConfig } from '@extension/vite-config';
import { resolve } from 'path';
import svgr from 'vite-plugin-svgr';

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  plugins: [
    svgr({
      svgrOptions: { exportType: 'default', ref: true, svgo: false, titleProp: true },
      include: '**/*.svg',
    }),
  ],

  publicDir: resolve(rootDir, 'public'),

  build: {
    outDir: resolve(rootDir, '..', '..', 'dist', 'side-panel'),
    sourcemap: true,
  },
});
