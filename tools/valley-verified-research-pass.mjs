#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = 'metraiyux_0s_site/skyenet-drops/valley-verified-rebuild-content/businesses';
const OUT_RECEIPT = process.env.VV_RESEARCH_RECEIPT || 'test-artifacts/skyenet/valley-verified-research-pass-receipt.json';
const USER_AGENT = 'Mozilla/5.0 (compatible; ValleyVerifiedResearch/1.0; +https://valley-verified.pages.dev/)';
const MAX_SOURCES = 5;
const SEARCH_DELAY_MS = Number(process.env.VV_RESEARCH_SEARCH_DELAY_MS || 450);
const FETCH_TIMEOUT_MS = Number(process.env.VV_RESEARCH_FETCH_TIMEOUT_MS || 12_000);
const LIMIT = Number(process.env.VV_RESEARCH_LIMIT || 0);
const OFFSET = Number(process.env.VV_RESEARCH_OFFSET || 0);
const SKIP_EXISTING = String(process.env.VV_RESEARCH_SKIP_EXISTING || '1') !== '0';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(html = '') {
  return cleanText(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' '));
}

function titleFromHtml(html = '') {
  const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(match?.[1] || '');
}

function metaDescription(html = '') {
  const match = String(html).match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    || String(html).match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i)
    || String(html).match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  return cleanText(match?.[1] || '');
}

function normalizeUrl(url = '') {
  try {
    const parsed = new URL(String(url).trim());
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function hostOf(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function sourceType(url = '', business = {}) {
  const host = hostOf(url);
  const businessHost = hostOf(business.website);
  if (businessHost && host === businessHost) return 'official_website';
  if (/facebook|instagram|linkedin|youtube|tiktok/.test(host)) return 'social';
  if (/phoenixchamber|chamber|bbb|mapquest|yelp|google|startus|realty\.com|visitglendale|westgateaz/.test(host)) return 'directory';
  if (/\.gov$|\.edu$/.test(host)) return 'public_reference';
  return 'web_result';
}

function isLikelyUsefulUrl(url = '') {
  const host = hostOf(url);
  if (!host) return false;
  if (/bing\.com|search\.brave\.com|duckduckgo\.com|google\.com|yahoo\.com/.test(host)) return false;
  if (/webcache|translate\.google/.test(url)) return false;
  return true;
}

function parseBraveResults(html = '') {
  const blocks = [...String(html).matchAll(/<div class="snippet[\s\S]*?(?=<div class="snippet|<\/main>)/g)]
    .map((match) => match[0]);
  const results = [];
  for (const block of blocks) {
    const href = normalizeUrl(block.match(/<a href="([^"]+)"/)?.[1] || '');
    if (!isLikelyUsefulUrl(href)) continue;
    const text = stripHtml(block).slice(0, 900);
    const title = cleanText(text.split('  ')[0] || text.split(' › ')[0] || hostOf(href));
    if (!results.some((item) => item.url === href)) {
      results.push({ title: title || hostOf(href), url: href, snippet: text });
    }
    if (results.length >= 6) break;
  }
  return results;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  timer.unref?.();
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, url: response.url || url, text };
  } catch (error) {
    return { ok: false, status: 0, url, text: '', error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function searchBusiness(business) {
  const cityState = [business.city, business.state].filter(Boolean).join(' ');
  const q = `"${business.name}" ${cityState} ${business.subcategory || business.category || ''}`.trim();
  const url = `https://search.brave.com/search?q=${encodeURIComponent(q)}`;
  const result = await fetchWithTimeout(url);
  await sleep(SEARCH_DELAY_MS);
  if (!result.ok && !result.text) return [];
  return parseBraveResults(result.text);
}

async function summarizeUrl(url, business) {
  const fetched = await fetchWithTimeout(url);
  const title = titleFromHtml(fetched.text) || hostOf(fetched.url || url);
  const description = metaDescription(fetched.text);
  const bodyText = stripHtml(fetched.text).slice(0, 2400);
  const raw = cleanText([description, bodyText].filter(Boolean).join(' '));
  const categoryHints = categoryServices(business)
    .filter((hint) => raw.toLowerCase().includes(hint.toLowerCase().split(' ')[0] || hint.toLowerCase()))
    .slice(0, 4);
  const notes = [
    description ? `Source description references: ${description.slice(0, 220)}` : '',
    categoryHints.length ? `Relevant topic cues found: ${categoryHints.join(', ')}.` : '',
    fetched.ok ? 'Use this source to confirm company positioning, contact details, and page-specific service language before publishing.' : ''
  ].filter(Boolean).join(' ').slice(0, 520);
  return {
    title,
    url: normalizeUrl(fetched.url || url) || url,
    source_type: sourceType(fetched.url || url, business),
    accessed_at: new Date().toISOString(),
    notes: notes || (fetched.ok ? 'Source loaded, but usable page text was sparse.' : `Source could not be fully fetched; status ${fetched.status || 'network error'}.`)
  };
}

function categoryServices(business) {
  const base = [
    business.subcategory,
    business.niche,
    business.license_type,
    ...(Array.isArray(business.tags) ? business.tags : [])
  ].filter(Boolean);
  const unique = [...new Set(base.map(cleanText).filter(Boolean))];
  return unique.slice(0, 8);
}

function inferAudience(business) {
  const category = `${business.category || ''} ${business.subcategory || ''} ${business.niche || ''}`.toLowerCase();
  if (/dent|health|clinic|medical|care|therapy|senior/.test(category)) return ['patients', 'families seeking care', 'local Phoenix-area residents'];
  if (/home|plumb|air|duct|hvac|roof|construction|clean/.test(category)) return ['homeowners', 'property managers', 'local service callers'];
  if (/real estate|property|mortgage|loan/.test(category)) return ['homeowners', 'buyers', 'rental owners', 'local property clients'];
  if (/legal|financial|bank|credit|account/.test(category)) return ['individual clients', 'business clients', 'local households'];
  if (/food|event|entertainment|restaurant/.test(category)) return ['local guests', 'families', 'event visitors'];
  if (/beauty|hair|wellness|spa|skin/.test(category)) return ['appointment-based clients', 'wellness customers', 'local residents'];
  if (/business|marketing|staff|employment|promotion/.test(category)) return ['local businesses', 'operators', 'professional teams'];
  if (/education|child|youth|school/.test(category)) return ['students', 'parents', 'families'];
  return ['local customers', 'Valley residents', 'business clients'];
}

function visualDirection(business) {
  const category = `${business.category || ''} ${business.subcategory || ''} ${business.niche || ''}`.toLowerCase();
  if (/dent|health|clinic|medical|care|therapy/.test(category)) return ['clean clinical palette', 'staff-and-care detail shots', 'calm appointment-focused layout'];
  if (/home|plumb|air|duct|hvac|roof|construction|clean/.test(category)) return ['service-truck and jobsite imagery', 'before/after panels', 'bold quote-request blocks'];
  if (/real estate|property|mortgage|loan/.test(category)) return ['property detail imagery', 'neighborhood context', 'trust-forward owner/buyer pathway'];
  if (/food|event|entertainment|restaurant/.test(category)) return ['high-energy venue imagery', 'menu/event highlights', 'clear hours and location modules'];
  if (/beauty|hair|wellness|spa|skin/.test(category)) return ['warm appointment imagery', 'treatment/service menu focus', 'soft but polished color system'];
  if (/business|marketing|staff|employment|promotion/.test(category)) return ['sharp professional layout', 'case-study/proof blocks', 'service capability grid'];
  return ['local-first imagery', 'clear service modules', 'map and contact emphasis'];
}

function buildLandingContent(business, sources) {
  const city = business.city || 'the Valley';
  const service = business.subcategory || business.niche || business.category || 'local service';
  const sourceTitles = sources.map((source) => source.title).filter(Boolean).slice(0, 3);
  return {
    headline_angles: [
      `${business.name} serves ${city} with ${service}.`,
      `${city} ${service} details, contact routes, and verified public-source facts.`,
      `A local landing page centered on what ${business.name} actually offers.`
    ],
    section_ideas: [
      'Service focus and who should contact them',
      'Location, phone, and service-area context',
      'Source-backed trust signals and public listing facts',
      'Customer decision checklist for scope, availability, and pricing'
    ],
    proof_points: sourceTitles.length ? sourceTitles : ['Local business record', 'Public directory source'],
    visual_direction: visualDirection(business),
    local_context: [
      business.address ? `Located at or listed near ${business.address}.` : `Listed for ${city}, ${business.state || 'AZ'}.`,
      business.source_url ? `Original source URL is available in the Valley Verified business record.` : 'Original public source URL was not present in the local record.'
    ],
    questions_to_answer: [
      'What exact services are available right now?',
      'What areas are served?',
      'What are current hours and booking steps?',
      'What pricing, deposit, or consultation details should customers know?'
    ]
  };
}

function buildStatus(sources) {
  const official = sources.some((source) => source.source_type === 'official_website');
  if (official && sources.length >= 3) return 'rich';
  if (official || sources.length >= 3) return 'moderate';
  if (sources.length >= 1) return 'limited';
  return 'not_found';
}

function contentWarnings(business, sources) {
  const warnings = [];
  if (!business.website) warnings.push('No official website was present in the local business record.');
  if (!sources.some((source) => source.source_type === 'official_website')) warnings.push('No confirmed official website source was found during this pass.');
  if (!business.hours || Object.values(business.hours).every((value) => !value)) warnings.push('Hours were not confirmed in the local business record.');
  if (!business.price_note && !business.starting_price) warnings.push('Pricing was not confirmed; landing copy should ask visitors to contact the business.');
  return warnings;
}

async function readBusiness(slug) {
  const file = path.join(ROOT, slug, 'business.json');
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function researchBusiness(slug) {
  const dir = path.join(ROOT, slug);
  if (SKIP_EXISTING && existsSync(path.join(dir, 'research.json')) && existsSync(path.join(dir, 'research.md'))) {
    return 'skipped';
  }
  const business = await readBusiness(slug);
  const found = [];
  if (business.website) found.push({ title: `${business.name} official website`, url: normalizeUrl(business.website), snippet: '' });
  if (business.source_url) found.push({ title: `${business.name} public source`, url: normalizeUrl(business.source_url), snippet: '' });
  const searchResults = await searchBusiness(business);
  for (const result of searchResults) {
    if (!found.some((item) => hostOf(item.url) === hostOf(result.url) || item.url === result.url)) found.push(result);
  }
  const sourceInputs = found.filter((item) => isLikelyUsefulUrl(item.url)).slice(0, MAX_SOURCES);
  const sources = [];
  for (const item of sourceInputs) {
    const summary = await summarizeUrl(item.url, business);
    if (!summary.notes && item.snippet) summary.notes = item.snippet;
    if (item.snippet && summary.notes.length < 180) summary.notes = cleanText(`${summary.notes} ${item.snippet}`).slice(0, 700);
    if (!sources.some((source) => source.url === summary.url)) sources.push(summary);
    await sleep(80);
  }
  const confirmed = {
    services: categoryServices(business),
    audiences: inferAudience(business),
    service_area: [business.city, business.state, business.zip].filter(Boolean).join(', '),
    address: business.address || '',
    phone: business.phone || '',
    hours: business.hours || {},
    differentiators: sources
      .map((source) => source.notes)
      .join(' ')
      .match(/(family-owned|locally owned|emergency|same-day|insured|licensed|award|certified|appointments?|free estimate|financing|all ages|patients of all ages|complete dentistry|property management|events|shopping|dining)/gi)
      ?.slice(0, 8) || [],
    trust_signals: [
      business.source_url ? 'Public source URL present in Valley Verified record.' : '',
      business.last_verified ? `Local record last verified ${business.last_verified}.` : '',
      business.phone ? 'Phone number present in source record.' : '',
      business.address ? 'Address present in source record.' : ''
    ].filter(Boolean),
    products: [],
    pricing_notes: business.starting_price
      ? [`Starting price in local record: ${business.starting_price}`]
      : ['Pricing not confirmed in available sources; contact business for current scope and quote.']
  };
  const research = {
    business_id: business.id || slug,
    business_name: business.name || slug,
    researched_at: new Date().toISOString(),
    research_status: buildStatus(sources),
    sources,
    confirmed_facts: confirmed,
    landing_page_content: buildLandingContent(business, sources),
    content_warnings: contentWarnings(business, sources)
  };
  const md = [
    `# ${research.business_name} Research`,
    '',
    `Status: ${research.research_status}`,
    `Researched: ${research.researched_at}`,
    '',
    '## Confirmed Facts',
    `- Services: ${confirmed.services.join(', ') || 'Not confirmed'}`,
    `- Audience: ${confirmed.audiences.join(', ')}`,
    `- Service area: ${confirmed.service_area || 'Not confirmed'}`,
    `- Address: ${confirmed.address || 'Not confirmed'}`,
    `- Phone: ${confirmed.phone || 'Not confirmed'}`,
    `- Pricing: ${confirmed.pricing_notes.join(' ')}`,
    '',
    '## Landing Page Use',
    ...research.landing_page_content.headline_angles.map((item) => `- ${item}`),
    '',
    '## Source URLs',
    ...(sources.length ? sources.map((source) => `- ${source.title}: ${source.url}`) : ['- No external source confirmed during this pass.']),
    '',
    '## Warnings',
    ...(research.content_warnings.length ? research.content_warnings.map((item) => `- ${item}`) : ['- None.']),
    ''
  ].join('\n');
  await fs.writeFile(path.join(dir, 'research.json'), JSON.stringify(research, null, 2) + '\n');
  await fs.writeFile(path.join(dir, 'research.md'), md);
  return research.research_status;
}

async function main() {
  const allSlugs = (await fs.readdir(ROOT))
    .filter((slug) => existsSync(path.join(ROOT, slug, 'business.json')))
    .sort();
  const slugs = LIMIT ? allSlugs.slice(OFFSET, OFFSET + LIMIT) : allSlugs.slice(OFFSET);
  const counts = { rich: 0, moderate: 0, limited: 0, not_found: 0, failed: 0 };
  const failures = [];
  for (let index = 0; index < slugs.length; index += 1) {
    const slug = slugs[index];
    try {
      const status = await researchBusiness(slug);
      counts[status] = (counts[status] || 0) + 1;
      process.stderr.write(`research ${OFFSET + index + 1}/${allSlugs.length}: ${slug} -> ${status}\n`);
    } catch (error) {
      counts.failed += 1;
      failures.push({ slug, error: error.message });
      process.stderr.write(`research failed: ${slug}: ${error.message}\n`);
    }
  }
  const receipt = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    root: ROOT,
    offset: OFFSET,
    requested: slugs.length,
    total_businesses: allSlugs.length,
    counts,
    failures,
    run_id: crypto.randomBytes(8).toString('hex')
  };
  await fs.mkdir(path.dirname(OUT_RECEIPT), { recursive: true });
  await fs.writeFile(OUT_RECEIPT, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
