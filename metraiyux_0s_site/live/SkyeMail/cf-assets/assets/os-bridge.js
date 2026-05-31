(function(){
  const ZERO_OS_ORIGIN = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
  const SKYEMAIL_ORIGIN = "https://skyemail-platform.graylondonskyes.workers.dev";
  const DOCX_PATH = "/Marketing-Made-Easy/SkyeDocxMax/editor.html";

  const ACTIONS = [
    { id:"skydocxmax-editor", group:"Documents", panel:"docs", label:"SkyeDocxMax Editor", path:DOCX_PATH, lane:"document-compose", capability:"verified_gated_app", bridge:"fragment_handoff", embed:false, summary:"Draft or edit selected mail as a SkyeDocxMax document.", talksTo:["SkyeMail context","SkyeDocxMax importer","shared 0S gate"] },
    { id:"sovereigndocs-packet-builder", group:"Documents", panel:"docs", label:"SovereignDocs Packet", path:"/Free99/apps/sovereigndocs/packet-builder/", lane:"governed-document-packet", capability:"verified_gated_app", bridge:"workflow_packet", embed:false, summary:"Move mail context into a governed document packet.", talksTo:["SkyeMail workflow packets","SovereignDocs","shared 0S gate"] },
    { id:"sovereigndocs-review-studio", group:"Documents", panel:"docs", label:"Document Review", path:"/Free99/apps/sovereigndocs/review-studio/", lane:"document-review", capability:"verified_gated_app", bridge:"workflow_packet", embed:false, summary:"Queue a message, draft, or attachment for lifecycle review.", talksTo:["SkyeMail workflow packets","SovereignDocs review","shared 0S gate"] },
    { id:"founder-calendar", group:"Schedule", panel:"calendar", label:"0S Calendar", path:"/founder-command/apps/0s-calendar/", apiRoute:"/api/founder-command/calendar", lane:"calendar-follow-up", capability:"live_api", bridge:"direct_api", embed:false, summary:"List and create Founder Calendar events from mail context.", talksTo:["SkyeMail context","Founder Calendar API","Google Calendar provider when configured"] },
    { id:"founder-command-bridge", group:"Command", panel:"automation", label:"Founder Command", path:"/founder-command/apps/0s-command-bridge/", apiRoute:"/api/founder-command/actions", lane:"founder-command", capability:"live_api", bridge:"direct_api", embed:false, summary:"Promote mail into allowlisted Founder Command actions and receipts.", talksTo:["SkyeMail workflow packets","Founder Command actions","0S Command Bridge"] },
    { id:"crm-pipeline", group:"CRM", panel:"crm", label:"CRM Pipeline", path:"/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/pipeline-tracker.html", apiRoute:"/api/founder-command/actions", apiAction:"command-bridge.event.record", lane:"crm-intake", capability:"packet_bridge", bridge:"command_bridge_event", embed:false, summary:"Record sender or thread context as a 0S Command Bridge CRM event.", talksTo:["SkyeMail workflow packets","0S Command Bridge","AE CRM surface"] },
    { id:"crm-follow-up", group:"CRM", panel:"crm", label:"CRM Follow-Up", path:"/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/follow-up.html", apiRoute:"/api/founder-command/actions", apiAction:"command-bridge.event.record", lane:"sales-follow-up", capability:"packet_bridge", bridge:"command_bridge_event", embed:false, summary:"Queue reply work and client follow-up from a selected thread.", talksTo:["SkyeMail workflow packets","0S Command Bridge","AE follow-up surface"] },
    { id:"profit-console", group:"Finance", panel:"finance", label:"Profit Console", path:"/live/skyeprofitconsole-profit-console.html", lane:"finance-review", capability:"verified_gated_app", bridge:"workflow_packet", embed:false, summary:"Move pricing, invoice, or revenue terms into finance review.", talksTo:["SkyeMail workflow packets","SkyeProfitConsole","shared 0S gate"] },
    { id:"split-engine", group:"Finance", panel:"finance", label:"Split Engine", path:"/live/skye-split-engine-operator-proof.html", lane:"profit-split", capability:"verified_gated_app", bridge:"workflow_packet", embed:false, summary:"Route payout or revenue-share terms into split review.", talksTo:["SkyeMail workflow packets","SkyeSplitEngine","shared 0S gate"] },
    { id:"audit-ledger", group:"Legal", panel:"legal", label:"Audit Ledger", path:"/Free99/apps/sovereigndocs/audit-ledger/", lane:"audit-evidence", capability:"verified_gated_app", bridge:"workflow_packet", embed:false, summary:"Preserve selected message context as audit evidence.", talksTo:["SkyeMail workflow packets","SovereignDocs audit ledger","shared 0S gate"] },
    { id:"saas-launch-packet", group:"Expansion", panel:"builder", label:"SaaS Launch Packet", path:"/Free99/apps/sovereigndocs/packets/saas-launch-packet/", lane:"saas-launch", capability:"verified_gated_app", bridge:"workflow_packet", embed:false, summary:"Turn client work into a launch packet.", talksTo:["SkyeMail workflow packets","SovereignDocs launch packet","shared 0S gate"] },
    { id:"government-case-command", group:"Legal", panel:"legal", label:"Government Case Command", path:"/Free99/apps/sovereigndocs/case-command-center/", lane:"government-case", capability:"verified_gated_app", bridge:"workflow_packet", embed:false, summary:"Move regulated or civic email work into a case lane.", talksTo:["SkyeMail workflow packets","SovereignDocs case command","shared 0S gate"] },
    { id:"skyevaultpro-drive", group:"Vault", panel:"legal", label:"SkyeVault Pro", path:"/Free99/apps/skyevaultpro/drive/", lane:"source-custody", capability:"verified_gated_app", bridge:"workflow_packet", embed:false, summary:"Store mail-derived artifacts in the vault.", talksTo:["SkyeMail workflow packets","SkyeVault Pro","shared 0S gate"] },
    { id:"pwa-factory", group:"Builder", panel:"builder", label:"PWA Factory", path:"/founder-command/apps/pwa-factory-v213/", apiRoute:"/api/founder-command/pwa-factory/analyze", lane:"app-build", capability:"live_api", bridge:"direct_api", embed:false, summary:"Analyze mail context into a PWA launch manifest.", talksTo:["SkyeMail context","Founder PWA Factory API","FS27 AI lane when available"] }
  ];

  function clean(value){
    return String(value || "").trim();
  }

  function htmlSafe(value){
    return clean(value).replace(/[<>&"]/g, (char)=>({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[char]));
  }

  function normalizeAction(action = {}){
    return {
      ...action,
      panel: clean(action.panel || action.nativePanel || "overview"),
      capability: clean(action.capability || "packet_bridge"),
      bridge: clean(action.bridge || "workflow_packet"),
      embed: false,
      talksTo: Array.isArray(action.talksTo) ? action.talksTo : [],
    };
  }

  function setActions(items){
    if(!Array.isArray(items) || !items.length) return ACTIONS;
    ACTIONS.splice(0, ACTIONS.length, ...items.map(normalizeAction));
    return ACTIONS;
  }

  function activeMailbox(){
    try{ return window.SMVRuntime?.getActiveMailbox?.() || localStorage.getItem("SMV_ACTIVE_MAILBOX") || ""; }
    catch(_err){ return ""; }
  }

  function gateToken(){
    try{
      if(typeof getToken === "function"){
        const token = clean(getToken());
        if(token) return token;
      }
    }catch(_err){}
    return clean(window.MetrAIyuxGateBridge?.current?.()?.token || "");
  }

  function safeText(value, limit = 24000){
    const text = clean(value);
    return text.length > limit ? `${text.slice(0, limit)}\n\n[SkyeMail bridge truncated this draft for URL handoff.]` : text;
  }

  function bytesToBase64Url(bytes){
    let binary = "";
    bytes.forEach((byte)=> { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlEncodeJson(payload){
    const bytes = new TextEncoder().encode(JSON.stringify(payload || {}));
    return bytesToBase64Url(bytes);
  }

  function toolById(id){
    return ACTIONS.find((item)=>item.id === id) || null;
  }

  function actionsForPanel(panel){
    return ACTIONS.filter((action)=>clean(action.panel || action.nativePanel) === panel);
  }

  function contextParams(context = {}){
    const params = {
      source:"skymail",
      skymail_pocket:"1",
      skymail_return: `${SKYEMAIL_ORIGIN}/workspace.html`,
      mailbox: clean(context.mailbox || activeMailbox()),
      message_id: clean(context.messageId || context.message_id),
      thread_id: clean(context.threadId || context.thread_id),
      subject: clean(context.subject),
      from: clean(context.from),
      to: clean(context.to),
      return: clean(context.returnUrl || location.href)
    };
    Object.keys(params).forEach((key)=> { if(!params[key]) delete params[key]; });
    return params;
  }

  function gateUrlFor(path, params = {}, fragment = ""){
    const target = new URL(path || "/", ZERO_OS_ORIGIN);
    Object.entries(params || {}).forEach(([key, value])=> {
      if(value === undefined || value === null || value === "") return;
      target.searchParams.set(key, String(value));
    });
    if(fragment) target.hash = fragment.replace(/^#/, "");
    const sameOrigin = location.origin === ZERO_OS_ORIGIN;
    if(sameOrigin) return `${target.pathname}${target.search}${target.hash}`;
    const gate = new URL("/admin/login.html", ZERO_OS_ORIGIN);
    gate.searchParams.set("return", `${target.pathname}${target.search}${target.hash}`);
    return gate.toString();
  }

  function toolUrl(actionOrId, context = {}){
    const action = typeof actionOrId === "string" ? toolById(actionOrId) : actionOrId;
    if(!action) return gateUrlFor("/", contextParams(context));
    return gateUrlFor(action.path, contextParams(context));
  }

  function pocketUrl(context = {}){
    const url = new URL("pocket.html", SKYEMAIL_ORIGIN);
    const params = contextParams(context);
    Object.entries(params).forEach(([key, value])=> {
      if(value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
    url.searchParams.set("return", clean(context.returnUrl || location.href));
    return url.toString();
  }

  function openWithPocket(actionOrId, context = {}){
    const action = typeof actionOrId === "string" ? toolById(actionOrId) : actionOrId;
    const pocket = window.open(pocketUrl(context), "skyemail-pocket", "popup,width=420,height=680,menubar=no,toolbar=no,location=no,status=no,noopener=no");
    try{ pocket?.focus?.(); }catch(_err){}
    const url = action?.id === "skydocxmax-editor" ? skyeDocxUrl(context) : toolUrl(action, context);
    window.open(url, "_blank", "noopener");
    window.SMV?.trackGame?.("os_handoff_pocket");
    return url;
  }

  function skyeDocxPayload(context = {}){
    return {
      source:"skymail",
      mailbox: clean(context.mailbox || activeMailbox()),
      subject: clean(context.subject) || "SkyeMail Draft",
      from: clean(context.from),
      to: clean(context.to),
      cc: clean(context.cc),
      bcc: clean(context.bcc),
      messageId: clean(context.messageId || context.message_id),
      threadId: clean(context.threadId || context.thread_id),
      text: safeText(context.text || context.bodyText || context.snippet || ""),
      html: safeText(context.html || context.bodyHtml || ""),
      returnUrl: clean(context.returnUrl || location.href),
      createdAt: new Date().toISOString()
    };
  }

  function skyeDocxUrl(context = {}){
    const payload = skyeDocxPayload(context);
    const params = contextParams({
      ...context,
      subject: payload.subject,
      messageId: payload.messageId,
      threadId: payload.threadId,
      mailbox: payload.mailbox,
      returnUrl: payload.returnUrl
    });
    params.source = "skymail";
    params.skymail_handoff = "fragment";
    const hash = `skymail=${base64UrlEncodeJson(payload)}`;
    return gateUrlFor(DOCX_PATH, params, hash);
  }

  function openSkyeDocx(context = {}){
    const url = skyeDocxUrl(context);
    window.open(url, "_blank");
    window.SMV?.trackGame?.("docx_handoff");
    return url;
  }

  async function archiveHandoff(actionId, context = {}, extra = {}){
    if(typeof apiFetch !== "function") throw new Error("SkyeMail API bridge is not available.");
    const action = toolById(actionId);
    const data = await apiFetch("/mail-os-handoff", {
      method:"POST",
      body:JSON.stringify({
        action_id: actionId,
        action,
        label: extra.label,
        notes: extra.notes,
        context:{
          ...contextParams(context),
          text: safeText(context.text || context.bodyText || ""),
          snippet: safeText(context.snippet || "", 4000)
        }
      })
    });
    window.SMV?.trackGame?.("os_handoff");
    return data;
  }

  function zeroOsHeaders(lane = "skymail-workbench"){
    const token = gateToken();
    if(!token) throw new Error("Login through the shared 0S gate to use this lane.");
    return {
      "Content-Type":"application/json",
      "Accept":"application/json",
      "Authorization":`Bearer ${token}`,
      "x-free99-gate-session":token,
      "x-skye-gate-session":token,
      "x-skygate-session":token,
      "x-skye-platform":"skymail",
      "x-skye-usage-lane":lane
    };
  }

  async function zeroOsFetch(path, opts = {}){
    const url = new URL(path, ZERO_OS_ORIGIN);
    const headers = Object.assign(zeroOsHeaders(opts.lane || "skymail-workbench"), opts.headers || {});
    const res = await fetch(url.toString(), { credentials:"include", ...opts, headers });
    const text = await res.text();
    let data = null;
    try{ data = text ? JSON.parse(text) : {}; }
    catch(_err){ data = { raw:text }; }
    if(!res.ok || data?.ok === false){
      const err = new Error(data?.error || data?.message || `0S route returned ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function listCalendarEvents(limit = 8){
    return zeroOsFetch(`/api/founder-command/calendar?limit=${encodeURIComponent(limit)}`, { lane:"calendar" });
  }

  async function createCalendarEvent(payload = {}){
    return zeroOsFetch("/api/founder-command/calendar", {
      method:"POST",
      lane:"calendar",
      body:JSON.stringify({ source:"skymail-workbench", ...payload })
    });
  }

  async function founderStatus(){
    return zeroOsFetch("/api/founder-command/status", { lane:"founder-command-status" });
  }

  async function founderActions(){
    return zeroOsFetch("/api/founder-command/actions", { lane:"founder-command-actions" });
  }

  async function automationStatus(){
    return zeroOsFetch("/api/0s/automation/status", { lane:"0s-automation-status" });
  }

  async function recordCommandEvent(context = {}, detail = {}){
    const summary = clean(detail.summary || context.subject || "SkyeMail workbench event");
    return zeroOsFetch("/api/founder-command/actions/execute", {
      method:"POST",
      lane:detail.lane || "command-bridge-event",
      body:JSON.stringify({
        action_id:"command-bridge.event.record",
        params:{
          source_app:"skymail",
          source_surface:detail.source_surface || "workspace",
          event_type:detail.event_type || "skymail.workspace.handoff",
          status:detail.status || "recorded",
          summary,
          entity_kind:detail.entity_kind || (context.messageId || context.message_id ? "message" : "mailbox"),
          entity_id:clean(context.messageId || context.message_id || context.threadId || context.thread_id || context.mailbox || activeMailbox()),
          entity_label:summary,
          amount_cents:detail.amount_cents || 0,
          currency:detail.currency || "USD",
          provider:detail.provider || "skymail"
        }
      })
    });
  }

  async function analyzePwaFromMail(context = {}){
    const htmlSource = [
      `<h1>${clean(context.subject) || "SkyeMail launch context"}</h1>`,
      `<p>${safeText(context.snippet || context.text || "", 9000)}</p>`,
      `<p>Mailbox: ${clean(context.mailbox || activeMailbox())}</p>`
    ].join("\n");
    return zeroOsFetch("/api/founder-command/pwa-factory/analyze", {
      method:"POST",
      lane:"pwa-factory",
      body:JSON.stringify({ htmlSource, manifest:{ name:clean(context.subject || "SkyeMail Launch"), short_name:"SkyeMail" } })
    });
  }

  function mountPocket(context = {}){
    if(document.querySelector("[data-skyemail-pocket]")) return;
    const ctx = { ...contextParams(context), subject: clean(context.subject), snippet: clean(context.snippet) };
    const node = document.createElement("aside");
    node.className = "skyemail-pocket-tab";
    node.setAttribute("data-skyemail-pocket", "1");
    node.innerHTML = `
      <button class="skyemail-pocket-rail" type="button" data-pocket-toggle aria-label="Toggle SkyeMail pocket">SkyeMail</button>
      <div class="skyemail-pocket-body">
        <div class="skyemail-pocket-head">
          <div><b>SkyeMail</b><span>${htmlSafe(ctx.mailbox) || "active mailbox"}</span></div>
          <button class="btn small" type="button" data-pocket-toggle>Collapse</button>
        </div>
        <div class="skyemail-pocket-context">
          <span>${htmlSafe(ctx.subject) || "No selected subject"}</span>
          <small>${htmlSafe(ctx.message_id || ctx.thread_id || "mailbox context")}</small>
        </div>
        <div class="btnrow">
          <a class="btn small gold" href="${htmlSafe(pocketUrl(context))}" target="skyemail-pocket">Pocket</a>
          <a class="btn small" href="dashboard.html">Inbox</a>
          <button class="btn small" type="button" data-pocket-docx>Doc</button>
          <button class="btn small" type="button" data-pocket-packet>Packet</button>
        </div>
      </div>`;
    document.body.appendChild(node);
    const setCollapsed = (collapsed)=> {
      node.classList.toggle("collapsed", collapsed);
      try{ localStorage.setItem("SMV_SKYEMAIL_POCKET_COLLAPSED", collapsed ? "1" : "0"); }catch(_err){}
    };
    try{ setCollapsed(localStorage.getItem("SMV_SKYEMAIL_POCKET_COLLAPSED") === "1"); }catch(_err){}
    node.querySelectorAll("[data-pocket-toggle]").forEach((btn)=> btn.onclick = ()=> setCollapsed(!node.classList.contains("collapsed")));
    node.querySelector("[data-pocket-docx]").onclick = ()=> openSkyeDocx(context);
    node.querySelector("[data-pocket-packet]").onclick = ()=> archiveHandoff("founder-command-bridge", context).catch((error)=> window.alert?.(error.message || "Packet failed."));
  }

  window.SMVZeroOs = {
    ZERO_OS_ORIGIN,
    SKYEMAIL_ORIGIN,
    DOCX_PATH,
    ACTIONS,
    activeMailbox,
    gateToken,
    toolById,
    actionsForPanel,
    setActions,
    toolUrl,
    pocketUrl,
    openWithPocket,
    gateUrlFor,
    contextParams,
    skyeDocxUrl,
    openSkyeDocx,
    archiveHandoff,
    zeroOsFetch,
    listCalendarEvents,
    createCalendarEvent,
    founderStatus,
    founderActions,
    automationStatus,
    recordCommandEvent,
    analyzePwaFromMail,
    mountPocket
  };
})();
