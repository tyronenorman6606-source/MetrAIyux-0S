import { mkdir, copyFile, rm, cp } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "src"), { recursive: true });
for (const file of ["index.html", "src/app.js", "src/styles.css"]) {
  await copyFile(join(root, file), join(dist, file));
}
await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });
console.log(JSON.stringify({ ok: true, app: "skyeapi-console", dist, brandedAssets: true }, null, 2));
