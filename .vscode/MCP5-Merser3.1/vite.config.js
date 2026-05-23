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
        fs.cpSync(from, to, {
          recursive: true,
          filter(source) {
            const rel = path.relative(from, source);
            if (!rel) return true;
            if (rel === "assets" || rel.startsWith(`assets${path.sep}`)) return false;
            if (rel === "metraiyux-0s-logo-transparent.png") return false;
            return true;
          },
        });

        const sourceAssets = path.resolve("source-packs/assets");
        const assetTargets = [path.resolve("dist/source-packs/assets"), path.resolve("dist/assets")];
        const copyAsset = (relativePath) => {
          const source = path.join(sourceAssets, relativePath);
          if (!fs.existsSync(source)) return;
          for (const targetRoot of assetTargets) {
            const target = path.join(targetRoot, relativePath);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.copyFileSync(source, target);
          }
        };
        const copyDir = (relativePath, filter = () => true) => {
          const source = path.join(sourceAssets, relativePath);
          if (!fs.existsSync(source)) return;
          for (const targetRoot of assetTargets) {
            const target = path.join(targetRoot, relativePath);
            fs.rmSync(target, { recursive: true, force: true });
            fs.cpSync(source, target, { recursive: true, filter });
          }
        };

        if (fs.existsSync(sourceAssets)) {
          for (const file of ["site.css", "site.js", "metraiyux-copy-paste.css", "metraiyux-sauce-kit.css", "metraiyux-0s-logo-transparent.png"]) {
            copyAsset(file);
          }
          copyAsset(path.join("icons", "metraiyux-icons.json"));
          copyDir(path.join("icons", "metraiyux"));
          copyDir("themes", (source) => {
            if (fs.statSync(source).isDirectory()) return true;
            return [".css", ".js", ".json", ".svg"].includes(path.extname(source));
          });
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
