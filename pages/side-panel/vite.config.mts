import { withPageConfig } from "@web-memo/vite-config";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, "src");

export default withPageConfig({
  resolve: {
    alias: {
      "@src": srcDir,
    },
  },
  plugins: [
    visualizer({
      open: true,
      filename: "dist/stats.html",
      template: "treemap",
    }),
  ],
  publicDir: resolve(rootDir, "public"),
  build: {
    outDir: resolve(rootDir, "..", "..", "dist", "side-panel"),
    sourcemap: true,
    rollupOptions: {
      treeshake: "recommended",
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
    minify: "esbuild",
  },
});
