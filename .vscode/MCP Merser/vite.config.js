import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "mcp4-copy-source-packs",
      closeBundle() {
        const from = path.resolve("source-packs");
        const to = path.resolve("dist/source-packs");
        if (!fs.existsSync(from)) return;
        fs.rmSync(to, { recursive: true, force: true });
        fs.cpSync(from, to, { recursive: true });

        const sourceAssets = path.resolve("source-packs/assets");
        const rootAssets = path.resolve("dist/assets");
        if (fs.existsSync(sourceAssets)) {
          fs.cpSync(sourceAssets, rootAssets, { recursive: true });
        }
      },
    },
  ],
  optimizeDeps: {
    include: [
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "@react-three/postprocessing",
      "postprocessing",
      "framer-motion",
      "motion",
      "gsap",
      "lenis",
      "@theatre/core",
      "@remotion/player",
      "remotion",
      "lucide-react",
    ],
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three") || id.includes("@react-three") || id.includes("postprocessing")) return "three";
          if (id.includes("framer-motion") || id.includes("motion") || id.includes("gsap") || id.includes("lenis")) return "motion";
          if (id.includes("@remotion") || id.includes("node_modules/remotion")) return "cinema";
          if (id.includes("@theatre")) return "theatre";
          return undefined;
        },
      },
    },
  },
});
