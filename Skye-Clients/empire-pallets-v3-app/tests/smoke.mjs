
import fs from 'node:fs';
const required=['index.html','scan.html','preview.html','offline.html','manifest.webmanifest','service-worker.js','services.html','new-pallets.html','recycled-pallets.html','pallet-recycling.html','heat-treatment.html','drop-trailer.html','custom-pallets.html','quote.html','sustainability.html','service-areas.html','industries.html','faq.html','programs.html','dropin/empire-quote-dropin.js','assets/empire-pallets-logo.png','assets/media/empire-hero.mp4','assets/empire-pallets-scan-qr.svg'];
for(const f of required){if(!fs.existsSync(new URL('../'+f,import.meta.url))) throw new Error('Missing '+f)}
const publicFiles=required.filter(f=>f.endsWith('.html')).map(f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8')).join('\n');
const appSource=['index.html','scan.html','preview.html','quote.html','assets/app.js','service-worker.js','manifest.webmanifest'].map(f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8')).join('\n');
for(const banned of ['ADFlow','SkyRoutes','VANTA','OpenHands','pitch engine','repair logic','internal','lorem','placeholder']){if(publicFiles.includes(banned)) throw new Error('Public app leaked internal term: '+banned)}
for(const phrase of ['Dock / forklift access','Recurring need?','Industries','Commercial programs','FAQ','Quick fit estimator','manifest.webmanifest','service-worker.js','scan.html','preview.html']){if(!appSource.includes(phrase) && !publicFiles.includes(phrase)) throw new Error('Missing app feature: '+phrase)}
console.log('Empire Pallets upgraded app smoke passed');
