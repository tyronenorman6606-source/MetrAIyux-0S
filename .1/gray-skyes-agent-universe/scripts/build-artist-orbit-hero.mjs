import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const src = path.join(root, "src");
const assets = path.join(root, "assets");

fs.mkdirSync(assets, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(src, "gray-orbit-hero.jsx")],
  bundle: true,
  outfile: path.join(assets, "gray-orbit-hero.js"),
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  loader: { ".js": "jsx" },
  define: { "process.env.NODE_ENV": "\"production\"" },
  minify: true,
  sourcemap: false
});

fs.copyFileSync(path.join(src, "gray-orbit-hero.css"), path.join(assets, "gray-orbit-hero.css"));
