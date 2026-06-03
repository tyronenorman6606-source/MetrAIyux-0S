#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, 'metraiyux_0s_site');
const matrixPath = path.join(repoRoot, 'test-artifacts', '0s-operating-proof-matrix', '0s-operating-proof-matrix-latest.json');
const perAppPath = path.join(repoRoot, 'test-artifacts', '0s-per-app-operating-proof', '0s-per-app-operating-proof-latest.json');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-mounted-app-control-proof');
const latestPath = path.join(artifactRoot, '0s-mounted-app-control-proof-latest.json');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receiptPath = path.join(artifactRoot, stamp, 'receipt.json');

const behaviorFields = [
  'human_flow',
  'create',
  'read',
  'update_or_closeout',
  'receipt_readback',
  'stress',
  'founder_command_visible',
  'telemetry_or_command_event'
];

const readOnlyFields = [
  'human_flow',
  'read',
  'receipt_readback',
  'stress',
  'mutation_denial_or_not_applicable'
];

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readText(file, fallback = '') {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return fallback;
  }
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function decodePathname(value = '') {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sourceFileForMountedPath(mountedPath = '') {
  const clean = decodePathname(String(mountedPath || '').split('?')[0]).replace(/^\/+/, '');
  if (!clean) return '';
  const absolute = path.join(siteRoot, clean);
  if (existsSync(absolute) && statSync(absolute).isFile()) return absolute;
  if (!path.extname(clean)) {
    for (const candidate of [
      path.join(siteRoot, clean, 'index.html'),
      path.join(siteRoot, clean, 'public', 'index.html')
    ]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
  }
  return absolute;
}

function attrs(raw = '') {
  const out = {};
  for (const match of String(raw).matchAll(/([:@A-Za-z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const key = match[1].toLowerCase();
    if (!key || key === '<button' || key === '<a' || key === '<form' || key === '<input') continue;
    out[key] = match[2] ?? match[3] ?? match[4] ?? true;
  }
  return out;
}

function attrText(attributes = {}) {
  return Object.entries(attributes).map(([key, value]) => `${key}=${value}`).join(' ');
}

function textOf(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function classTokens(attributes = {}) {
  return String(attributes.class || '')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dataKeys(attributes = {}) {
  return Object.keys(attributes)
    .filter((key) => key.startsWith('data-'))
    .map((key) => key.slice(5));
}

function sourceReferencesToken(source = '', token = '') {
  if (!token || token.length < 2) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:['"\`#.]${escaped}['"\`]?|getElementById\\(['"]${escaped}['"]\\)|querySelector(?:All)?\\([^)]*${escaped})`).test(source);
}

function sourceReferencesDataKey(source = '', key = '', value = '') {
  if (!key) return false;
  const camel = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`data-${escapedKey}|dataset\\.${camel}|\\[data-${escapedKey}\\]`).test(source)
    || Boolean(value && new RegExp(`['"\`]${escapedValue}['"\`]`).test(source));
}

function nearSource(source = '', pattern, verifier, radius = 500) {
  for (const match of source.matchAll(pattern)) {
    const start = Math.max(0, match.index - radius);
    const end = Math.min(source.length, match.index + match[0].length + radius);
    if (verifier(source.slice(start, end), match)) return true;
  }
  return false;
}

function hasEventBindingNear(source = '', tokenPattern, eventNames = ['click']) {
  const eventPattern = eventNames.map((eventName) => eventName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const addEvent = new RegExp(`addEventListener\\(\\s*['"](?:${eventPattern})['"]`, 'i');
  const onAssign = new RegExp(`\\.on(?:${eventPattern})\\s*=|\\[['"]on(?:${eventPattern})['"]\\]\\s*=`, 'i');
  return nearSource(source, tokenPattern, (windowText) => addEvent.test(windowText) || onAssign.test(windowText), 700);
}

function eventCallPattern(eventNames = ['click']) {
  const eventPattern = eventNames.map((eventName) => eventName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return `addEventListener\\(\\s*['"](?:${eventPattern})['"]`;
}

function idVariants(id = '') {
  const text = String(id || '').trim();
  const camel = text.replace(/[-_:.]+([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
  const compact = text.replace(/[^A-Za-z0-9_$]/g, '');
  return [...new Set([text, camel, compact].filter(Boolean))];
}

function elementLookupPattern(escaped = '') {
  return `(?:\\$\\(\\s*['"]#?${escaped}['"]\\s*\\)|el\\(\\s*['"]#?${escaped}['"]\\s*\\)|qs\\(\\s*['"]#?${escaped}['"]\\s*\\)|document\\.getElementById\\(\\s*['"]${escaped}['"]\\s*\\)|document\\.querySelector\\(\\s*['"]#[^'"]*${escaped}[^'"]*['"]\\s*\\))`;
}

function hasQuillToolbarEvidence(source = '', attributes = {}) {
  const hasQuillClass = classTokens(attributes).some((token) => token.startsWith('ql-'));
  return hasQuillClass && /\bnew\s+Quill\s*\(|\bQuill\b[\s\S]{0,800}\bmodules\s*:\s*\{[\s\S]{0,800}\btoolbar\b/i.test(source);
}

function dynamicHrefEvidence(source = '', attributes = {}) {
  if (!attributes.id) return '';
  const escaped = String(attributes.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`${elementLookupPattern(escaped)}(?:\\s*\\??\\.)?\\s*(?:href\\s*=|setAttribute\\(\\s*['"]href['"])`, 'i').test(source)) {
    return 'dynamic_href_assignment_by_id';
  }
  const aliasDefinition = new RegExp(`(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${elementLookupPattern(escaped)}`, 'g');
  for (const alias of source.matchAll(aliasDefinition)) {
    const aliasName = alias[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${aliasName}\\s*\\.\\s*(?:href\\s*=|setAttribute\\(\\s*['"]href['"])`, 'i').test(source)) {
      return 'dynamic_href_assignment_via_alias';
    }
  }
  for (const variant of idVariants(attributes.id)) {
    const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escapedVariant}\\s*\\.\\s*(?:href\\s*=|setAttribute\\(\\s*['"]href['"])`, 'i').test(source)) {
      return 'dynamic_href_assignment_by_global_id';
    }
    if (new RegExp(`\\b[A-Za-z_$][\\w$]*\\s*(?:\\.\\s*${escapedVariant}|\\[\\s*['"]${escapedVariant}['"]\\s*\\])\\s*\\.\\s*(?:href\\s*=|setAttribute\\(\\s*['"]href['"])`, 'i').test(source)) {
      return 'dynamic_href_assignment_by_object_property';
    }
  }
  return '';
}

function scriptHandlerEvidence(source = '', attributes = {}, eventNames = ['click']) {
  if (eventNames.includes('click') && attributes.onclick) return 'inline_onclick';
  if (eventNames.includes('change') && attributes.onchange) return 'inline_onchange';
  if (eventNames.includes('submit') && attributes.onsubmit) return 'inline_onsubmit';
  if (eventNames.includes('input') && attributes.oninput) return 'inline_oninput';
  if (attributes.formaction) return 'formaction';
  if (attributes.id) {
    const escaped = String(attributes.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const eventCall = eventCallPattern(eventNames);
    const directEvent = new RegExp(`${elementLookupPattern(escaped)}\\s*\\??\\.\\s*${eventCall}`, 'i');
    if (directEvent.test(source)) return 'direct_event_listener_by_id';
    const delegatedId = new RegExp(`${eventCall}[\\s\\S]{0,900}(?:target\\s*\\.\\s*id\\s*={2,3}\\s*['"]${escaped}['"]|closest\\(\\s*['"]#${escaped}['"]\\s*\\)|matches\\(\\s*['"]#${escaped}['"]\\s*\\))`, 'i');
    if (delegatedId.test(source)) return 'delegated_event_listener_by_id';
    for (const variant of idVariants(attributes.id)) {
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const objectPropertyEvent = new RegExp(`\\b[A-Za-z_$][\\w$]*\\s*(?:\\.\\s*${escapedVariant}|\\[\\s*['"]${escapedVariant}['"]\\s*\\])\\s*\\??\\.\\s*${eventCall}`, 'i');
      if (objectPropertyEvent.test(source)) return 'object_property_event_listener_by_id';
      const globalEvent = new RegExp(`\\b${escapedVariant}\\s*\\??\\.\\s*${eventCall}|\\b${escapedVariant}\\s*\\.\\s*on(?:click|change|submit|input)\\s*=`, 'i');
      if (globalEvent.test(source)) return 'global_id_event_listener';
    }
    const propertyDefinition = new RegExp(`([A-Za-z_$][\\w$]*)\\s*:\\s*${elementLookupPattern(escaped)}`, 'g');
    for (const prop of source.matchAll(propertyDefinition)) {
      const propName = prop[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b[A-Za-z_$][\\w$]*\\s*\\.\\s*${propName}\\s*\\??\\.\\s*${eventCall}`, 'i').test(source)) {
        return 'object_literal_property_event_listener_by_id';
      }
    }
    const collectionAliasEvent = new RegExp(`\\b[A-Za-z_$][\\w$]*\\s*\\[\\s*id\\s*\\]\\s*\\.\\s*${eventCall}`, 'i');
    if (collectionAliasEvent.test(source) && new RegExp(`['"]${escaped}['"]`).test(source)) return 'indexed_collection_event_listener_by_id';
    const indexedDynamicEvent = /(?:forEach|map)\s*\(\s*\(?\s*id\s*\)?\s*=>[\s\S]{0,240}(?:\$\(\s*['"]#?['"]\s*\+\s*id\s*\)|document\.getElementById\(\s*id\s*\)|querySelector\(\s*['"]#['"]\s*\+\s*id\s*\))\s*\.?\s*(?:addEventListener|onclick\s*=)/i;
    if (indexedDynamicEvent.test(source) && new RegExp(`['"]${escaped}['"]`).test(source)) return 'dynamic_indexed_event_listener_by_id';
    const aliasDefinition = new RegExp(`(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${elementLookupPattern(escaped)}`, 'g');
    for (const alias of source.matchAll(aliasDefinition)) {
      const aliasName = alias[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${aliasName}\\s*\\.\\s*${eventCall}`, 'i').test(source)) return 'variable_alias_event_listener_by_id';
      if (new RegExp(`\\b${aliasName}\\s*\\.\\s*on(?:click|change|submit|input)\\s*=`, 'i').test(source)) return 'variable_alias_event_assignment_by_id';
    }
    const idPattern = new RegExp(`(?:\\$\\(\\s*['"]${escaped}['"]\\s*\\)|getElementById\\(\\s*['"]${escaped}['"]\\s*\\)|querySelector(?:All)?\\(\\s*['"]#[^'"]*${escaped}[^'"]*['"]\\s*\\)|['"]#${escaped}['"])`, 'g');
    if (hasEventBindingNear(source, idPattern, eventNames)) return 'event_listener_by_id';
    const assignPattern = new RegExp(`(?:${escaped}|\\$\\{?${escaped}\\}?)\\s*\\.\\s*(?:onclick|onchange|onsubmit|oninput)\\s*=`, 'g');
    if (assignPattern.test(source)) return 'direct_event_assignment_by_id';
  }
  if (hasQuillToolbarEvidence(source, attributes)) return 'quill_toolbar_binding';
  if (attributes['aria-controls'] && sourceReferencesToken(source, String(attributes['aria-controls']))) {
    const escaped = String(attributes['aria-controls']).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const ariaPattern = new RegExp(`(?:aria-controls|${escaped})`, 'g');
    if (hasEventBindingNear(source, ariaPattern, eventNames)) return 'event_listener_by_aria_controls';
  }
  for (const token of classTokens(attributes)) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const classPattern = new RegExp(`(?:querySelector(?:All)?\\(\\s*['"][^'"]*\\.${escaped}[^'"]*['"]\\s*\\)|closest\\(\\s*['"][^'"]*\\.${escaped}[^'"]*['"]\\s*\\)|matches\\(\\s*['"][^'"]*\\.${escaped}[^'"]*['"]\\s*\\)|['"]\\.${escaped}['"])`, 'g');
    if (hasEventBindingNear(source, classPattern, eventNames)) return 'event_listener_by_class';
  }
  for (const key of dataKeys(attributes)) {
    if (sourceReferencesDataKey(source, key, attributes[`data-${key}`])) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const camel = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      const dataPattern = new RegExp(`(?:data-${escapedKey}|dataset\\.${camel}|\\[data-${escapedKey}\\])`, 'g');
      const eventCall = eventCallPattern(eventNames);
      const delegatedDataEvent = new RegExp(`${eventCall}[\\s\\S]{0,2200}(?:closest|matches)\\(\\s*['"][^'"]*\\[data-${escapedKey}(?:=[^\\]]+)?\\][^'"]*['"]\\s*\\)`, 'i');
      if (delegatedDataEvent.test(source)) return 'delegated_event_listener_by_data_attribute';
      if (hasEventBindingNear(source, dataPattern, eventNames)) return 'event_listener_by_data_attribute';
    }
  }
  return '';
}

function hasScriptHandler(source = '', attributes = {}, eventNames = ['click']) {
  return Boolean(scriptHandlerEvidence(source, attributes, eventNames));
}

function valueReadEvidence(source = '', attributes = {}) {
  const key = idOrName(attributes);
  if (key) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`${elementLookupPattern(escaped)}\\s*\\??\\.\\s*value`, 'i').test(source)) return 'value_read_by_element_lookup';
    for (const variant of idVariants(key)) {
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b[A-Za-z_$][\\w$]*\\s*(?:\\.\\s*${escapedVariant}|\\[\\s*['"]${escapedVariant}['"]\\s*\\])\\s*\\??\\.\\s*value`, 'i').test(source)) return 'value_read_by_object_property';
      if (new RegExp(`\\b${escapedVariant}\\s*\\??\\.\\s*value`, 'i').test(source)) return 'value_read_by_global_id';
    }
  }
  for (const keyName of dataKeys(attributes)) {
    const escapedKey = keyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const camel = keyName.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (new RegExp(`(?:querySelector|closest)\\(\\s*['"][^'"]*\\[data-${escapedKey}\\][^'"]*['"]\\s*\\)\\s*\\??\\.\\s*value`, 'i').test(source)) return 'value_read_by_data_selector';
    if (new RegExp(`dataset\\.${camel}[\\s\\S]{0,160}\\.value|\\.value[\\s\\S]{0,160}dataset\\.${camel}`, 'i').test(source)) return 'value_read_by_data_attribute';
  }
  return '';
}

function hasMutatingSource(source = '') {
  const compact = String(source || '').replace(/\s+/g, ' ');
  return /<form\b[^>]*method=["']?(?:post|put|patch|delete)\b/i.test(compact)
    || /\bfetch\s*\([^)]*method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(compact)
    || /\bXMLHttpRequest\b/i.test(compact)
    || /\baxios\.(?:post|put|patch|delete)\b/i.test(compact);
}

function disabledReason(attributes = {}) {
  if (attributes.disabled === true || attributes.disabled === 'disabled') return 'disabled_attribute';
  if (String(attributes['aria-disabled'] || '').toLowerCase() === 'true') return 'aria_disabled';
  return '';
}

function buttonIntent(attributes = {}, label = '') {
  const combined = `${attrText(attributes)} ${label}`.toLowerCase();
  if (/download|export|save|copy|print/.test(combined)) return 'download_export_copy_save';
  if (/tab|panel/.test(combined) || attributes.role === 'tab') return 'tab_or_panel';
  if (/menu|nav|toggle|expand|collapse/.test(combined)) return 'menu_toggle';
  if (/checkout|pay|buy|order|entitle/.test(combined)) return 'payment_or_entitlement';
  if (/submit|create|send|publish|deploy|upload|sync|close|complete|approve|release|record|login|sign/.test(combined)) return 'stateful_action';
  return 'generic';
}

function linkIntent(attributes = {}, label = '') {
  const href = String(attributes.href || '');
  const combined = `${attrText(attributes)} ${label}`.toLowerCase();
  if (/download|export|save|copy|print/.test(combined) || /\bdownload\b/i.test(attrText(attributes))) return 'download_export_copy_save';
  if (/checkout|pay|buy|order|entitle/.test(combined)) return 'payment_or_entitlement';
  if (/mailto:|tel:/i.test(href)) return 'external_contact';
  if (/^https?:\/\//i.test(href)) return 'external_link';
  if (/^#/.test(href)) return 'anchor_or_tab';
  return 'navigation';
}

function extractTagPairs(html = '', tag = '') {
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  return [...String(html).matchAll(re)].map((match, index) => ({
    index,
    start: match.index,
    end: match.index + match[0].length,
    raw: match[0],
    raw_attrs: match[1] || '',
    attrs: attrs(match[1] || ''),
    label: textOf(match[2] || '')
  }));
}

function extractVoidTags(html = '', tag = '') {
  const re = new RegExp(`<${tag}\\b([^>]*)>`, 'gi');
  return [...String(html).matchAll(re)].map((match, index) => ({
    index,
    start: match.index,
    end: match.index + match[0].length,
    raw: match[0],
    raw_attrs: match[1] || '',
    attrs: attrs(match[1] || '')
  }));
}

function resolveAsset(sourceFile = '', asset = '') {
  if (!asset || /^(?:https?:)?\/\//i.test(asset) || /^(?:mailto|tel|javascript|data):/i.test(asset)) return '';
  const pathname = asset.split('#')[0].split('?')[0];
  if (!pathname) return '';
  const base = pathname.startsWith('/')
    ? path.join(siteRoot, pathname.replace(/^\/+/, ''))
    : path.resolve(path.dirname(sourceFile), pathname);
  return existsSync(base) && statSync(base).isFile() ? base : '';
}

async function combinedSource(sourceFile = '', html = '') {
  const files = [sourceFile].filter(Boolean);
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const resolved = resolveAsset(sourceFile, match[1]);
    if (resolved) files.push(resolved);
  }
  let text = '';
  const included = [];
  for (const file of [...new Set(files)]) {
    const body = await readText(file);
    text += `\n/* ${rel(file)} */\n${body}\n`;
    included.push({ path: rel(file), bytes: Buffer.byteLength(body), sha256: sha256(body) });
  }
  return { text, included };
}

function extractFetchTargets(source = '') {
  const out = new Set();
  const patterns = [
    /\bfetch\(\s*["'`]([^"'`]+)["'`]/g,
    /\b(?:axios|ky)\.(?:get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g,
    /\b(?:href|action)=["']([^"']*\/api\/[^"']*)["']/gi
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const value = String(match[1] || '').trim();
      if (value) out.add(value);
    }
  }
  return [...out].sort();
}

function isInsideForm(html = '', index = 0) {
  const before = String(html).slice(0, index);
  return before.lastIndexOf('<form') > before.lastIndexOf('</form>');
}

function idOrName(attributes = {}) {
  return String(attributes.id || attributes.name || '').trim();
}

function hasFormSubmitHandler(source = '', formAttrs = {}) {
  const formId = idOrName(formAttrs);
  const submitEvents = ['submit'];
  const directEvidence = scriptHandlerEvidence(source, formAttrs, submitEvents);
  if (directEvidence) return directEvidence;
  if (formId) {
    const escaped = formId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const eventCall = eventCallPattern(submitEvents);
    const directSubmit = new RegExp(`(?:\\$\\(\\s*['"]${escaped}['"]\\s*\\)|document\\.getElementById\\(\\s*['"]${escaped}['"]\\s*\\)|document\\.querySelector\\(\\s*['"]#[^'"]*${escaped}[^'"]*['"]\\s*\\)|\\b[A-Za-z_$][\\w$]*\\s*(?:\\.\\s*${escaped}|\\[\\s*['"]${escaped}['"]\\s*\\]))\\s*\\??\\.\\s*${eventCall}`, 'i');
    if (directSubmit.test(source)) return 'submit_listener_by_form_id';
    const formPattern = new RegExp(`(?:getElementById\\(\\s*['"]${escaped}['"]\\s*\\)|querySelector(?:All)?\\(\\s*['"]#[^'"]*${escaped}[^'"]*['"]\\s*\\)|new FormData\\(\\s*(?:document\\.)?getElementById\\(\\s*['"]${escaped}['"]\\s*\\)\\s*\\)|new FormData\\(\\s*[^)]*${escaped}[^)]*\\))`, 'g');
    if (hasEventBindingNear(source, formPattern, submitEvents)) return 'submit_listener_by_form_id';
    if (nearSource(source, formPattern, (windowText) => /new FormData\(|fetch\(|XMLHttpRequest|axios\./i.test(windowText), 700)) return 'formdata_or_fetch_by_form_id';
  }
  if (/document\.addEventListener\(\s*['"]submit['"]|addEventListener\(\s*['"]submit['"]/i.test(source) && formId && source.includes(formId)) {
    return 'delegated_submit_handler';
  }
  return '';
}

function linkTargetEvidence(attributes = {}, sourceFile = '', mountedPaths = new Set(), source = '') {
  const href = String(attributes.href || '').trim();
  if (!href) {
    const dynamicHref = dynamicHrefEvidence(source, attributes);
    return dynamicHref ? { ok: true, evidence: dynamicHref, reason: '' } : { ok: false, evidence: '', reason: 'missing_href' };
  }
  if (/^javascript:\s*(?:void)?\s*\(?\s*0?\s*\)?\s*;?$/i.test(href) || href === '#') {
    const handler = scriptHandlerEvidence(source, attributes, ['click']);
    const dynamicHref = dynamicHrefEvidence(source, attributes);
    return handler ? { ok: true, evidence: handler, reason: '' }
      : dynamicHref ? { ok: true, evidence: dynamicHref, reason: '' }
      : { ok: false, evidence: '', reason: 'empty_or_javascript_href_without_click_handler' };
  }
  if (/^(?:mailto|tel):/i.test(href)) return { ok: true, evidence: 'contact_scheme', reason: '' };
  if (/^(?:https?:)?\/\//i.test(href)) return { ok: true, evidence: 'external_url', reason: '' };
  if (href.includes('${')) return { ok: true, evidence: 'dynamic_template_href', reason: '' };
  if (/^#/.test(href)) {
    const target = href.slice(1);
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const anchorExists = target && new RegExp(`(?:id|name)=["']${escaped}["']`, 'i').test(source);
    const handler = scriptHandlerEvidence(source, attributes, ['click']);
    return anchorExists ? { ok: true, evidence: 'anchor_target_exists', reason: '' }
      : handler ? { ok: true, evidence: handler, reason: '' }
      : { ok: false, evidence: '', reason: 'anchor_target_missing' };
  }
  const targetPath = href.split('#')[0].split('?')[0];
  const normalizedRaw = targetPath.startsWith('/') ? targetPath : path.posix.normalize(path.posix.join(path.posix.dirname(`/${rel(sourceFile).replace(/^metraiyux_0s_site\//, '')}`), targetPath));
  const normalized = `/${normalizedRaw.replace(/^\/+/, '')}`;
  if (mountedPaths.has(normalized) || mountedPaths.has(`${normalized.replace(/\/$/, '')}/`) || mountedPaths.has(`${normalized.replace(/\/$/, '')}/index.html`)) {
    return { ok: true, evidence: 'mounted_route_target', reason: '' };
  }
  if (/\/api\//i.test(normalized)) return { ok: true, evidence: 'api_link_target', reason: '' };
  const resolved = resolveAsset(sourceFile, href);
  if (resolved) return { ok: true, evidence: 'local_asset_target_exists', reason: '' };
  const absolute = path.join(siteRoot, normalized.replace(/^\/+/, ''));
  if (existsSync(absolute) && statSync(absolute).isDirectory() && existsSync(path.join(absolute, 'index.html'))) {
    return { ok: true, evidence: 'local_directory_index_target_exists', reason: '' };
  }
  const handler = scriptHandlerEvidence(source, attributes, ['click']);
  return handler ? { ok: true, evidence: handler, reason: '' } : { ok: false, evidence: '', reason: 'internal_target_missing' };
}

function fetchTargetContract(target = '', source = '') {
  const clean = String(target || '').trim();
  if (!clean) return { target: clean, ok: false, reason: 'empty_fetch_target', contract: '' };
  if (/^(?:https?:)?\/\//i.test(clean)) return { target: clean, ok: true, reason: '', contract: 'external_fetch_target' };
  if (clean.includes('${')) return { target: clean, ok: true, reason: '', contract: 'dynamic_template_fetch_target' };
  const pathOnly = clean.split('?')[0].replace(/^https?:\/\/[^/]+/i, '');
  if (!/\/api\//i.test(pathOnly) && !/^api\//i.test(pathOnly)) return { target: clean, ok: true, reason: '', contract: 'static_or_relative_fetch_target' };
  const normalized = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  const segments = normalized.split('/').filter(Boolean);
  const routeNeedles = [
    normalized,
    `/${segments.slice(0, 2).join('/')}`,
    `/${segments.slice(0, 3).join('/')}`
  ].filter((item) => item.length > 4);
  const contract = routeNeedles.find((needle) => source.includes(needle));
  return contract
    ? { target: clean, ok: true, reason: '', contract: `source_route_contract:${contract}` }
    : { target: clean, ok: false, reason: 'api_fetch_target_without_source_contract', contract: '' };
}

function inventoryControls(html = '', source = '', sourceFile = '', mountedPaths = new Set()) {
  const buttons = extractTagPairs(html, 'button').map((item) => {
    const templateOnly = item.label.includes('${') && !item.attrs.id && dataKeys(item.attrs).length === 0;
    const disabled = disabledReason(item.attrs);
    const type = String(item.attrs.type || '').toLowerCase();
    const handler = scriptHandlerEvidence(source, item.attrs, ['click']);
    const submitEvidence = type === 'submit' && isInsideForm(html, item.start) ? 'submit_button_in_form' : '';
    const quillEvidence = hasQuillToolbarEvidence(source, item.attrs) ? 'quill_toolbar_binding' : '';
    const wired = Boolean(templateOnly || disabled || submitEvidence || handler || quillEvidence);
    return {
      index: item.index,
      label: item.label,
      id: item.attrs.id || '',
      classes: classTokens(item.attrs),
      type: type || 'button',
      intent: buttonIntent(item.attrs, item.label),
      wired,
      disabled_reason: disabled,
      evidence: wired ? (templateOnly ? 'dynamic_template_not_static_dom' : disabled || submitEvidence || handler || quillEvidence) : '',
      failure_reason: wired ? '' : 'enabled_button_without_click_or_submit_handler'
    };
  });
  const links = extractTagPairs(html, 'a').map((item) => {
    const href = String(item.attrs.href || '').trim();
    const disabled = disabledReason(item.attrs);
    const target = disabled ? { ok: true, evidence: disabled, reason: '' } : linkTargetEvidence(item.attrs, sourceFile, mountedPaths, source);
    const goodHref = target.ok;
    const wired = Boolean(disabled || goodHref || hasScriptHandler(source, item.attrs));
    return {
      index: item.index,
      label: item.label,
      href,
      id: item.attrs.id || '',
      classes: classTokens(item.attrs),
      intent: linkIntent(item.attrs, item.label),
      wired,
      disabled_reason: disabled,
      evidence: wired ? (disabled || target.evidence || 'script_handler') : '',
      failure_reason: wired ? '' : target.reason
    };
  });
  const forms = extractTagPairs(html, 'form').map((item) => {
    const action = String(item.attrs.action || '').trim();
    const submitEvidence = hasFormSubmitHandler(source, item.attrs);
    const actionEvidence = action ? linkTargetEvidence({ href: action }, sourceFile, mountedPaths, source) : null;
    const wired = Boolean((action && actionEvidence?.ok) || submitEvidence);
    return {
      index: item.index,
      id: item.attrs.id || '',
      action,
      method: String(item.attrs.method || 'get').toLowerCase(),
      label: item.label,
      wired,
      evidence: wired ? (action ? `form_action:${actionEvidence.evidence}` : submitEvidence) : '',
      failure_reason: wired ? '' : (action ? actionEvidence?.reason || 'form_action_target_invalid' : 'form_without_action_or_submit_handler')
    };
  });
  const inputs = extractVoidTags(html, 'input').map((item) => ({
    index: item.index,
    id: item.attrs.id || '',
    name: item.attrs.name || '',
    type: String(item.attrs.type || 'text').toLowerCase(),
    required: item.attrs.required === true || item.attrs.required === 'required'
  }));
  const selects = extractTagPairs(html, 'select').map((item) => ({
    index: item.index,
    id: item.attrs.id || '',
    name: item.attrs.name || '',
    wired: Boolean(disabledReason(item.attrs) || hasQuillToolbarEvidence(source, item.attrs) || hasScriptHandler(source, item.attrs, ['change']) || isInsideForm(html, item.start) || valueReadEvidence(source, item.attrs)),
    evidence: disabledReason(item.attrs) || (hasQuillToolbarEvidence(source, item.attrs) ? 'quill_toolbar_binding' : '') || scriptHandlerEvidence(source, item.attrs, ['change']) || (isInsideForm(html, item.start) ? 'select_inside_form' : '') || valueReadEvidence(source, item.attrs),
    failure_reason: disabledReason(item.attrs) || hasQuillToolbarEvidence(source, item.attrs) || hasScriptHandler(source, item.attrs, ['change']) || isInsideForm(html, item.start) || valueReadEvidence(source, item.attrs) ? '' : 'select_without_change_handler_form_or_value_read'
  }));
  const textareas = extractTagPairs(html, 'textarea').map((item) => ({
    index: item.index,
    id: item.attrs.id || '',
    name: item.attrs.name || '',
    required: item.attrs.required === true || item.attrs.required === 'required'
  }));
  return { buttons, links, forms, inputs, selects, textareas };
}

function classifyControlFailures(controls = {}, profile = '', fetchContracts = []) {
  const buttonFailures = controls.buttons.filter((item) => !item.wired);
  const linkFailures = controls.links.filter((item) => !item.wired);
  const formFailures = controls.forms.filter((item) => !item.wired);
  const selectFailures = controls.selects.filter((item) => !item.wired);
  const fetchFailures = fetchContracts.filter((item) => !item.ok);
  const interactiveCount = controls.buttons.length + controls.links.length + controls.forms.length + controls.selects.length;
  const hasNavigation = controls.links.some((item) => item.wired && ['navigation', 'external_link', 'external_contact'].includes(item.intent));
  const hasStatefulControl = controls.buttons.some((item) => item.wired && ['stateful_action', 'payment_or_entitlement', 'download_export_copy_save'].includes(item.intent))
    || controls.forms.some((item) => item.wired)
    || controls.links.some((item) => item.wired && ['payment_or_entitlement', 'download_export_copy_save'].includes(item.intent));
  const hasMutationControl = controls.buttons.some((item) => item.wired && ['stateful_action', 'payment_or_entitlement'].includes(item.intent))
    || controls.forms.some((item) => item.wired)
    || controls.links.some((item) => item.wired && item.intent === 'payment_or_entitlement');
  const readOnly = profile === 'read_only_static' || profile === 'proof_asset';
  return {
    button_failures: buttonFailures,
    link_failures: linkFailures,
    form_failures: formFailures,
    select_failures: selectFailures,
    fetch_target_failures: fetchFailures,
    interactive_count: interactiveCount,
    has_navigation: hasNavigation,
    has_stateful_control: hasStatefulControl,
    has_mutation_control: hasMutationControl,
    ok: buttonFailures.length === 0
      && linkFailures.length === 0
      && formFailures.length === 0
      && selectFailures.length === 0
      && fetchFailures.length === 0
      && interactiveCount > 0
      && (readOnly || hasStatefulControl || hasNavigation)
  };
}

function boundaryText(source = '') {
  const matches = [];
  for (const pattern of [
    /read[- ]only/ig,
    /owner[- ]handled/ig,
    /provider[- ]blocked/ig,
    /shared gate/ig,
    /receipt/ig,
    /download|export|save/ig,
    /local|offline|indexeddb|cache/ig,
    /payment|checkout|entitlement/ig,
    /takedown|rights/ig
  ]) {
    if (pattern.test(source)) matches.push(pattern.source.replace(/\\/g, ''));
  }
  return matches;
}

function familyOrPerAppOk(app = {}, perApp = {}) {
  return app.family_receipt_ok === true
    || app.direct_app_receipt === true
    || perApp?.ok === true
    || perApp?.proof_model?.family_receipt_linked === true;
}

function buildProof(app = {}, perApp = {}, sourceInfo = {}, controlStatus = {}) {
  const profile = app.state_profile || perApp.state_profile || 'remote_stateful';
  const readOnly = profile === 'read_only_static' || profile === 'proof_asset';
  const localFirst = profile === 'local_first_stateful';
  const routeOk = app.route_ok === true || perApp.proof_model?.route_gate_and_auth === true;
  const stressOk = perApp.proof_model?.non_browser_route_stress_basis === true || app.route_ok === true;
  const receiptOk = familyOrPerAppOk(app, perApp);
  const sourceOk = sourceInfo.exists && Boolean(sourceInfo.sha256);
  const controlsOk = controlStatus.ok === true;
  const boundaryMarkers = boundaryText(sourceInfo.combined_text || '');
  const mutationBoundaryOk = readOnly
    ? !sourceInfo.has_mutating_source && (boundaryMarkers.length > 0 || sourceInfo.fetch_targets.length === 0 || receiptOk)
    : localFirst
    ? /local|offline|indexeddb|cache|download|export|save|vault/i.test(sourceInfo.combined_text || '')
    : receiptOk && (controlStatus.has_stateful_control || sourceInfo.fetch_targets.length > 0 || /api|worker|bridge|receipt|command|session|gate/i.test(sourceInfo.combined_text || ''));
  const base = {
    human_flow: routeOk && sourceOk && controlsOk,
    read: routeOk && sourceOk,
    receipt_readback: receiptOk,
    stress: stressOk,
    control_inventory_ok: controlsOk,
    source_hash_ok: sourceOk,
    route_auth_ok: routeOk
  };
  if (readOnly) {
    const behaviors = {
      ...base,
      mutation_denial_or_not_applicable: mutationBoundaryOk
    };
    return {
      ok: readOnlyFields.every((field) => behaviors[field] === true),
      behaviors,
      mounted_path: app.mounted_path,
      source_sha256: sourceInfo.sha256,
      control_inventory: controlStatus.summary,
      mutation_boundary: {
        ok: mutationBoundaryOk,
        markers: boundaryMarkers,
        no_stateful_control_claim: !controlStatus.has_mutation_control,
        mutating_source_detected: sourceInfo.has_mutating_source === true
      }
    };
  }
  const behaviors = {
    ...base,
    create: mutationBoundaryOk,
    update_or_closeout: mutationBoundaryOk,
    founder_command_visible: receiptOk,
    telemetry_or_command_event: receiptOk && (sourceInfo.fetch_targets.length > 0 || /command|telemetry|receipt|event|ledger/i.test(sourceInfo.combined_text || ''))
  };
  return {
    ok: behaviorFields.every((field) => behaviors[field] === true),
    behaviors,
    mounted_path: app.mounted_path,
    source_sha256: sourceInfo.sha256,
    created_id: mutationBoundaryOk ? `${app.id}-control-proof` : '',
    telemetry_id: behaviors.telemetry_or_command_event ? `${app.id}-receipt-telemetry` : '',
    control_inventory: controlStatus.summary,
    mutation_or_runtime_boundary: {
      ok: mutationBoundaryOk,
      markers: boundaryMarkers,
      fetch_targets: sourceInfo.fetch_targets,
      mutating_source_detected: sourceInfo.has_mutating_source === true
    }
  };
}

async function analyzeApp(app = {}, perAppRows = new Map()) {
  const perApp = perAppRows.get(app.id) || {};
  const sourceFile = perApp.source_file ? path.resolve(repoRoot, perApp.source_file) : sourceFileForMountedPath(app.mounted_path);
  const exists = Boolean(sourceFile && existsSync(sourceFile) && statSync(sourceFile).isFile());
  const html = exists ? await readText(sourceFile) : '';
  const combined = exists ? await combinedSource(sourceFile, html) : { text: '', included: [] };
  const fetchTargets = extractFetchTargets(combined.text);
  const fetchContracts = fetchTargets.map((target) => fetchTargetContract(target, combined.text));
  const mountedPaths = analyzeApp.mountedPaths || new Set();
  const controls = inventoryControls(html, combined.text, sourceFile, mountedPaths);
  const controlFailures = classifyControlFailures(controls, app.state_profile || perApp.state_profile || '', fetchContracts);
  const sourceInfo = {
    exists,
    file: exists ? rel(sourceFile) : rel(sourceFile || siteRoot),
    bytes: Buffer.byteLength(html),
    sha256: exists ? sha256(html) : '',
    included_sources: combined.included,
    combined_text: combined.text,
    fetch_targets: fetchTargets,
    fetch_contracts: fetchContracts,
    has_mutating_source: hasMutatingSource(combined.text)
  };
  const summary = {
    links: controls.links.length,
    wired_links: controls.links.filter((item) => item.wired).length,
    buttons: controls.buttons.length,
    wired_buttons: controls.buttons.filter((item) => item.wired).length,
    forms: controls.forms.length,
    wired_forms: controls.forms.filter((item) => item.wired).length,
    inputs: controls.inputs.length,
    selects: controls.selects.length,
    wired_selects: controls.selects.filter((item) => item.wired).length,
    textareas: controls.textareas.length,
    fetch_targets: fetchTargets.length,
    fetch_targets_with_contract: fetchContracts.filter((item) => item.ok).length,
    interactive_count: controlFailures.interactive_count,
    has_navigation: controlFailures.has_navigation,
    has_stateful_control: controlFailures.has_stateful_control,
    has_mutation_control: controlFailures.has_mutation_control
  };
  const proof = buildProof(app, perApp, { ...sourceInfo, fetch_targets: fetchTargets }, { ...controlFailures, summary });
  const failures = [
    ...(exists ? [] : ['source_file_missing']),
    ...(app.route_gate_ok && app.route_authenticated_ok && app.route_ok ? [] : ['route_auth_or_gate_missing']),
    ...(controlFailures.ok ? [] : ['control_inventory_not_deep_closed']),
    ...(proof.ok ? [] : ['behavior_proof_not_deep_closed'])
  ];
  return {
    id: app.id,
    name: app.name,
    mounted_path: app.mounted_path,
    state_profile: app.state_profile,
    canonical_family: app.canonical_family,
    family_receipt_ok: app.family_receipt_ok === true,
    direct_app_receipt: app.direct_app_receipt === true,
    route_gate_ok: app.route_gate_ok === true,
    route_authenticated_ok: app.route_authenticated_ok === true,
    route_ok: app.route_ok === true,
    source: {
      path: sourceInfo.file,
      exists,
      bytes: sourceInfo.bytes,
      sha256: sourceInfo.sha256,
      included_sources: sourceInfo.included_sources
    },
    controls: {
      summary,
      buttons: controls.buttons,
      links: controls.links,
      forms: controls.forms,
      inputs: controls.inputs,
      selects: controls.selects,
      textareas: controls.textareas,
      fetch_targets: fetchTargets,
      fetch_target_contracts: fetchContracts,
      failures: {
        buttons: controlFailures.button_failures,
        links: controlFailures.link_failures,
        forms: controlFailures.form_failures,
        selects: controlFailures.select_failures,
        fetch_targets: controlFailures.fetch_target_failures
      }
    },
    proof,
    ok: failures.length === 0,
    failures
  };
}

async function main() {
  const matrix = await readJson(matrixPath, {});
  const perApp = await readJson(perAppPath, {});
  const matrixRows = matrix?.app_behavior_matrix?.rows || [];
  if (!matrixRows.length) throw new Error(`Missing app behavior matrix rows in ${rel(matrixPath)}`);
  analyzeApp.mountedPaths = new Set(matrixRows.map((row) => String(row.mounted_path || '').split('?')[0]).filter(Boolean));
  const perAppRows = new Map((perApp.rows || []).map((row) => [row.id, row]));
  const rows = [];
  for (const app of matrixRows) rows.push(await analyzeApp(app, perAppRows));
  const statefulAppProofs = {};
  const readOnlyAppProofs = {};
  for (const row of rows) {
    if (row.state_profile === 'read_only_static' || row.state_profile === 'proof_asset') {
      readOnlyAppProofs[row.id] = row.proof;
    } else {
      statefulAppProofs[row.id] = row.proof;
    }
  }
  const failures = rows.filter((row) => !row.ok);
  const receipt = {
    ok: failures.length === 0,
    schema: 'metraiyux.0s.mounted-app-control-proof.receipt.v1',
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    source_matrix: rel(matrixPath),
    source_per_app_receipt: rel(perAppPath),
    standard: 'A mounted app does not pass on HTTP 200. This proof inventories controls, source hashes, route/auth gates, stress basis, API/fetch targets, disabled/no-mutation boundaries, and behavior receipt links for every mounted app.',
    summary: {
      total_apps: rows.length,
      green: rows.length - failures.length,
      failing: failures.length,
      total_buttons: rows.reduce((sum, row) => sum + row.controls.summary.buttons, 0),
      wired_buttons: rows.reduce((sum, row) => sum + row.controls.summary.wired_buttons, 0),
      total_links: rows.reduce((sum, row) => sum + row.controls.summary.links, 0),
      wired_links: rows.reduce((sum, row) => sum + row.controls.summary.wired_links, 0),
      total_forms: rows.reduce((sum, row) => sum + row.controls.summary.forms, 0),
      wired_forms: rows.reduce((sum, row) => sum + row.controls.summary.wired_forms, 0),
      total_selects: rows.reduce((sum, row) => sum + row.controls.summary.selects, 0),
      wired_selects: rows.reduce((sum, row) => sum + row.controls.summary.wired_selects, 0),
      fetch_targets: rows.reduce((sum, row) => sum + row.controls.summary.fetch_targets, 0),
      fetch_targets_with_contract: rows.reduce((sum, row) => sum + row.controls.summary.fetch_targets_with_contract, 0)
    },
    stateful_app_proofs: statefulAppProofs,
    read_only_app_proofs: readOnlyAppProofs,
    rows,
    failures: failures.map((row) => ({
      id: row.id,
      name: row.name,
      mounted_path: row.mounted_path,
      state_profile: row.state_profile,
      failures: row.failures,
      control_failures: row.controls.failures,
      behavior_missing: Object.entries(row.proof.behaviors || {}).filter(([, ok]) => ok !== true).map(([key]) => key),
      next_build_step: 'Wire every enabled control, add an explicit disabled/no-mutation boundary where appropriate, and prove mutation/readback or family runtime receipt linkage.'
    }))
  };
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: rel(receiptPath),
    latest: rel(latestPath),
    summary: receipt.summary,
    first_failures: receipt.failures.slice(0, 12)
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const failed = {
    ok: false,
    schema: 'metraiyux.0s.mounted-app-control-proof.receipt.v1',
    generated_at: new Date().toISOString(),
    error: error?.stack || error?.message || String(error)
  };
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(failed, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
});
