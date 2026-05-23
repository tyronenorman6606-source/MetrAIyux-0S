/**
 * Dynamic sitemap.xml for DocuMorph (Netlify Function)
 * Served via: /sitemap.xml  ->  /.netlify/functions/sitemap
 */
function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

exports.handler = async function(event) {
  const h = event.headers || {};
  const host = h['x-forwarded-host'] || h['X-Forwarded-Host'] || h.host;
  const proto = h['x-forwarded-proto'] || h['X-Forwarded-Proto'] || 'https';
  const origin = host ? `${proto}://${host}` : '';

  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/app/', changefreq: 'weekly', priority: '0.9' },
    { loc: '/privacy', changefreq: 'monthly', priority: '0.4' },
    { loc: '/terms', changefreq: 'monthly', priority: '0.4' },
    { loc: '/ai.md', changefreq: 'monthly', priority: '0.2' },
    { loc: '/llms.txt', changefreq: 'monthly', priority: '0.2' },
  ];

  const body =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${xmlEscape(origin + u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
    body
  };
};
