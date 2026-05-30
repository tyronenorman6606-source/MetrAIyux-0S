import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const dist = path.join(root, "dist");
const assets = path.join(dist, "assets");
const mediaSource = path.resolve(root, "../supaboy-merser31/media");
const mediaDest = path.join(dist, "media");
const mediaFiles = ["houston-proof.webp", "houston-mart.webp", "slb-cover.webp"];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(assets, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, "src", "main.jsx")],
  bundle: true,
  outfile: path.join(assets, "app.js"),
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  loader: { ".js": "jsx" },
  define: { "process.env.NODE_ENV": "\"production\"" },
  minify: true,
  sourcemap: false
});

fs.copyFileSync(path.join(root, "src", "styles.css"), path.join(assets, "app.css"));
fs.copyFileSync(path.join(root, "index.html"), path.join(dist, "index.html"));
fs.writeFileSync(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\n");

fs.mkdirSync(mediaDest, { recursive: true });
for (const file of mediaFiles) {
  const source = path.join(mediaSource, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(mediaDest, file));
}
