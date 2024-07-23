import { defineConfig } from "@farmfe/core";
import solid from "@farmfe/js-plugin-solid";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [solid(), "@farmfe/plugin-sass"],
  compilation: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        bootstrap: path.resolve(__dirname, "node_modules/bootstrap"),
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    // watch: {
    //   // 3. tell vite to ignore watching `src-tauri`
    //   ignored: ["**/src-tauri/**"],
    // },
  },
});
