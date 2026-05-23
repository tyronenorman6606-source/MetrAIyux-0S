#!/usr/bin/env node
import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { factoryRoot, repoRoot } from "./factory-engine.mjs";

export async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function walk(dir, options = {}) {
  const files = [];
  if (!(await exists(dir))) return files;
  const skip = new Set(options.skip || []);

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }
      const fileStat = await stat(fullPath);
      files.push({
        path: fullPath,
        relative: path.relative(dir, fullPath),
        dir: path.dirname(fullPath),
        ext: path.extname(entry.name).toLowerCase(),
        bytes: fileStat.size
      });
    }
  }

  await visit(dir);
  return files;
}

export function toPosix(value = "") {
  return String(value).replaceAll(path.sep, "/");
}

export function markState(record, state) {
  const completed = new Set(record.completedStates || []);
  completed.add(state);
  return {
    ...record,
    status: state,
    completedStates: Array.from(completed),
    updatedAt: new Date().toISOString()
  };
}

export function latestGeneratedApp(record) {
  return record.generatedApps?.[0] || null;
}

export function pickFirst(values = []) {
  return Array.isArray(values) ? values.find(Boolean) || "" : "";
}

export function parseLocation(record = {}) {
  const location = record.locations?.[0] || {};
  const fullAddress = String(location.address || "").trim();
  const lines = fullAddress.split(",").map((part) => part.trim()).filter(Boolean);
  const street = location.street || lines[0] || "";
  const city = location.city || lines[1] || record.brandProfile?.city || "Client City";
  const stateZip = (location.stateZip || lines[2] || "").trim();
  const stateMatch = stateZip.match(/^([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?/);
  const state = location.state || stateMatch?.[1]?.toUpperCase() || record.brandProfile?.state || "ST";
  const postalCode = location.postalCode || stateMatch?.[2] || record.brandProfile?.postalCode || "00000";
  return {
    fullAddress: fullAddress || [street, city, `${state} ${postalCode}`.trim()].filter(Boolean).join(", "),
    street,
    city,
    state,
    postalCode
  };
}

export function digitsOnly(value = "") {
  return String(value).replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
}

export function formatPhoneDisplay(value = "") {
  const digits = digitsOnly(value);
  if (digits.length !== 10) return String(value || "").trim() || "(000) 000-0000";
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatPhoneHref(value = "") {
  const digits = digitsOnly(value);
  return digits ? `tel:${digits}` : "tel:0000000000";
}

export function inferValleyPath(record = {}) {
  const explicitUrl = record.valleySync?.profileUrl || "";
  if (explicitUrl) return explicitUrl;
  const explicitPath = record.valleySync?.profilePath || "";
  if (explicitPath) return explicitPath.startsWith("http") ? explicitPath : `https://valley-verified.pages.dev${explicitPath}`;
  return `https://valley-verified.pages.dev/business/${record.clientId || "client-brand"}/`;
}

export function buildShareUrl(record = {}) {
  const explicit = record.brandProfile?.publicUrl || record.sourceUrls?.[0] || "";
  if (explicit) return explicit;
  return `https://${record.clientId || "client-brand"}.pages.dev/`;
}

export async function resolveCandidatePath(record = {}, candidate = "") {
  if (!candidate) return "";
  const attempts = [];
  if (path.isAbsolute(candidate)) attempts.push(candidate);
  attempts.push(path.join(repoRoot, candidate));
  attempts.push(path.join(factoryRoot, candidate));
  if (record.sourceFolders?.[0]) attempts.push(path.join(record.sourceFolders[0], candidate));
  if (record.assetFolders?.[0]) attempts.push(path.join(path.dirname(record.assetFolders[0]), candidate));
  for (const target of attempts) {
    if (await exists(target)) return target;
  }
  return "";
}

export async function copyIfExists(source, destination) {
  if (!source || !(await exists(source))) return false;
  if (path.resolve(source) === path.resolve(destination)) return true;
  await ensureDir(path.dirname(destination));
  await copyFile(source, destination);
  return true;
}

export function relativeWebPath(fromDir, targetFile) {
  const relative = path.relative(fromDir, targetFile);
  return toPosix(relative || path.basename(targetFile));
}
