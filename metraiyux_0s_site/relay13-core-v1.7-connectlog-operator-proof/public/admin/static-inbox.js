(function () {
  const threads = {
    website: {
      title: "Visitor sent a launch question from widget",
      meta: "Open - MetrAIyux 0S - widget /pricing",
      person: "Website visitor",
      summary: "Unknown contact from widget. Needs education, private access, and a clean next action.",
      details: {
        Workspace: "MetrAIyux 0S",
        Source: "/pricing widget",
        Status: "Open",
        Owner: "Unassigned"
      },
      checklist: ["Explain what they get", "Send private room", "Save contact", "Attach tutorial"],
      draft: "Here is the private room, the setup tutorial, and the next action. Reply here and the thread stays attached to your record.",
      messages: [
        ["them", "Visitor", "2:08 PM", "I saw the platform and need a private room. Can I get the quick version of what I am buying?"],
        ["me", "Operator", "2:09 PM", "You get a messaging workspace, a private handoff room, and a thread tied to your contact record. I am sending that now."],
        ["them", "Visitor", "2:10 PM", "Send the room and the first step. I am on desktop now but need it clean on mobile too."]
      ]
    },
    card: {
      title: "Buyer scan came in with phone and budget",
      meta: "Open - MetrAIyux 0S - card scan",
      person: "Buyer scan",
      summary: "High-intent buyer submitted phone and budget from a QR scan.",
      details: {
        Workspace: "MetrAIyux 0S",
        Source: "QR card",
        Status: "Open",
        Owner: "Gray"
      },
      checklist: ["Create contact", "Attach quote link", "Send buying room", "Mark owner"],
      draft: "I have the budget and phone number saved. I am attaching the quote link and opening your buying room now.",
      messages: [
        ["them", "Card scan", "2:02 PM", "I scanned the card. My budget is ready and I need the buying room."],
        ["me", "Operator", "2:04 PM", "I am creating the customer record and will send the quote from the same thread."]
      ]
    },
    support: {
      title: "Workspace invite did not reach the contact",
      meta: "Pending - SkyeSol - access",
      person: "Client support",
      summary: "Invite delivery failed. Old token should be replaced and the access note should be resent.",
      details: {
        Workspace: "SkyeSol",
        Source: "Support room",
        Status: "Pending",
        Owner: "Support"
      },
      checklist: ["Void old token", "Resend invite", "Confirm delivery", "Close access issue"],
      draft: "I replaced the old token and resent the workspace invite. Please confirm it landed.",
      messages: [
        ["them", "Client support", "1:49 PM", "The workspace invite did not reach the contact."],
        ["me", "Operator", "1:53 PM", "I am replacing the invite token and will resend it from here."]
      ]
    },
    release: {
      title: "Widget config verify job is waiting",
      meta: "Queued - Client launch - release",
      person: "Release job",
      summary: "The client launch job is queued and waiting for install snippet verification.",
      details: {
        Workspace: "Client launch",
        Source: "Release queue",
        Status: "Queued",
        Owner: "Release"
      },
      checklist: ["Verify widget config", "Copy install snippet", "Send tutorial", "Mark release ready"],
      draft: "The widget config verify job is queued. I am sending the install snippet and tutorial link now.",
      messages: [
        ["them", "Release job", "1:12 PM", "Widget config verify job is waiting."],
        ["me", "Operator", "1:16 PM", "I will attach the install snippet and client tutorial before release."]
      ]
    }
  };

  const root = document.querySelector(".admin-inbox-app");
  if (!root) return;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

  let activeThread = "website";
  let activeFilter = "All";
  let toastTimer = null;

  function toast(message) {
    const node = $(".admin-inbox-toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2200);
  }

  function messageHtml(message) {
    const [kind, name, time, body] = message;
    return `<article class="admin-chat-msg ${escapeHtml(kind)}">
      <strong>${escapeHtml(name)}</strong>
      <p>${escapeHtml(body)}</p>
      <span>${escapeHtml(time)}</span>
    </article>`;
  }

  function renderThread(key) {
    const data = threads[key];
    if (!data) return;
    activeThread = key;
    $$(".admin-mail-row").forEach((row) => {
      const selected = row.dataset.adminThread === key;
      row.classList.toggle("selected", selected);
      row.setAttribute("aria-selected", selected ? "true" : "false");
      if (selected) row.classList.remove("unread");
    });

    $(".admin-reading-head h2").textContent = data.title;
    $(".admin-reading-head p:last-child").textContent = data.meta;
    $(".admin-message-log").innerHTML = data.messages.map(messageHtml).join("");
    $(".admin-reply-box textarea").value = data.draft;

    $(".admin-context-panel h2").textContent = data.person;
    $(".admin-context-panel section:first-child > p:not(.eyebrow)").textContent = data.summary;
    $(".admin-context-panel dl").innerHTML = Object.entries(data.details).map(([label, value]) => (
      `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    )).join("");
    $(".admin-context-panel ol").innerHTML = data.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function rowMatches(row, filter, search) {
    const haystack = `${row.textContent} ${row.dataset.tags || ""}`.toLowerCase();
    const filterOk = filter === "All" || haystack.includes(filter.toLowerCase());
    const searchOk = !search || haystack.includes(search.toLowerCase());
    return filterOk && searchOk;
  }

  function applyFilter(filter, silent) {
    activeFilter = filter || "All";
    const search = $(".admin-mail-search input")?.value.trim() || "";
    let firstVisible = null;
    $$(".admin-mail-row").forEach((row) => {
      const visible = rowMatches(row, activeFilter, search);
      row.hidden = !visible;
      if (visible && !firstVisible) firstVisible = row;
    });
    $$("[data-admin-filter]").forEach((control) => {
      const active = control.dataset.adminFilter === activeFilter;
      control.classList.toggle("active", active);
      control.classList.toggle("is-active", active);
      if (control.tagName === "BUTTON") control.setAttribute("aria-pressed", active ? "true" : "false");
    });
    $(".admin-pane-head h2").textContent = activeFilter === "All" ? "Needs operator" : activeFilter;
    if (firstVisible && !$(".admin-mail-row.selected:not([hidden])")) {
      renderThread(firstVisible.dataset.adminThread);
    }
    if (!silent) toast(`${activeFilter === "All" ? "All inbox" : activeFilter} filter applied`);
  }

  function appendToComposer(text) {
    const composer = $(".admin-reply-box textarea");
    composer.value = `${composer.value.trim()}\n\n${text}`;
    composer.focus();
  }

  function addTagToActive(label) {
    const row = $(`.admin-mail-row[data-admin-thread="${activeThread}"]`);
    if (!row) return;
    row.dataset.tags = `${row.dataset.tags || ""} ${label}`;
    const tags = $(".admin-row-tags", row);
    if (tags && !tags.textContent.includes(label)) {
      const chip = document.createElement("span");
      chip.textContent = label;
      tags.appendChild(chip);
    }
  }

  function updateDetail(label, value) {
    threads[activeThread].details[label] = value;
    renderThread(activeThread);
  }

  function handleAction(action) {
    const composer = $(".admin-reply-box textarea");
    if (action === "refresh") {
      toast(`Admin inbox refreshed at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
    } else if (action === "reply") {
      composer.focus();
      toast("Composer focused");
    } else if (action === "assign") {
      updateDetail("Owner", "Gray");
      addTagToActive("Owner Gray");
      toast("Thread assigned to Gray");
    } else if (action === "close") {
      updateDetail("Status", "Closed");
      addTagToActive("Closed");
      toast("Thread closed");
    } else if (action === "insert-tutorial") {
      appendToComposer("Tutorial: https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/relay13-client-tutorial.html");
      toast("Tutorial inserted");
    } else if (action === "attach-room") {
      appendToComposer("Private room: https://relay13.example/room/operator-handoff");
      toast("Private room attached");
    } else if (action === "save-draft") {
      threads[activeThread].draft = composer.value;
      $(".admin-reply-box").dataset.saved = "true";
      toast("Draft saved");
    } else if (action === "send") {
      const body = composer.value.trim();
      if (!body) {
        toast("Write a reply before sending");
        return;
      }
      threads[activeThread].messages.push(["me", "Operator", "Now", body]);
      threads[activeThread].draft = "";
      renderThread(activeThread);
      composer.value = "";
      addTagToActive("Replied");
      toast("Reply sent");
    }
  }

  $$(".admin-mail-row").forEach((row) => {
    row.addEventListener("click", () => renderThread(row.dataset.adminThread));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        renderThread(row.dataset.adminThread);
      }
    });
  });

  $$("[data-admin-filter]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      applyFilter(control.dataset.adminFilter);
    });
  });

  $$("[data-admin-action]").forEach((control) => {
    control.addEventListener("click", () => handleAction(control.dataset.adminAction));
  });

  $(".admin-mail-search input")?.addEventListener("input", () => applyFilter(activeFilter, true));
  renderThread(activeThread);
  applyFilter("All", true);
})();
