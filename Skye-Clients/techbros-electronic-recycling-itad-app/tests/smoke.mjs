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
  "assets/techbros-scan-code.svg",
  "assets/media/business-pickups.svg",
  "assets/media/itad-intake.svg",
  "assets/media/data-destruction.svg",
  "assets/media/residential-dropoff.svg",
  "assets/media/certificates-compliance.svg",
  "assets/media/resale-reuse.svg",
  "assets/media/logistics.svg",
  "assets/media/industries-served.svg",
  "assets/media/customer-followup.svg"
];
for (const file of required) if (!fs.existsSync(new URL('../'+file, import.meta.url))) throw new Error('Missing '+file);
const publicFiles=required.filter(f=>f.endsWith('.html')).map(f=>fs.readFileSync(new URL('../'+f, import.meta.url),'utf8')).join('\n').replace(/&amp;/g,'&');
for (const banned of ['Sprouts Farmers Market','Republic Services','Client Brand','clientbrand','white-label','placeholder','CLIENT STOREFRONT','BUSINESS SHOWCASE','lorem','OpenHands','ADFlow','SkyRoutes']) if (publicFiles.includes(banned)) throw new Error('Public app leaked banned term: '+banned);
for (const phrase of ['Techbros Electronic Recycling & ITAD','Business Pickups','scan route','manifest.webmanifest']) if (!publicFiles.includes(phrase)) throw new Error('Missing app feature: '+phrase);
console.log('Techbros Electronic Recycling & ITAD smoke passed');