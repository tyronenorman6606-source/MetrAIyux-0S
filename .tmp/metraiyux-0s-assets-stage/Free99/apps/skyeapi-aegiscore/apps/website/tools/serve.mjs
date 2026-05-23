import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL("../dist", import.meta.url).pathname;
const port = Number(process.env.PORT || 4180);
const types = new Map([[".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".svg", "image/svg+xml"], [".xml", "application/xml; charset=utf-8"], [".txt", "text/plain; charset=utf-8"], [".md", "text/markdown; charset=utf-8"], [".json", "application/json; charset=utf-8"]]);

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://localhost:${port}`);
    const safePath = normalize(url.pathname).replace(/^\/+/, "");
    let target = join(root, safePath || "index.html");
    const info = await stat(target).catch(() => null);
    if (info?.isDirectory()) target = join(target, "index.html");
    const body = await readFile(target);
    response.writeHead(200, { "content-type": types.get(extname(target)) || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => console.log(`SkyeAPI website served at http://localhost:${port}`));
