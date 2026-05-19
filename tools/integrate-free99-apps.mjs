#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "metraiyux_0s_site");
const free99Dir = path.join(siteDir, "Free99");
const appDir = path.join(free99Dir, "apps");
const tmpScan = "/tmp/free99-scan";

const apps = [
  {
    platform_id: "skyeopsconsole",
    slug: "skyeopsconsole",
    name: "SkyeOpsConsole v2.13",
    source: "skyeopsconsolev2.13",
    entry: "index.html",
    billing: "free99",
    price: "Free99 / $0",
    summary: "Offline operations console. This is the only no-charge app in the new Free99 intake."
  },
  {
    platform_id: "skyeapi-aegiscore",
    slug: "skyeapi-aegiscore",
    name: "SkyeAPI + AegisCore",
    source: "skyeapi-aegiscore-platform-v0.17.0/skyeapi-aegiscore-platform-v0.17.0",
    entry: "apps/console/index.html",
    secondary_entry: "apps/website/index.html",
    billing: "paid_pending_sku",
    price: "Usage-metered or quote after provider-cost review",
    summary: "Credential, capability, provider, and gateway control plane. Paid platform lane."
  },
  {
    platform_id: "sovereigndocs",
    slug: "sovereigndocs",
    name: "SovereignDocs v20",
    source: "sovereigndocs-recovered-v20/sovereigndocs",
    entry: "index.html",
    billing: "paid_pending_sku",
    price: "Imported plans: $19/$59/$149/$499 per month; Stripe rebuild required",
    summary: "Document workflow platform with export quotas, template library, partner review, and paid plans."
  },
  {
    platform_id: "kaixu-codestudio",
    slug: "kaixu-codestudio",
    name: "kAIxU CodeStudio Platform",
    source: "codestudio-platform-notheater-5.9.1",
    entry: "index.html",
    secondary_entry: "app/index.html",
    billing: "quote_only",
    price: "Quote after provider/backplane scope",
    summary: "Provider backplane, policy, and code platform with approval rules for costly calls."
  },
  {
    platform_id: "skaixu-code-evaluator",
    slug: "skaixu-code-evaluator",
    name: "skAIxU Code Evaluator",
    source: "skaixu-code-evaluator-platform-2.6.0",
    entry: "index.html",
    billing: "quote_only",
    price: "Quote after rubric/workflow scope",
    summary: "Evaluation platform with rubric, workflow, browser-proof, and seed materialization packs."
  },
  {
    platform_id: "skyevaultpro",
    slug: "skyevaultpro",
    name: "SkyeVaultPro",
    source: "skyevaultpro",
    entry: "index.html",
    billing: "paid_pending_scope",
    price: "Paid hosted backup, AI helper, or profile-sync lane after scope",
    summary: "Offline-first vault with hosted backup, AI helper, identity, and profile sync paths."
  },
  {
    platform_id: "doctor-ops-personal-vault",
    slug: "doctor-ops-personal-vault",
    name: "Doctor Ops Personal Vault",
    source: "doctor-ops-personal-vault-v6",
    entry: "index.html",
    billing: "paid_pending_owner_approval",
    price: "Personal subscription candidate; owner approval before checkout",
    summary: "Local-first personal doctor workflow vault. Not an EHR or regulated medical advice product."
  },
  {
    platform_id: "documorph",
    slug: "documorph",
    name: "Documorph",
    source: "skyesoverlondon-documorph",
    entry: "index.html",
    secondary_entry: "app/index.html",
    billing: "quote_only",
    price: "Quote after DB/runtime proof",
    summary: "Document transform app with database-backed runtime surfaces."
  },
  {
    platform_id: "skyearcade",
    slug: "skyearcade",
    name: "SkyeArcade Sovereign Vault",
    source: "skyearcade-sovereign-vault-v1.8.1/skyearcade_sovereign_vault_v1_8_1",
    entry: "index.html",
    billing: "paid_or_member_add_on",
    price: "Paid/member add-on candidate",
    summary: "Static game vault with local saves and upstream bridge events."
  },
  {
    platform_id: "skyebox-authenticator",
    slug: "skyebox-authenticator",
    name: "SkyeBox Authenticator Vault",
    source: "skye-box-authenticator-vault",
    entry: "index.html",
    billing: "bundle_candidate",
    price: "Local-first bundle candidate; no hosted recovery claim",
    summary: "Encrypted local TOTP vault using browser crypto. Hosted recovery must be scoped separately."
  },
  {
    platform_id: "kaixu-storefront",
    slug: "kaixu-storefront",
    name: "kAIxU Storefront",
    source: "kaixustorefront",
    entry: "index.html",
    billing: "catalog_source_only",
    price: "Catalog/source only, not direct checkout",
    summary: "Mini storefront and product-ecology source for future approved offers."
  }
];

function rel(from, to) {
  return path.relative(from, to).replaceAll(path.sep, "/") || ".";
}

function cpFiltered(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, {
    recursive: true,
    dereference: false,
    filter(source) {
      const base = path.basename(source);
      if ([".git", "node_modules", ".DS_Store"].includes(base)) return false;
      return true;
    }
  });
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function escapeAttr(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function injectGate(htmlFile, app) {
  let html = fs.readFileSync(htmlFile, "utf8");
  if (html.includes("free99-gate.js")) return;
  const htmlDir = path.dirname(htmlFile);
  const gateSrc = rel(htmlDir, path.join(free99Dir, "free99-gate.js"));
  const appRoot = `/${rel(siteDir, path.join(appDir, app.slug))}/`;
  const script = `<script src="${gateSrc}" data-platform-id="${escapeAttr(app.platform_id)}" data-platform-name="${escapeAttr(app.name)}" data-billing-mode="${escapeAttr(app.billing)}" data-price-label="${escapeAttr(app.price)}" data-app-root="${escapeAttr(appRoot)}"></script>`;
  html = html
    .replace(/(href|src|action)=["']\/(?!\/|#|mailto:|tel:|https?:)/g, `$1="${appRoot}`)
    .replace(/<\/head>/i, `  ${script}\n</head>`);
  if (!html.includes(script)) html = `${script}\n${html}`;
  fs.writeFileSync(htmlFile, html);
}

function patchMountedApp(app, dest) {
  if (app.slug !== "sovereigndocs") return;
  const workflowUi = path.join(dest, "assets", "workflow-ui.js");
  if (!fs.existsSync(workflowUi)) return;
  const source = fs.readFileSync(workflowUi, "utf8");
  if (source.startsWith("(() => {")) return;
  fs.writeFileSync(workflowUi, `(() => {\n${source}\n})();\n`);
}

function writeGateScript() {
  const source = String.raw`(() => {
  "use strict";

  const script = document.currentScript || {};
  const data = script.dataset || {};
  const platformId = (data.platformId || "free99-platform").trim();
  const platformName = (data.platformName || platformId).trim();
  const billingMode = (data.billingMode || "paid_pending_sku").trim();
  const priceLabel = (data.priceLabel || "Owner-approved platform lane").trim();
  const appRoot = (data.appRoot || location.pathname.replace(/\/[^/]*$/, "/")).trim();
  const scopedRoot = appRoot.endsWith("/") ? appRoot : appRoot + "/";
  const storageKey = "FREE99_PLATFORM_GATE_SESSION";
  const appStorageKey = "FREE99_PLATFORM_GATE_SESSION_" + platformId.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", ""]);
  const free = billingMode === "free99";
  const clean = (value) => String(value == null ? "" : value).trim();
  const safeToken = (value) => clean(value).replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 4096);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,4096}$/.test(clean(value));
  const isLocalHost = () => localHosts.has(location.hostname);
  let resolvedSession = null;

  document.documentElement.classList.add("free99-platform-gate-locked");

  function readJson(store, key) {
    try { return JSON.parse(store.getItem(key) || "null"); } catch { return null; }
  }

  function readSession() {
    const query = new URLSearchParams(location.search);
    const queryToken = safeToken(query.get("gate_session") || query.get("skygate_session") || query.get("session"));
    if (tokenLooksValid(queryToken)) {
      const session = {
        token: queryToken,
        source: "url-gate-session",
        platform_id: platformId,
        billing_mode: billingMode,
        issued_at: new Date().toISOString()
      };
      persist(session, false);
      query.delete("gate_session");
      query.delete("skygate_session");
      query.delete("session");
      history.replaceState({}, document.title, location.pathname + (query.toString() ? "?" + query.toString() : "") + (location.hash || ""));
      return session;
    }
    for (const key of [appStorageKey, storageKey, "METRAIYUX_GATE_SESSION", "SKYGATEFS27_GATE_SESSION", "SKYGATE_USER_TOKEN", "SKYE_GATE_SESSION"]) {
      const parsed = readJson(sessionStorage, key) || readJson(localStorage, key);
      const token = safeToken(parsed && parsed.token ? parsed.token : sessionStorage.getItem(key) || localStorage.getItem(key));
      if (tokenLooksValid(token)) return { ...(parsed || {}), token, source: parsed?.source || key, platform_id: platformId, billing_mode: billingMode };
    }
    const saas = readJson(localStorage, "saas_client_session");
    if (saas && tokenLooksValid(saas.token)) return { ...saas, token: safeToken(saas.token), source: "0s-client-session", platform_id: platformId, billing_mode: billingMode };
    const runtime = globalThis.__SKYEGATE_RUNTIME__ || globalThis.__KAIXU_RUNTIME__ || {};
    const runtimeToken = safeToken(runtime.userToken || runtime.sessionToken || runtime.authToken || runtime.bearerToken || runtime.auth?.token || runtime.auth?.bearerToken);
    if (tokenLooksValid(runtimeToken)) return { token: runtimeToken, source: "skygate-runtime", platform_id: platformId, billing_mode: billingMode };
    return null;
  }

  function persist(session, removeOverlay = true) {
    const cleanSession = {
      token: safeToken(session.token),
      source: session.source || "manual-gate-session",
      platform_id: platformId,
      usage_lane: session.usage_lane || "platform-app",
      billing_mode: billingMode,
      price_label: priceLabel,
      issued_at: session.issued_at || new Date().toISOString()
    };
    sessionStorage.setItem(storageKey, JSON.stringify(cleanSession));
    sessionStorage.setItem(appStorageKey, JSON.stringify(cleanSession));
    resolvedSession = cleanSession;
    if (removeOverlay) unlockUi();
    return cleanSession;
  }

  function headers(extra = {}) {
    const session = resolvedSession || readSession();
    const token = session && safeToken(session.token);
    return {
      ...(token ? { authorization: "Bearer " + token, "x-skye-gate-session": token } : {}),
      "x-skye-platform": platformId,
      "x-kaixu-platform": platformId,
      "x-skye-usage-lane": session?.usage_lane || "platform-app",
      "x-free99-billing-mode": billingMode,
      ...extra
    };
  }

  function scopeUrl(value) {
    const text = String(value || "");
    if (!text.startsWith("/") || text.startsWith("//") || text.startsWith(scopedRoot) || text.startsWith("/Free99/")) return value;
    return scopedRoot + text.replace(/^\/+/, "");
  }

  function rewriteScopedRoutes(root = document) {
    const nodes = [];
    if (root.matches?.('a[href^="/"], form[action^="/"]')) nodes.push(root);
    root.querySelectorAll?.('a[href^="/"], form[action^="/"]').forEach((node) => nodes.push(node));
    nodes.forEach((node) => {
      const attr = node.tagName === "FORM" ? "action" : "href";
      const current = node.getAttribute(attr);
      const scoped = scopeUrl(current);
      if (scoped !== current) node.setAttribute(attr, scoped);
    });
  }

  function installRouteScope() {
    if (window.__FREE99_PLATFORM_ROUTE_SCOPE__) return;
    window.__FREE99_PLATFORM_ROUTE_SCOPE__ = true;
    rewriteScopedRoutes();
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node?.nodeType === 1) rewriteScopedRoutes(node);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", (event) => {
      const link = event.target?.closest?.('a[href^="/"]');
      if (!link) return;
      const current = link.getAttribute("href");
      const scoped = scopeUrl(current);
      if (scoped !== current) link.setAttribute("href", scoped);
    }, true);
  }

  function patchFetch() {
    if (window.__FREE99_PLATFORM_FETCH_PATCHED__) return;
    window.__FREE99_PLATFORM_FETCH_PATCHED__ = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const scopedInput = typeof input === "string" ? scopeUrl(input) : input;
      const nextHeaders = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init.headers || {}).forEach((value, key) => nextHeaders.set(key, value));
      Object.entries(headers()).forEach(([key, value]) => nextHeaders.set(key, value));
      const nextInit = { ...init, headers: nextHeaders };
      return originalFetch(scopedInput, nextInit);
    };
  }

  function unlockUi() {
    document.documentElement.classList.remove("free99-platform-gate-locked");
    document.body?.classList.remove("free99-platform-gate-locked");
    document.body?.classList.add("free99-platform-gate-ready");
    document.getElementById("free99PlatformGate")?.remove();
    document.dispatchEvent(new CustomEvent("free99-platform:gate-ready", { detail: resolvedSession }));
  }

  function status(message) {
    const el = document.getElementById("free99PlatformGateStatus");
    if (el) el.textContent = message;
  }

  function unlockFromInput() {
    const token = safeToken(document.getElementById("free99PlatformGateToken")?.value);
    if (!tokenLooksValid(token)) {
      status("Enter a valid 0S or FS27 gate session token.");
      return;
    }
    persist({ token, source: "manual-gate-session" });
  }

  function useLocalProof() {
    if (!isLocalHost()) {
      status("Local proof unlock only works on localhost.");
      return;
    }
    persist({ token: "FREE99-PLATFORM-LOCAL-PROOF", source: "local-proof-session" });
  }

  function injectStyles() {
    if (document.getElementById("free99PlatformGateStyles")) return;
    const style = document.createElement("style");
    style.id = "free99PlatformGateStyles";
    style.textContent = ".free99-platform-gate-locked body,body.free99-platform-gate-locked{overflow:hidden!important}body.free99-platform-gate-locked>:not(#free99PlatformGate):not(script):not(style){filter:blur(9px) saturate(.45);pointer-events:none!important;user-select:none!important}.free99-platform-gate-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;background:rgba(4,7,13,.9);color:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}.free99-platform-gate-card{width:min(760px,100%);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:28px;background:#0b1020;box-shadow:0 30px 120px rgba(0,0,0,.55)}.free99-platform-gate-card h1{margin:0 0 12px;font-size:clamp(30px,5vw,52px);line-height:1;letter-spacing:0}.free99-platform-gate-card p{color:#cbd5e1;line-height:1.55}.free99-platform-gate-badge{display:inline-block;margin:0 0 14px;padding:7px 10px;border:1px solid rgba(255,255,255,.18);border-radius:999px;color:#fde68a;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.free99-platform-gate-field{display:grid;gap:8px;margin:18px 0;color:#fde68a;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.free99-platform-gate-field input{width:100%;min-height:48px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;padding:0 12px}.free99-platform-gate-actions{display:flex;flex-wrap:wrap;gap:10px}.free99-platform-gate-actions button,.free99-platform-gate-actions a{border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;padding:12px 14px;text-decoration:none;font-weight:800;cursor:pointer}.free99-platform-gate-actions .primary{background:#fde68a;color:#111827}.free99-platform-gate-status{margin-top:14px;color:#a7f3d0!important;font-size:13px}";
    document.head.appendChild(style);
  }

  function showGate() {
    injectStyles();
    document.body?.classList.add("free99-platform-gate-locked");
    if (document.getElementById("free99PlatformGate")) return;
    const overlay = document.createElement("div");
    overlay.id = "free99PlatformGate";
    overlay.className = "free99-platform-gate-overlay";
    overlay.innerHTML = '<section class="free99-platform-gate-card" role="dialog" aria-modal="true" aria-labelledby="free99PlatformGateTitle"><span class="free99-platform-gate-badge">' + (free ? "Free99 gated app" : "Paid platform lane") + '</span><h1 id="free99PlatformGateTitle">' + platformName + '</h1><p>' + (free ? "This app is Free99: no charge, still gated." : "This app is not Free99. It is mounted for 0S review, but live use requires a paid or owner-approved platform lane.") + '</p><p><strong>Platform ID:</strong> ' + platformId + ' · <strong>Billing:</strong> ' + priceLabel + '</p><label class="free99-platform-gate-field">0S / FS27 gate session<input id="free99PlatformGateToken" autocomplete="off" placeholder="paste gate session token"></label><div class="free99-platform-gate-actions"><button class="primary" id="free99PlatformGateUnlock" type="button">Unlock Session</button><button id="free99PlatformLocalProof" type="button">Local Proof Unlock</button><a href="/Free99/index.html">Back to Free99 Hub</a></div><p class="free99-platform-gate-status" id="free99PlatformGateStatus">Usage will be tagged as platform_id=' + platformId + ' and usage_lane=platform-app.</p></section>';
    document.body.appendChild(overlay);
    document.getElementById("free99PlatformGateUnlock")?.addEventListener("click", unlockFromInput);
    document.getElementById("free99PlatformLocalProof")?.addEventListener("click", useLocalProof);
    document.getElementById("free99PlatformGateToken")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") unlockFromInput();
    });
  }

  function boot() {
    patchFetch();
    installRouteScope();
    const session = readSession();
    if (session && tokenLooksValid(session.token)) {
      persist(session);
    } else {
      showGate();
    }
  }

  window.Free99PlatformGate = { platformId, platformName, billingMode, priceLabel, appRoot: scopedRoot, headers, requireSession: () => resolvedSession || readSession(), scopeUrl };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();`;
  fs.writeFileSync(path.join(free99Dir, "free99-gate.js"), source);
}

function writeHub() {
  const cards = apps.map((app) => {
    const href = `apps/${app.slug}/${app.entry}`;
    const secondary = app.secondary_entry ? `<a href="apps/${app.slug}/${app.secondary_entry}">Secondary surface</a>` : "";
    const freeClass = app.billing === "free99" ? " free" : "";
    return `<article class="app-card${freeClass}">
      <span>${app.billing === "free99" ? "Free99" : "Paid / gated"}</span>
      <h2>${app.name}</h2>
      <p>${app.summary}</p>
      <p><strong>${app.price}</strong></p>
      <div class="actions"><a class="primary" href="${href}">Open app</a>${secondary}</div>
      <code>platform_id=${app.platform_id}</code>
    </article>`;
  }).join("\n");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Free99 Platform Intake · MetrAIyux 0S</title>
  <link rel="stylesheet" href="../style.css">
  <style>
    body{background:#060913;color:#f8fafc}
    .free99-shell{max-width:1180px;margin:0 auto;padding:28px}
    .app-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:24px}
    .app-card{border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:18px;background:rgba(255,255,255,.05)}
    .app-card.free{border-color:rgba(34,197,94,.55)}
    .app-card span{display:inline-block;margin-bottom:10px;color:#fde68a;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .app-card h2{margin:0 0 10px;font-size:24px;letter-spacing:0}
    .app-card p{color:#cbd5e1;line-height:1.5}
    .actions{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}
    .actions a,.top-actions a{border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:10px 12px;color:#fff;text-decoration:none;font-weight:800}
    .actions .primary,.top-actions .primary{background:#fde68a;color:#111827}
    code{white-space:normal;color:#a7f3d0}
  </style>
</head>
<body>
  <main class="free99-shell">
    <p class="eyebrow">0S mounted app intake</p>
    <h1>Free99 has one free app. The rest are paid platform lanes.</h1>
    <p class="hero-lede">Every app below is now unpacked under the 0S, wired with the shared Free99 platform gate, and tagged for FS27 usage splitting with <code>platform_id</code> and <code>usage_lane</code>. SkyeOpsConsole is the only Free99/no-charge lane.</p>
    <div class="top-actions">
      <a class="primary" href="../proof/free99-platform-intake-receipt.html">Open integration receipt</a>
      <a href="../operator/index.html">Operator center</a>
      <a href="../sales/live-proof-router.html">Proof router</a>
    </div>
    <section class="app-grid">
      ${cards}
    </section>
  </main>
</body>
</html>`;
  fs.writeFileSync(path.join(free99Dir, "index.html"), html);
}

function writeReceipt() {
  const rows = apps.map((app) => `<tr><td>${app.name}</td><td><code>${app.platform_id}</code></td><td>${app.billing}</td><td><a href="../Free99/apps/${app.slug}/${app.entry}">open</a></td></tr>`).join("");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Free99 Platform Intake Receipt · MetrAIyux 0S</title>
  <link rel="stylesheet" href="../style.css">
  <style>table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid rgba(255,255,255,.16);padding:12px;text-align:left}code{color:#a7f3d0}.receipt{max-width:1100px;margin:0 auto;padding:28px}</style>
</head>
<body>
  <main class="receipt">
    <p class="eyebrow">Integration receipt</p>
    <h1>Free99 app fleet is mounted under the 0S gate.</h1>
    <p>SkyeOpsConsole is the only Free99/no-charge app. Every Paid-Apps import is mounted for gated review and tagged for platform-aware usage splitting, but live paid use still requires owner-approved SKU/add-on activation.</p>
    <table><thead><tr><th>App</th><th>Platform</th><th>Billing state</th><th>Route</th></tr></thead><tbody>${rows}</tbody></table>
  </main>
</body>
</html>`;
  fs.mkdirSync(path.join(siteDir, "proof"), { recursive: true });
  fs.writeFileSync(path.join(siteDir, "proof", "free99-platform-intake-receipt.html"), html);
}

function writeManifest() {
  const manifest = {
    version: "2026-05-18-free99-app-mount",
    mounted_at: new Date().toISOString(),
    hub: "metraiyux_0s_site/Free99/index.html",
    gate_script: "metraiyux_0s_site/Free99/free99-gate.js",
    rule: "Only SkyeOpsConsole is Free99. Paid-Apps routes are mounted behind a gate and remain paid/pending owner approval.",
    apps: apps.map((app) => ({
      ...app,
      route: `metraiyux_0s_site/Free99/apps/${app.slug}/${app.entry}`,
      url: `../Free99/apps/${app.slug}/${app.entry}`
    }))
  };
  fs.writeFileSync(path.join(free99Dir, "app-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

function insertBefore(source, marker, block) {
  if (source.includes(block.trim().slice(0, 80))) return source;
  const index = source.indexOf(marker);
  if (index === -1) return source;
  return source.slice(0, index) + block + "\n" + source.slice(index);
}

function updateRouteSurfaces() {
  const additions = [
    {
      file: path.join(siteDir, "operator", "index.html"),
      marker: "        <a class=\"route-card\" href=\"platform-integration-ledger.html\">",
      block: `        <a class="route-card" href="../Free99/index.html"><h3>Free99 Platform Intake</h3><p>Open the mounted SkyeOpsConsole Free99 app and every paid platform lane from the new Free99/Paid-Apps import.</p></a>
        <a class="route-card" href="../proof/free99-platform-intake-receipt.html"><h3>Free99 Intake Receipt</h3><p>Review the app mount, platform_id usage split, gate policy, and paid/free boundary.</p></a>`
    },
    {
      file: path.join(siteDir, "proof", "index.html"),
      marker: "      <a class=\"route-card\" href=\"../sales/live-proof-router.html\">",
      block: `      <a class="route-card" href="../Free99/index.html"><h3>Free99 Platform Intake</h3><p>Mounted app hub for SkyeOpsConsole and the paid platform intake under a shared 0S gate.</p></a>
      <a class="route-card" href="free99-platform-intake-receipt.html"><h3>Free99 Intake Receipt</h3><p>Proof that all Free99/Paid-Apps imports are mounted, gated, and tagged for platform-aware usage splitting.</p></a>`
    },
    {
      file: path.join(siteDir, "sales", "live-proof-router.html"),
      marker: "          <a class=\"button\" href=\"../live/marketing-made-easy-growth-suite.html\">Open Marketing Made Easy</a>",
      block: `          <a class="button" href="../Free99/index.html">Open Free99 Platform Intake</a>`
    }
  ];
  for (const item of additions) {
    if (!fs.existsSync(item.file)) continue;
    const current = fs.readFileSync(item.file, "utf8");
    fs.writeFileSync(item.file, insertBefore(current, item.marker, item.block));
  }
}

function updateJsonRegistries() {
  const gatewayPath = path.join(siteDir, "data", "skyepay-gateway.json");
  const gateway = JSON.parse(fs.readFileSync(gatewayPath, "utf8"));
  gateway.free99_non_checkout.skyeopsconsole = {
    label: "SkyeOpsConsole Free99",
    price: "$0 setup + $0/mo",
    url: "../Free99/apps/skyeopsconsole/index.html",
    checkout: false,
    gate_session_required: true,
    platform_id: "skyeopsconsole",
    copy: "SkyeOpsConsole is the only no-charge app in the new Free99 intake. It still requires a 0S or FS27 gate session."
  };
  gateway.free99_routes.skyeopsconsole = {
    label: "SkyeOpsConsole Free99 gated feature",
    price: "Free99 / $0",
    checkout: false,
    gate_session_required: true,
    platform_id: "skyeopsconsole",
    url: "../Free99/apps/skyeopsconsole/index.html"
  };
  gateway.free99_routes.free99_paid_platform_intake = {
    label: "Free99 Paid Platform Intake gated review hub",
    price: "Paid or quote-only lanes; no direct checkout until approved",
    checkout: false,
    gate_session_required: true,
    platform_id: "free99-paid-platform-intake",
    url: "../Free99/index.html"
  };
  gateway.updated_for = "free99-platform-app-mount";
  gateway.updated_at = "2026-05-18T00:00:00Z";
  fs.writeFileSync(gatewayPath, JSON.stringify(gateway, null, 2) + "\n");

  const registryPath = path.join(siteDir, "brain", "live-surface-registry.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const surfaces = [
    {
      id: "free99-platform-intake-hub",
      name: "Free99 Platform Intake Hub",
      url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/index.html",
      local_path: path.join(siteDir, "Free99", "index.html"),
      audience: "operators, buyers, technical evaluators",
      privacy: "gated review",
      purpose: "Mounted app hub for SkyeOpsConsole and every paid Free99/Paid-Apps platform lane.",
      route_when: ["free99", "paid platform intake", "new tech", "sovereigndocs", "skyeopsconsole"],
      sales_use: "Use when someone asks what came in with the new Free99 tech bundle and what is actually free.",
      primary_brain: "orion-hayes-brain",
      secondary_brain: "naomi-sterling-brain"
    },
    {
      id: "free99-platform-intake-receipt",
      name: "Free99 Platform Intake Receipt",
      url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof/free99-platform-intake-receipt.html",
      local_path: path.join(siteDir, "proof", "free99-platform-intake-receipt.html"),
      audience: "operators, proof reviewers",
      privacy: "public proof",
      purpose: "Receipt proving the Free99 app fleet is mounted under the 0S gate with platform-aware usage tags.",
      route_when: ["proof", "free99", "paid platform intake", "platform_id", "usage_lane"],
      sales_use: "Use after the hub when a buyer or operator asks whether all imported apps were actually wired.",
      primary_brain: "orion-hayes-brain",
      secondary_brain: "naomi-sterling-brain"
    }
  ];
  for (const surface of surfaces) {
    const index = registry.surfaces.findIndex((item) => item.id === surface.id);
    if (index >= 0) registry.surfaces[index] = surface;
    else registry.surfaces.push(surface);
  }
  registry.surface_count = registry.surfaces.length;
  registry.updated_at = "2026-05-18T00:00:00Z";
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
}

if (!fs.existsSync(tmpScan)) {
  throw new Error(`Missing ${tmpScan}. Run the Free99 extraction scan first.`);
}

fs.mkdirSync(appDir, { recursive: true });
writeGateScript();

for (const app of apps) {
  const src = path.join(tmpScan, app.source);
  const dest = path.join(appDir, app.slug);
  if (!fs.existsSync(src)) throw new Error(`Missing source for ${app.slug}: ${src}`);
  console.log(`Mounting ${app.platform_id} -> ${rel(root, dest)}`);
  cpFiltered(src, dest);
  patchMountedApp(app, dest);
  for (const htmlFile of walkFiles(dest).filter((file) => file.toLowerCase().endsWith(".html"))) {
    injectGate(htmlFile, app);
  }
}

writeHub();
writeReceipt();
writeManifest();
updateRouteSurfaces();
updateJsonRegistries();

console.log(JSON.stringify({
  ok: true,
  mounted_apps: apps.length,
  hub: rel(root, path.join(free99Dir, "index.html")),
  manifest: rel(root, path.join(free99Dir, "app-manifest.json"))
}, null, 2));
