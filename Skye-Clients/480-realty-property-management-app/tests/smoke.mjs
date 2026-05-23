import fs from 'node:fs';
const required=[
  "index.html",
  "services.html",
  "quote.html",
  "scan.html",
  "preview.html",
  "gallery.html",
  "contact.html",
  "faq.html",
  "offline.html",
  "manifest.webmanifest",
  "service-worker.js",
  "assets/styles.css",
  "assets/app.js",
  "assets/480-realty-scan-code.svg",
  "assets/media/rental-analysis.svg",
  "assets/media/full-service-management.svg",
  "assets/media/tenant-portal-handoff.svg",
  "assets/media/maintenance-coordination.svg",
  "assets/media/inspections-turns.svg",
  "assets/media/owner-reporting.svg",
  "assets/media/leasing-marketing.svg",
  "assets/media/hoa-compliance.svg"
];
for (const file of required) if (!fs.existsSync(new URL('../'+file, import.meta.url))) throw new Error('Missing '+file);
const publicFiles=required.filter(f=>f.endsWith('.html')).map(f=>fs.readFileSync(new URL('../'+f, import.meta.url),'utf8')).join('\n').replace(/&amp;/g,'&');
for (const banned of ['Sprouts Farmers Market','Republic Services','Client Brand','clientbrand','white-label','placeholder','CLIENT STOREFRONT','BUSINESS SHOWCASE','lorem','OpenHands','ADFlow','SkyRoutes']) if (publicFiles.includes(banned)) throw new Error('Public app leaked banned term: '+banned);
for (const phrase of ['480 Realty & Property Management','Free Rental Analysis','scan route','manifest.webmanifest']) if (!publicFiles.includes(phrase)) throw new Error('Missing app feature: '+phrase);
console.log('480 Realty & Property Management smoke passed');