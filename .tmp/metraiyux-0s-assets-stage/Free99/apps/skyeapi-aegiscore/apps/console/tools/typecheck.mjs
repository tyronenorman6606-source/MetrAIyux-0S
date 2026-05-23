import { readFile } from "node:fs/promises";
for (const file of ["index.html", "src/app.js", "src/styles.css"]) {
  const text = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  if (!text.trim()) throw new Error(`${file} is empty`);
}
console.log(JSON.stringify({ ok: true, app: "skyeapi-console", checks: ["files_present", "non_empty"] }, null, 2));
