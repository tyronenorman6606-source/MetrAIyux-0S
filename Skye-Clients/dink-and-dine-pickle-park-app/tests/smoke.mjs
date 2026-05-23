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
  "assets/dink-and-dine-scan-code.svg",
  "assets/media/court-reservations.svg",
  "assets/media/open-play-leagues.svg",
  "assets/media/lessons-clinics.svg",
  "assets/media/memberships.svg",
  "assets/media/private-events.svg",
  "assets/media/food-bar.svg",
  "assets/media/loyalty-program.svg",
  "assets/media/event-calendar.svg",
  "assets/media/guest-followup.svg"
];
for (const file of required) if (!fs.existsSync(new URL('../'+file, import.meta.url))) throw new Error('Missing '+file);
const publicFiles=required.filter(f=>f.endsWith('.html')).map(f=>fs.readFileSync(new URL('../'+f, import.meta.url),'utf8')).join('\n').replace(/&amp;/g,'&');
for (const banned of ['Sprouts Farmers Market','Republic Services','Client Brand','clientbrand','white-label','placeholder','CLIENT STOREFRONT','BUSINESS SHOWCASE','lorem','OpenHands','ADFlow','SkyRoutes']) if (publicFiles.includes(banned)) throw new Error('Public app leaked banned term: '+banned);
for (const phrase of ['Dink & Dine Pickle Park','Court Reservations','scan route','manifest.webmanifest']) if (!publicFiles.includes(phrase)) throw new Error('Missing app feature: '+phrase);
console.log('Dink & Dine Pickle Park smoke passed');