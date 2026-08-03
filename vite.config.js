import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/index.js",
      formats: ["es"],
      fileName: () => "iris.js"
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime"],
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name === "style.css" ? "iris.css" : "[name][extname]"
      }
    }
  }
});
