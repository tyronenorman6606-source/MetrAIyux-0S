const rangeEnabledAssets = new Set([
  "/assets/product-shots/metraiyux-0s-long-real-proof.mp4"
]);

function parseRange(rangeHeader, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || "");
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;

  if (!rawStart) {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    return {
      start: Math.max(size - suffix, 0),
      end: size - 1
    };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null;

  return {
    start,
    end: Math.min(end, size - 1)
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!rangeEnabledAssets.has(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const assetRequest = request.method === "HEAD"
      ? new Request(request.url, { method: "GET", headers: request.headers })
      : request;
    const assetResponse = await env.ASSETS.fetch(assetRequest);
    if (!assetResponse.ok) return assetResponse;

    const headers = new Headers(assetResponse.headers);
    headers.set("accept-ranges", "bytes");
    headers.delete("content-encoding");

    const rangeHeader = request.headers.get("range");
    if (!rangeHeader) {
      return new Response(request.method === "HEAD" ? null : assetResponse.body, {
        status: assetResponse.status,
        headers
      });
    }

    const body = await assetResponse.arrayBuffer();
    const size = body.byteLength;
    const range = parseRange(rangeHeader, size);

    if (!range) {
      headers.set("content-range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }

    const chunk = body.slice(range.start, range.end + 1);
    headers.set("content-range", `bytes ${range.start}-${range.end}/${size}`);
    headers.set("content-length", String(chunk.byteLength));

    return new Response(request.method === "HEAD" ? null : chunk, {
      status: 206,
      headers
    });
  }
};
