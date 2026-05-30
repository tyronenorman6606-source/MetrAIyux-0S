(function () {
  "use strict";

  var SKYEMAIL_ORIGIN = "https://skyemail-platform.graylondonskyes.workers.dev";
  var ACTIVE_KEY = "SKYEMAIL_POCKET_ACTIVE";
  var COLLAPSED_KEY = "SKYEMAIL_POCKET_COLLAPSED";
  var ROOT_ATTR = "data-skymail-pocket-shell";

  function safeLocalStorage(method, key, value) {
    try {
      if (!window.localStorage) return null;
      if (method === "get") return window.localStorage.getItem(key);
      if (method === "set") window.localStorage.setItem(key, value);
      if (method === "remove") window.localStorage.removeItem(key);
    } catch (_err) {
      return null;
    }
    return null;
  }

  function params() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch (_err) {
      return new URLSearchParams();
    }
  }

  function clean(value, fallback) {
    var text = value == null ? "" : String(value);
    text = text.replace(/\s+/g, " ").trim();
    return text || fallback || "";
  }

  function readAny(query, names, fallback) {
    for (var i = 0; i < names.length; i += 1) {
      var value = clean(query.get(names[i]));
      if (value) return value;
    }
    return fallback || "";
  }

  function currentReturnUrl(query) {
    var raw = readAny(query, ["skymail_return", "return", "returnTo", "return_to"]);
    if (!raw) return window.location.href;
    try {
      return new URL(raw, window.location.href).href;
    } catch (_err) {
      return window.location.href;
    }
  }

  function clip(value, limit) {
    var text = clean(value);
    if (!text) return "";
    return text.length > limit ? text.slice(0, Math.max(0, limit - 3)) + "..." : text;
  }

  function contextFromPage(query) {
    return {
      mailbox: readAny(query, ["mailbox", "mailbox_email", "email", "skyemail_mailbox"]),
      messageId: readAny(query, ["message_id", "messageId", "mail_message_id"]),
      threadId: readAny(query, ["thread_id", "threadId", "mail_thread_id"]),
      subject: readAny(query, ["subject"], document.title || "0S workspace"),
      from: readAny(query, ["from", "sender", "contact"]),
      returnUrl: currentReturnUrl(query),
      surface: clean(document.title, "0S workspace"),
      path: window.location.pathname || "/"
    };
  }

  function buildSkyeMailUrl(path, context) {
    var url = new URL(path, SKYEMAIL_ORIGIN + "/");
    var pairs = {
      skymail_pocket: "1",
      mailbox: context.mailbox,
      message_id: context.messageId,
      thread_id: context.threadId,
      subject: context.subject,
      from: context.from,
      skymail_return: context.returnUrl,
      surface: context.surface,
      source_path: context.path
    };
    Object.keys(pairs).forEach(function (key) {
      if (clean(pairs[key])) url.searchParams.set(key, clean(pairs[key]));
    });
    return url.href;
  }

  function line(label, value) {
    var row = document.createElement("div");
    row.className = "skymail-pocket-line";
    var labelNode = document.createElement("span");
    labelNode.textContent = label;
    var valueNode = document.createElement("b");
    valueNode.textContent = value || "Not supplied";
    row.appendChild(labelNode);
    row.appendChild(valueNode);
    return row;
  }

  function action(label, href, primary) {
    var link = document.createElement("a");
    link.className = primary ? "skymail-pocket-action primary" : "skymail-pocket-action";
    link.href = href;
    link.target = label === "Return" ? "_self" : "skyemail-pocket";
    link.rel = "noopener";
    link.textContent = label;
    return link;
  }

  function installStyles() {
    if (document.getElementById("skymail-pocket-tab-style")) return;
    var style = document.createElement("style");
    style.id = "skymail-pocket-tab-style";
    style.textContent = [
      "[data-skymail-pocket-shell]{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:grid;grid-template-columns:auto minmax(280px,360px);align-items:end;gap:10px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#edf7ff;letter-spacing:0}",
      "[data-skymail-pocket-shell] *{box-sizing:border-box;letter-spacing:0}",
      ".skymail-pocket-rail{writing-mode:vertical-rl;transform:rotate(180deg);min-width:42px;min-height:128px;border:1px solid rgba(93,226,255,.5);border-radius:8px;background:linear-gradient(180deg,#111827,#0b2a36);color:#eafaff;font-weight:850;font-size:12px;line-height:1;box-shadow:0 16px 42px rgba(0,0,0,.38);cursor:pointer;text-transform:uppercase}",
      ".skymail-pocket-panel{overflow:hidden;border:1px solid rgba(93,226,255,.38);border-radius:8px;background:linear-gradient(145deg,rgba(8,14,24,.96),rgba(16,35,43,.96));box-shadow:0 18px 54px rgba(0,0,0,.42);backdrop-filter:blur(14px)}",
      ".skymail-pocket-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:13px 13px 10px;border-bottom:1px solid rgba(255,255,255,.08)}",
      ".skymail-pocket-kicker{margin:0 0 4px;color:#80e8ff;font-size:10px;font-weight:850;text-transform:uppercase}",
      ".skymail-pocket-title{margin:0;color:#ffffff;font-size:15px;font-weight:900;line-height:1.15}",
      ".skymail-pocket-sub{margin:5px 0 0;color:#b7c9d7;font-size:12px;line-height:1.35}",
      ".skymail-pocket-close{width:32px;height:32px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(255,255,255,.06);color:#f6fbff;font-weight:900;cursor:pointer}",
      ".skymail-pocket-body{display:grid;gap:10px;padding:12px 13px 13px}",
      ".skymail-pocket-context{display:grid;gap:7px;padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.05)}",
      ".skymail-pocket-line{display:grid;grid-template-columns:78px minmax(0,1fr);gap:8px;align-items:start;font-size:12px;line-height:1.35}",
      ".skymail-pocket-line span{color:#8aa2b4;font-weight:800;text-transform:uppercase;font-size:10px}",
      ".skymail-pocket-line b{min-width:0;overflow:hidden;text-overflow:ellipsis;color:#f5fbff;font-weight:750;white-space:nowrap}",
      ".skymail-pocket-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}",
      ".skymail-pocket-action{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:8px 10px;border:1px solid rgba(255,255,255,.14);border-radius:8px;background:rgba(255,255,255,.06);color:#edf7ff;text-decoration:none;font-size:12px;font-weight:850;white-space:nowrap}",
      ".skymail-pocket-action.primary{border-color:rgba(255,205,91,.75);background:linear-gradient(135deg,#ffd15d,#42daf5);color:#09131a}",
      ".skymail-pocket-note{margin:0;color:#a9bbc9;font-size:11px;line-height:1.45}",
      "[data-skymail-pocket-shell].is-collapsed{grid-template-columns:auto}",
      "[data-skymail-pocket-shell].is-collapsed .skymail-pocket-panel{display:none}",
      "@media(max-width:640px){[data-skymail-pocket-shell]{right:10px;bottom:10px;grid-template-columns:auto minmax(230px,calc(100vw - 74px))}.skymail-pocket-actions{grid-template-columns:1fr}.skymail-pocket-line{grid-template-columns:70px minmax(0,1fr)}}"
    ].join("");
    document.head.appendChild(style);
  }

  function render() {
    if (document.querySelector("[" + ROOT_ATTR + "]")) return;

    var query = params();
    var requested = query.get("skymail_pocket") === "1";
    if (requested) safeLocalStorage("set", ACTIVE_KEY, "1");
    if (!requested && safeLocalStorage("get", ACTIVE_KEY) !== "1") return;

    installStyles();

    var context = contextFromPage(query);
    var root = document.createElement("aside");
    root.setAttribute(ROOT_ATTR, "1");
    root.setAttribute("aria-label", "SkyeMail pocket handoff");

    var rail = document.createElement("button");
    rail.className = "skymail-pocket-rail";
    rail.type = "button";
    rail.textContent = "SkyeMail";

    var panel = document.createElement("section");
    panel.className = "skymail-pocket-panel";

    var head = document.createElement("div");
    head.className = "skymail-pocket-head";
    var headText = document.createElement("div");
    var kicker = document.createElement("p");
    kicker.className = "skymail-pocket-kicker";
    kicker.textContent = "Sovereign 0S handoff";
    var title = document.createElement("h2");
    title.className = "skymail-pocket-title";
    title.textContent = "SkyeMail Pocket";
    var sub = document.createElement("p");
    sub.className = "skymail-pocket-sub";
    sub.textContent = clip(context.subject, 72) || "Mail context is ready for this workspace.";
    headText.appendChild(kicker);
    headText.appendChild(title);
    headText.appendChild(sub);

    var hide = document.createElement("button");
    hide.className = "skymail-pocket-close";
    hide.type = "button";
    hide.setAttribute("aria-label", "Hide SkyeMail pocket");
    hide.textContent = "x";
    head.appendChild(headText);
    head.appendChild(hide);

    var body = document.createElement("div");
    body.className = "skymail-pocket-body";
    var contextBox = document.createElement("div");
    contextBox.className = "skymail-pocket-context";
    contextBox.appendChild(line("Mailbox", clip(context.mailbox, 64) || "Active SkyeMail account"));
    contextBox.appendChild(line("From", clip(context.from, 64) || "Message context"));
    contextBox.appendChild(line("Thread", clip(context.threadId || context.messageId, 64) || "Open handoff"));
    body.appendChild(contextBox);

    var actions = document.createElement("div");
    actions.className = "skymail-pocket-actions";
    actions.appendChild(action("Pocket", buildSkyeMailUrl("pocket.html", context), true));
    actions.appendChild(action("Workspace", buildSkyeMailUrl("workspace.html", context), false));
    actions.appendChild(action("Inbox", buildSkyeMailUrl("dashboard.html", context), false));
    actions.appendChild(action("Return", context.returnUrl, false));
    body.appendChild(actions);

    var note = document.createElement("p");
    note.className = "skymail-pocket-note";
    note.textContent = "This tab carries the selected mail context across the 0S without embedding external frames.";
    body.appendChild(note);

    panel.appendChild(head);
    panel.appendChild(body);
    root.appendChild(rail);
    root.appendChild(panel);

    function setCollapsed(value) {
      root.classList.toggle("is-collapsed", Boolean(value));
      rail.setAttribute("aria-expanded", value ? "false" : "true");
      safeLocalStorage("set", COLLAPSED_KEY, value ? "1" : "0");
    }

    rail.addEventListener("click", function () {
      setCollapsed(!root.classList.contains("is-collapsed"));
    });
    hide.addEventListener("click", function () {
      safeLocalStorage("remove", ACTIVE_KEY);
      root.remove();
    });

    document.body.appendChild(root);
    setCollapsed(safeLocalStorage("get", COLLAPSED_KEY) === "1");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render, { once: true });
  } else {
    render();
  }
})();
