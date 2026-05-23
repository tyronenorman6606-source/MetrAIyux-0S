import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "SkyeDocxMax_SMOKE_RESULTS.json");
const require = createRequire(import.meta.url);

function locateBrowserBundle() {
  const candidates = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.resolve(__dirname, "../../.ms-playwright"),
    path.resolve(__dirname, "../../../.ms-playwright"),
    path.resolve(__dirname, "../../../../.ms-playwright"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function locatePlaywright() {
  const candidates = [
    process.env.SKYEDOCXMAX_PLAYWRIGHT_MODULE,
    path.resolve(__dirname, "../../SuperIDEv2/node_modules/playwright/index.js"),
    path.resolve(__dirname, "../../../SuperIDEv2/node_modules/playwright/index.js"),
    path.resolve(__dirname, "../../SuperIDEv3.8/node_modules/playwright/index.mjs"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const url = process.argv[2] || process.env.SKYEDOCXMAX_SMOKE_URL || "";
if (!url || url.includes("<standalone-preview-url>")) {
  console.log(JSON.stringify({
    ok: false,
    skipped: true,
    reason: "No URL provided — pass a deployed URL as the first argument or set SKYEDOCXMAX_SMOKE_URL",
  }, null, 2));
  process.exit(0);
}

const browserBundle = locateBrowserBundle();
if (browserBundle && !process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = browserBundle;
}

const playwrightModule = locatePlaywright();
if (!playwrightModule) {
  console.log(JSON.stringify({
    ok: false,
    skipped: true,
    reason: "Playwright module not found — install playwright in SuperIDEv2 or SuperIDEv3.8 node_modules",
  }, null, 2));
  process.exit(0);
}

const { chromium } = require(playwrightModule);

function writeResult(payload) {
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
}

let browser;
let context;
let page;
const messages = [];
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    skipped: true,
    reason: `Browser binary unavailable — run 'npx playwright install chromium' to enable this smoke: ${error.message}`,
  }, null, 2));
  process.exit(0);
}

try {
context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
page = await context.newPage();

await page.route(/^(https:\/\/cdnjs\.cloudflare\.com|https:\/\/unpkg\.com|https:\/\/fonts\.googleapis\.com)/, async (route) => {
  const resourceType = route.request().resourceType();
  if (resourceType === "stylesheet") {
    await route.fulfill({ status: 200, contentType: "text/css", body: "" });
    return;
  }
  await route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
});

await page.addInitScript(() => {
  const encoder = new TextEncoder();
  const runtime = {
    saved: [],
    openQueue: [],
    openCalls: [],
    saveCalls: [],
  };

  function normalizeBlob(blobLike) {
    if (blobLike instanceof Blob) return blobLike;
    return new Blob([blobLike], { type: "application/octet-stream" });
  }

  function buildOpenHandle(entry) {
    return {
      kind: "file",
      name: entry.name,
      async getFile() {
        return new File([entry.blob], entry.name, { type: entry.blob.type || entry.type || "application/octet-stream" });
      },
    };
  }

  window.__SKYEDOCXMAX_FAKE_FS__ = {
    runtime,
    queueOpenFile(name, contents, type = "application/octet-stream") {
      const blob = contents instanceof Blob ? contents : new Blob([contents], { type });
      runtime.openQueue.push({ name, blob, type: blob.type || type });
    },
    readSavedText(name) {
      const hit = runtime.saved.find((entry) => entry.name === name);
      return hit ? new TextDecoder().decode(hit.bytes) : null;
    },
  };

  Object.defineProperty(window, "showOpenFilePicker", {
    configurable: true,
    value: async (options = {}) => {
      runtime.openCalls.push({
        excludeAcceptAllOption: Boolean(options.excludeAcceptAllOption),
        types: Array.isArray(options.types) ? options.types.map((item) => item.description || "") : [],
      });
      if (!runtime.openQueue.length) throw new DOMException("No queued file", "AbortError");
      return [buildOpenHandle(runtime.openQueue.shift())];
    },
  });

  Object.defineProperty(window, "showSaveFilePicker", {
    configurable: true,
    value: async (options = {}) => {
      const handle = {
        kind: "file",
        name: options.suggestedName || "download.bin",
        async createWritable() {
          const chunks = [];
          return {
            async write(blobLike) {
              const blob = normalizeBlob(blobLike);
              chunks.push(new Uint8Array(await blob.arrayBuffer()));
            },
            async close() {
              const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
              const merged = new Uint8Array(total);
              let offset = 0;
              for (const chunk of chunks) {
                merged.set(chunk, offset);
                offset += chunk.length;
              }
              runtime.saved.push({
                name: handle.name,
                bytes: merged,
                type: options.types?.[0]?.accept ? Object.keys(options.types[0].accept)[0] : "application/octet-stream",
              });
            },
          };
        },
      };
      runtime.saveCalls.push({
        suggestedName: options.suggestedName || "",
        startInName: options.startIn?.name || null,
      });
      return handle;
    },
  });
});

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) messages.push(`${message.type()}: ${message.text()}`);
});
page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));

async function waitReady(target) {
  await target.waitForFunction(() => window.App && window.App.quill && document.querySelector("#editor-container"), null, { timeout: 30000 });
  await target.waitForFunction(() => document.querySelector('[data-super-push="1"]'), null, { timeout: 10000 });
}

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await waitReady(page);

const result = await page.evaluate(async () => {
  const originalDownloadBlob = window.App.downloadBlob.bind(window.App);
  const downloads = [];
  window.App.downloadBlob = async (blob, filename) => {
    downloads.push({ filename, blob, size: blob.size, type: blob.type });
    return originalDownloadBlob(blob, filename);
  };

  await window.App.createDoc(
    "Full Smoke SkyeDocxMax",
    "<h1>Full Smoke SkyeDocxMax</h1><p>Vault, export, import, and bridge proof.</p>",
    null
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  const originalDoc = window.App.getActiveDocRecord();
  if (!originalDoc) throw new Error("No active document after create.");

  window.App.customPrompt = async () => "Governance smoke note";
  await window.App.addCommentFromSelection();
  window.App.toggleSuggestionMode();
  const suggestionInsertIndex = window.App.quill.getLength() - 1;
  const suggestionBeforeText = window.App.lastEditorText || window.App.quill.getText();
  window.App.quill.insertText(suggestionInsertIndex, " Suggested governance change.", "api");
  await window.App.captureSuggestion(
    { ops: [{ retain: suggestionInsertIndex }, { insert: " Suggested governance change." }] },
    suggestionBeforeText
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  window.App.toggleSuggestionMode();
  await window.App.insertPageBreak();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  window.App.openMetadataModal();
  document.getElementById("meta-author").value = "SkyeDocxMax Smoke";
  document.getElementById("meta-classification").value = "confidential";
  document.getElementById("meta-tags").value = "standalone, governance, smoke";
  document.getElementById("meta-summary").value = "Governance controls smoke proof.";
  await window.App.saveMetadata();

  window.App.openTemplateModal();
  document.getElementById("template-select").value = "sop";
  document.getElementById("template-title").value = "Smoke Template SOP";
  await window.App.createFromTemplate();
  await new Promise((resolve) => setTimeout(resolve, 500));
  await window.App.openDoc(originalDoc.id);
  await new Promise((resolve) => setTimeout(resolve, 500));

  window.App.openSuggestionLog();
  window.App.openVersionTimeline();
  const governanceDoc = await new Promise((resolve, reject) => {
    const open = indexedDB.open("SkyesDocsDB", 4);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("documents", "readonly");
      const req = tx.objectStore("documents").get(originalDoc.id);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    };
  });
  if (!governanceDoc?.comments?.length) throw new Error("Governance comment proof missing.");
  if (!governanceDoc?.suggestions?.length) throw new Error("Suggestion mode proof missing.");
  if (!governanceDoc?.versions?.length) throw new Error("Version timeline proof missing.");
  if (!String(governanceDoc?.content || "").includes("[PAGE BREAK]")) throw new Error("Page break proof missing.");
  if (governanceDoc?.meta?.classification !== "confidential") throw new Error("Metadata proof missing.");

  await window.App.exportSkyeFormat(originalDoc, "Full Smoke SkyeDocxMax", {
    passphrase: "full-smoke-passphrase",
    passphraseHint: "full smoke",
    enableFailsafe: true,
  });
  const skyeDownload = downloads.find((item) => item.filename.endsWith(".skye"));
  if (!skyeDownload) throw new Error("Secure .skye download was not captured.");
  const fakeFs = window.__SKYEDOCXMAX_FAKE_FS__;
  if (!fakeFs?.runtime?.saveCalls?.length) throw new Error("Native save picker proof missing for .skye export.");
  const skyeSaveCall = fakeFs.runtime.saveCalls.find((entry) => entry.suggestedName.endsWith(".skye"));
  if (!skyeSaveCall) throw new Error("Native save picker did not receive .skye suggestedName.");
  const skyeSaved = fakeFs.runtime.saved.find((entry) => entry.name.endsWith(".skye"));
  if (!skyeSaved || skyeSaved.bytes.length === 0) throw new Error("Native save picker did not persist the .skye payload.");

  const file = new File([skyeDownload.blob], skyeDownload.filename, { type: skyeDownload.blob.type });
  let wrongPassphraseFailed = false;
  try {
    const wrongPageFile = new File([skyeDownload.blob], skyeDownload.filename, { type: skyeDownload.blob.type });
    const wrongEnvelope = await window.App.tryReadSkyeSecureEnvelope(wrongPageFile);
    await window.SkyeSecure.decryptSkyePayload(wrongEnvelope.payload.primary, "wrong-passphrase");
  } catch {
    wrongPassphraseFailed = true;
  }
  window.App.customPrompt = async () => "full-smoke-passphrase";
  await window.App.processLocalDocFile(file);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const importedDoc = window.App.getActiveDocRecord();
  if (!importedDoc || importedDoc.title !== "Full Smoke SkyeDocxMax") {
    throw new Error("Secure .skye import did not reopen the expected document.");
  }

  fakeFs.queueOpenFile(skyeDownload.filename, skyeDownload.blob, skyeDownload.blob.type);
  await window.App.triggerOpenLocalDoc();
  await new Promise((resolve) => setTimeout(resolve, 500));
  const pickerImportedDoc = window.App.getActiveDocRecord();
  if (!pickerImportedDoc || pickerImportedDoc.title !== "Full Smoke SkyeDocxMax") {
    throw new Error("Native picker open did not reopen the secure .skye document.");
  }

  await window.App.exportHTMLZipFormat(importedDoc, "Full Smoke SkyeDocxMax");
  await window.App.exportTXTFormat("Full Smoke SkyeDocxMax");
  const htmlZipDownload = downloads.find((item) => item.filename.endsWith("_HTML.zip"));
  if (!htmlZipDownload) throw new Error("HTML ZIP download was not captured.");
  const htmlZipSaveCall = fakeFs.runtime.saveCalls.find((entry) => entry.suggestedName.endsWith("_HTML.zip"));
  const txtSaveCall = fakeFs.runtime.saveCalls.find((entry) => entry.suggestedName.endsWith(".txt"));
  if (!htmlZipSaveCall || htmlZipSaveCall.startInName !== skyeDownload.filename) {
    throw new Error("HTML ZIP export did not inherit the prior same-folder runtime handle.");
  }
  if (!txtSaveCall || txtSaveCall.startInName !== "Full_Smoke_SkyeDocxMax_HTML.zip") {
    throw new Error("TXT export did not chain the local runtime folder from the prior export.");
  }
  const htmlZip = await window.JSZip.loadAsync(htmlZipDownload.blob);
  const htmlManifest = JSON.parse(await htmlZip.file("manifest.json").async("string"));
  const archiveHtml = await htmlZip.file(htmlManifest.html_entry || "document.html").async("string");
  if (htmlManifest.format !== "skyedocxmax-html-archive") throw new Error("HTML ZIP manifest format missing.");
  if (!archiveHtml.includes("Full Smoke SkyeDocxMax")) throw new Error("HTML ZIP archive content missing.");

  const importedHtmlFile = new File([archiveHtml], "smoke-import.html", { type: "text/html" });
  await window.App.processLocalDocFile(importedHtmlFile);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const htmlImportedDoc = window.App.getActiveDocRecord();
  if (!htmlImportedDoc || !String(htmlImportedDoc.content || "").includes("Full Smoke SkyeDocxMax")) {
    throw new Error("Direct HTML import did not produce the expected document.");
  }

  const importedTxtFile = new File(["Plain text import proof."], "smoke-import.txt", { type: "text/plain" });
  await window.App.processLocalDocFile(importedTxtFile);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const txtImportedDoc = window.App.getActiveDocRecord();
  const txtImportedVisibleText = String(window.App.quill?.getText?.() || "");
  if (!txtImportedDoc || !txtImportedVisibleText.includes("Plain text import proof.")) {
    throw new Error("Direct TXT import did not produce the expected document.");
  }

  const htmlZipFile = new File([htmlZipDownload.blob], htmlZipDownload.filename, { type: htmlZipDownload.blob.type });
  await window.App.processLocalDocFile(htmlZipFile);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const htmlZipImportedDoc = window.App.getActiveDocRecord();
  if (!htmlZipImportedDoc || htmlZipImportedDoc.title !== "Full Smoke SkyeDocxMax") {
    throw new Error("HTML ZIP import did not reopen the expected document.");
  }

  fakeFs.queueOpenFile(htmlZipDownload.filename, htmlZipDownload.blob, htmlZipDownload.blob.type);
  await window.App.triggerOpenLocalDoc();
  await new Promise((resolve) => setTimeout(resolve, 300));
  const pickerZipImportedDoc = window.App.getActiveDocRecord();
  if (!pickerZipImportedDoc || pickerZipImportedDoc.title !== "Full Smoke SkyeDocxMax") {
    throw new Error("Native picker open did not reopen the HTML ZIP archive.");
  }

  const aiButton = [...document.querySelectorAll('[data-super-push="1"]')].find((button) => button.textContent.includes("AI Draft"));
  const chatButton = [...document.querySelectorAll('[data-super-push="1"]')].find((button) => button.textContent.includes("Push Chat"));
  const driveButton = [...document.querySelectorAll('[data-super-push="1"]')].find((button) => button.textContent.includes("Push Drive"));
  if (!aiButton || !chatButton || !driveButton) throw new Error("Expected bridge buttons are missing.");

  window.App.customPrompt = async (prompt, fallback = "") => {
    if (String(prompt).includes("channel")) return "smoke";
    if (String(prompt).includes("Topic")) return "standalone";
    return fallback || "smoke";
  };
  chatButton.click();
  driveButton.click();
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const outboxKeys = Object.keys(localStorage).filter((key) => key.startsWith("skyedocxmax.outbox."));
  const evidenceKeys = Object.keys(localStorage).filter((key) => key.startsWith("skyedocxmax.evidence."));
  const bridgeKeys = Object.keys(localStorage).filter((key) => key.startsWith("skyedocxmax.bridge."));
  const intentKeys = Object.keys(localStorage).filter((key) => key.startsWith("skyedocxmax.intents."));

  const allDocs = await new Promise((resolve, reject) => {
    const open = indexedDB.open("SkyesDocsDB", 4);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("documents", "readonly");
      const req = tx.objectStore("documents").getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || []);
    };
  });

  const localRuntimeState = window.App.getLocalRuntimeState();
  const operationJournal = window.App.getOperationJournal();
  const nativeSaveEvents = localRuntimeState.events.filter((entry) => entry.type === "native-save");
  const nativeOpenEvents = localRuntimeState.events.filter((entry) => entry.type === "native-open-picker");
  const handleRegisteredEvents = localRuntimeState.events.filter((entry) => entry.type === "handle-registered");
  if (!localRuntimeState.supported) throw new Error("Local runtime state did not detect native file system support.");
  if (nativeSaveEvents.length < 3) throw new Error("Local runtime native save proof is incomplete.");
  if (nativeOpenEvents.length < 2) throw new Error("Local runtime native open proof is incomplete.");
  if (!handleRegisteredEvents.some((entry) => entry.payload?.handle?.name === skyeDownload.filename)) {
    throw new Error("Local runtime handle registration did not retain the .skye source handle.");
  }
  if (!Array.isArray(operationJournal) || operationJournal.length < 5) {
    throw new Error("Local operation journal did not capture enough activity.");
  }
  if (!operationJournal.some((entry) => entry.type === "secure-export" && entry.status === "success")) {
    throw new Error("Local operation journal is missing secure export evidence.");
  }
  if (!operationJournal.some((entry) => entry.type === "secure-import" && entry.status === "success")) {
    throw new Error("Local operation journal is missing secure import evidence.");
  }
  if (!operationJournal.some((entry) => entry.type === "html-archive-export" && entry.status === "success")) {
    throw new Error("Local operation journal is missing HTML archive export evidence.");
  }
  if (!operationJournal.some((entry) => entry.type === "text-export" && entry.status === "success")) {
    throw new Error("Local operation journal is missing text export evidence.");
  }
  window.App.openOperationLog();
  const operationLogModalOpen = document.getElementById("operation-log-modal")?.style.display === "flex";
  if (!operationLogModalOpen) throw new Error("Operation log modal did not open.");
  const announcerText = document.getElementById("status-announcer")?.textContent || "";
  if (!announcerText.trim()) throw new Error("Accessible status announcer did not receive operation messages.");

  await window.App.createDoc("Reload Recovery Smoke", "<p>Baseline saved content.</p>", null);
  await new Promise((resolve) => setTimeout(resolve, 250));
  await window.App.saveCurrentDoc();
  const recoveryDoc = window.App.getActiveDocRecord();
  if (!recoveryDoc?.id) throw new Error("Draft recovery smoke document was not created.");
  const recoveryMarker = `UNSAVED_DRAFT_${Date.now()}`;
  window.App.quill.insertText(window.App.quill.getLength() - 1, ` ${recoveryMarker}`, "user");
  await new Promise((resolve) => setTimeout(resolve, 520));
  const recoverySnapshot = window.App.getDraftSnapshot(recoveryDoc.id);
  if (!recoverySnapshot?.html || !String(recoverySnapshot.html).includes(recoveryMarker)) {
    throw new Error("Unsaved draft snapshot was not captured before reload.");
  }

  return {
    title: document.title,
    activeDocTitle: importedDoc.title,
    documentCount: allDocs.length,
    governance: {
      comments: governanceDoc.comments.length,
      suggestions: governanceDoc.suggestions.length,
      versions: governanceDoc.versions.length,
      classification: governanceDoc.meta?.classification || "",
      hasPageBreak: String(governanceDoc.content || "").includes("[PAGE BREAK]"),
      templateCreated: allDocs.some((doc) => doc.title === "Smoke Template SOP"),
      suggestionModalOpen: document.getElementById("suggestions-modal")?.style.display === "flex",
      timelineModalOpen: document.getElementById("timeline-modal")?.style.display === "flex",
    },
    downloads: downloads.map((item) => ({ filename: item.filename, size: item.size, type: item.type })),
    htmlArchiveManifest: htmlManifest,
    outboxKeys,
    evidenceKeys,
    bridgeKeys,
    intentKeys,
    nativePicker: {
      openCalls: fakeFs.runtime.openCalls,
      saveCalls: fakeFs.runtime.saveCalls,
      savedNames: fakeFs.runtime.saved.map((entry) => entry.name),
    },
    localRuntimeState,
    operationJournal,
    operationLogModalOpen,
    hasRecoveryKit: Boolean(window.App.pendingRecoveryKit?.recoveryCode),
    wrongPassphraseFailed,
    serviceWorkerController: Boolean(navigator.serviceWorker?.controller),
    draftRecovery: {
      docId: recoveryDoc.id,
      title: recoveryDoc.title,
      marker: recoveryMarker,
      snapshotAt: recoverySnapshot.updatedAt,
    },
  };
});

await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
await waitReady(page);
const reloadResult = await page.evaluate(async (draftRecovery) => {
  const docs = await new Promise((resolve, reject) => {
    const open = indexedDB.open("SkyesDocsDB", 4);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("documents", "readonly");
      const req = tx.objectStore("documents").getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || []);
    };
  });
  const recoveryDoc = docs.find((doc) => doc.id === draftRecovery?.docId) || docs.find((doc) => doc.title === draftRecovery?.title);
  if (recoveryDoc?.id) {
    await window.App.openDoc(recoveryDoc.id, { forceReload: true });
  }
  await new Promise((resolve) => setTimeout(resolve, 450));
  const activeRecoveryDoc = window.App?.getActiveDocRecord?.();
  const storedDraftSnapshot = recoveryDoc?.id && typeof window.App?.getDraftSnapshot === "function"
    ? window.App.getDraftSnapshot(recoveryDoc.id)
    : null;
  if (activeRecoveryDoc?.id === recoveryDoc?.id && typeof window.App?.evaluateDraftRecovery === "function") {
    window.App.evaluateDraftRecovery(activeRecoveryDoc);
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  const recoveryBannerVisible = document.getElementById("draft-recovery-banner")?.classList.contains("show") === true;
  const recoveryMessage = document.getElementById("draft-recovery-message")?.textContent || "";
  const recoveryPending = window.App?.pendingDraftRecovery?.docId === recoveryDoc?.id;
  const recoveryMessageMatches = recoveryMessage.includes(draftRecovery?.title || "Reload Recovery Smoke") ||
    recoveryMessage.includes("A newer local draft") ||
    recoveryMessage.includes("A newer standalone draft");
  if (recoveryBannerVisible || recoveryPending || recoveryMessageMatches || storedDraftSnapshot?.docId === recoveryDoc?.id) {
    await window.App.restoreDraftRecovery();
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  const recoveryText = String(window.App.quill?.getText?.() || "");
  const recoverySnapshots = JSON.parse(localStorage.getItem("skyedocxmax.draftSnapshots") || "{}");
  return {
    persisted: docs.some((doc) => doc.title === "Full Smoke SkyeDocxMax"),
    count: docs.length,
    serviceWorkerController: Boolean(navigator.serviceWorker?.controller),
    operationJournalCount: Array.isArray(window.App?.getOperationJournal?.()) ? window.App.getOperationJournal().length : 0,
    recoveryBannerVisible,
    recoveryPending,
    recoveryMessage,
    recoveryMessageMatches,
    recoverySnapshotDetected: Boolean(storedDraftSnapshot?.docId === recoveryDoc?.id),
    recoveryText,
    recoverySnapshotCleared: Object.keys(recoverySnapshots).length === 0 || !Object.values(recoverySnapshots).some((entry) => entry?.title === "Reload Recovery Smoke"),
    recoveryRecorded: Array.isArray(window.App?.getOperationJournal?.()) && window.App.getOperationJournal().some((entry) => entry.type === "draft-recovery" && entry.status === "success"),
  };
}, result.draftRecovery);

  if (!result.title.includes("SkyeDocxMax")) throw new Error(`Unexpected title: ${result.title}`);
  if (result.activeDocTitle !== "Full Smoke SkyeDocxMax") throw new Error("Active document mismatch after import.");
  if (!result.hasRecoveryKit) throw new Error("Failsafe recovery kit was not generated.");
  if (!result.wrongPassphraseFailed) throw new Error("Wrong passphrase did not fail cleanly.");
  if (!result.downloads.some((item) => item.filename.endsWith(".skye") && item.size > 0)) throw new Error("Missing .skye export proof.");
  if (!result.downloads.some((item) => item.filename.endsWith("_HTML.zip") && item.size > 0)) throw new Error("Missing HTML ZIP export proof.");
  if (!result.downloads.some((item) => item.filename.endsWith(".txt") && item.size > 0)) throw new Error("Missing TXT export proof.");
  if (!result.operationLogModalOpen) throw new Error("Operation log modal proof missing.");
  if (!(result.operationJournal || []).some((entry) => entry.type === "comment-thread")) throw new Error("Operation journal comment proof missing.");
  if (result.htmlArchiveManifest?.format !== "skyedocxmax-html-archive") throw new Error("HTML ZIP manifest proof missing.");
  if ((result.nativePicker?.openCalls || []).length < 2) throw new Error("Native picker open calls were not captured.");
  if ((result.nativePicker?.saveCalls || []).length < 3) throw new Error("Native picker save calls were not captured.");
  if (!(result.nativePicker?.savedNames || []).some((name) => name.endsWith(".skye"))) throw new Error("Native picker .skye save record missing.");
  if (!(result.nativePicker?.savedNames || []).some((name) => name.endsWith("_HTML.zip"))) throw new Error("Native picker HTML ZIP save record missing.");
  if (!(result.nativePicker?.savedNames || []).some((name) => name.endsWith(".txt"))) throw new Error("Native picker TXT save record missing.");
  if (!result.governance?.comments) throw new Error("Governance comments proof missing.");
  if (!result.governance?.suggestions) throw new Error("Governance suggestions proof missing.");
  if (!result.governance?.versions) throw new Error("Governance timeline proof missing.");
  if (!result.governance?.hasPageBreak) throw new Error("Governance page break proof missing.");
  if (result.governance?.classification !== "confidential") throw new Error("Governance metadata proof missing.");
  if (!result.governance?.templateCreated) throw new Error("Governance template proof missing.");
  if (!result.outboxKeys.length) throw new Error("Cross-app local outbox proof missing.");
  if (!result.evidenceKeys.length) throw new Error("Evidence localStorage proof missing.");
  if (!result.bridgeKeys.length) throw new Error("Bridge localStorage proof missing.");
  if (!result.intentKeys.length) throw new Error("Intent localStorage proof missing.");
  if (!result.localRuntimeState?.supported) throw new Error("Local runtime state support flag missing.");
  if (!(result.localRuntimeState?.events || []).some((entry) => entry.type === "native-save")) throw new Error("Local runtime native save event missing.");
  if (!(result.localRuntimeState?.events || []).some((entry) => entry.type === "handle-registered")) throw new Error("Local runtime handle registration event missing.");
  if (!reloadResult.persisted) throw new Error("Document did not persist across reload.");
  if (reloadResult.operationJournalCount < (result.operationJournal || []).length) throw new Error("Operation journal did not persist across reload.");
  if (!reloadResult.recoveryBannerVisible && !reloadResult.recoveryPending && !reloadResult.recoveryMessageMatches && !reloadResult.recoverySnapshotDetected) {
    throw new Error(`Draft recovery signal did not appear after reload. message=${reloadResult.recoveryMessage || "missing"}`);
  }
  if (!reloadResult.recoveryText.includes(result.draftRecovery.marker)) throw new Error("Recovered draft text did not return to the editor after reload restore.");
  if (!reloadResult.recoverySnapshotCleared) throw new Error("Draft recovery snapshot was not cleared after restore.");
  if (!reloadResult.recoveryRecorded) throw new Error("Draft recovery operation was not recorded in the journal.");

  const severeMessages = messages.filter((message) => {
    return !message.includes("Failed to load resource") &&
      !message.includes("ERR_FAILED") &&
      !message.includes("404") &&
      !message.includes("net::ERR");
  });
  if (severeMessages.length) throw new Error(`Browser errors:\n${severeMessages.join("\n")}`);

  const payload = {
    ok: true,
    suite: "SkyeDocxMax full standalone smoke",
    url,
    result,
    reloadResult,
  };
  writeResult(payload);
  console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  const payload = {
    ok: false,
    suite: "SkyeDocxMax full standalone smoke",
    url,
    error: String(error?.message || error),
    consoleMessages: messages,
  };
  writeResult(payload);
  throw error;
} finally {
  await context?.close?.().catch(() => {});
  await browser.close();
}
