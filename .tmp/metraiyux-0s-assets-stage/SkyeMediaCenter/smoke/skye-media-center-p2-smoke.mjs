#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const routePages = ['index.html','dashboard.html','workflows.html','records.html','runtime.html','proof.html','settings.html'];
const required = [
  'PLATFORM_TRUTH.json',
  'PROOF_STATUS.md',
  'README.md',
  'assets/platform-mark.svg',
  'docs/PLATFORM_STATUS.md',
  'docs/EXPERIENCE_SYSTEM.md',
  'src/runtime-contract.json',
  'platform.css',
  'platform.js',
  'public/media-experience.css',
  'public/media-experience.js',
  'gate-session.js',
  'manifest.webmanifest',
];
const failures = [];
async function exists(filePath){ try{ await fs.access(filePath); return true; }catch{return false;} }
async function walk(dir, files=[]){
  const entries = await fs.readdir(dir, {withFileTypes:true});
  for(const entry of entries){
    if(['.git','node_modules','.next'].includes(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if(entry.isDirectory()) await walk(absolute, files);
    else if(entry.isFile()) files.push(absolute);
  }
  return files;
}
for(const page of routePages){
  const html = await fs.readFile(path.join(root,page),'utf8').catch(()=>'');
  if(!html.includes('data-platform-hardening="p3-experiential"')) failures.push(page+' missing P3 experiential marker');
  if(!html.includes('./platform.css') || !html.includes('./platform.js')) failures.push(page+' missing platform surface wiring');
  if(!html.includes('./gate-session.js')) failures.push(page+' missing Free99 gate-session wiring');
  if(!html.includes('Open Intake Portal') || !html.includes('Open Operator Theater')) failures.push(page+' missing launch links');
}
for(const file of required){ if(!(await exists(path.join(root,file)))) failures.push(file+' missing'); }
const publicIndex = await fs.readFile(path.join(root,'public/index.html'),'utf8').catch(()=>'');
const publicAdmin = await fs.readFile(path.join(root,'public/admin.html'),'utf8').catch(()=>'');
const publicJs = await fs.readFile(path.join(root,'public/media-experience.js'),'utf8').catch(()=>'');
if(!publicIndex.includes('Asset Drop Reactor')) failures.push('public intake is not rebuilt as Asset Drop Reactor');
if(!publicIndex.includes('../gate-session.js')) failures.push('public intake is missing Free99 gate session script');
if(!publicAdmin.includes('Operator Theater') || !publicAdmin.includes('Operator Review Board')) failures.push('operator theater lanes missing');
if(!publicAdmin.includes('../gate-session.js')) failures.push('operator theater is missing Free99 gate session script');
if(!publicJs.includes('content_base64')) failures.push('public media JS is not wired to upload contract');
if(!publicJs.includes('requireGateSession')) failures.push('public media JS does not require a gate session before startup');
if(!publicJs.includes('workflow-timeline')) failures.push('public media JS is not wired to workflow timeline');
const htmlPages = (await walk(root)).filter((file)=>file.endsWith('.html'));
if(htmlPages.length < 9) failures.push('expected at least 9 html surfaces, found '+htmlPages.length);
if(failures.length){ console.error(failures.join('\n')); process.exit(1); }
console.log('SkyeMediaCenter P3 experiential smoke passed: '+htmlPages.length+' html surfaces plus runtime assets checked.');
