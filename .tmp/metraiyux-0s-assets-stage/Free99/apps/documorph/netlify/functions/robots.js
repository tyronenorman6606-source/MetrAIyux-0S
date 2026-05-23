/**
 * Dynamic robots.txt for DocuMorph (Netlify Function)
 * Served via: /robots.txt -> /.netlify/functions/robots
 */
exports.handler = async function(event) {
  const h = event.headers || {};
  const host = h['x-forwarded-host'] || h['X-Forwarded-Host'] || h.host;
  const proto = h['x-forwarded-proto'] || h['X-Forwarded-Proto'] || 'https';
  const origin = host ? `${proto}://${host}` : '';

  const body =
`User-agent: *
Allow: /
Disallow: /api/
Disallow: /.netlify/

Sitemap: ${origin}/sitemap.xml
`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
    body
  };
};
