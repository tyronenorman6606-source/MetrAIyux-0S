(function () {
  const threads = {
    maya: {
      title: "Private access request after card scan",
      meta: "Maya Carter - buyer scan - high intent - owner Gray",
      person: "Maya Carter",
      summary: "Buyer lead from card scan. High purchase intent, wants private access today.",
      details: {
        Email: "maya@northline.example",
        Source: "QR card - MetrAIyux 0S",
        Lane: "Buyer scans",
        "Next step": "Send quote and access link"
      },
      state: ["Contact captured", "Workspace matched", "Operator reply drafted", "Quote link pending"],
      draft: "Maya, I have your private access room ready. I am sending the quote and a morning slot now.",
      messages: [
        ["visitor", "Maya Carter", "2:14 PM", "I scanned the card. I need the link, the quote, and the clean next step today."],
        ["operator", "Relay13 operator", "2:15 PM", "I can route that now. I am attaching your request to a private access record and sending the next step."],
        ["visitor", "Maya Carter", "2:16 PM", "Perfect. Use this email and mark the project as urgent. I can meet tomorrow morning."]
      ]
    },
    ocean: {
      title: "Widget install is live but reply routing needs owner",
      meta: "Ocean Ave Studio - client support - pending owner",
      person: "Ocean Ave Studio",
      summary: "Client workspace has the launcher installed. Operator routing needs an owner before launch.",
      details: {
        Email: "ops@oceanave.example",
        Source: "Client widget install",
        Lane: "Client support",
        "Next step": "Assign owner and verify replies"
      },
      state: ["Widget detected", "Workspace matched", "Reply route open", "Owner pending"],
      draft: "I see the launcher live. I am assigning the operator route now and will verify the first reply in this thread.",
      messages: [
        ["visitor", "Ocean Ave Studio", "2:03 PM", "The client sees the launcher. Operator reply should land in the same thread."],
        ["operator", "Relay13 operator", "2:04 PM", "I am checking the workspace route and will assign an owner before you send the first client response."]
      ]
    },
    priya: {
      title: "Quote approved, waiting on deploy handoff",
      meta: "Priya Shah - queued - client-ready",
      person: "Priya Shah",
      summary: "Approved buyer quote is waiting on the deploy handoff and signed scope record.",
      details: {
        Email: "priya@example.com",
        Source: "Operator quote room",
        Lane: "Queued",
        "Next step": "Send release link"
      },
      state: ["Quote approved", "Scope attached", "Deploy room ready", "Release link pending"],
      draft: "Priya, the quote is approved. I am sending the release room and attaching the signed scope here.",
      messages: [
        ["visitor", "Priya Shah", "1:48 PM", "Quote approved. Please send the deploy handoff."],
        ["operator", "Relay13 operator", "1:52 PM", "Copy. I am attaching the signed scope and release room to this record."]
      ]
    },
    greenroom: {
      title: "Vendor handoff needs proof link",
      meta: "Greenroom Ops - vendor - blocked",
      person: "Greenroom Ops",
      summary: "Vendor handoff is blocked until the restored backup note and proof link are attached.",
      details: {
        Email: "handoff@greenroom.example",
        Source: "Vendor handoff",
        Lane: "Vendor",
        "Next step": "Attach proof link"
      },
      state: ["Vendor identified", "Record opened", "Proof requested", "Backup note pending"],
      draft: "I am attaching the restored backup proof link now. Once that is in the room, the handoff can move.",
      messages: [
        ["visitor", "Greenroom Ops", "1:14 PM", "We need the restored backup note before the final message goes out."],
        ["operator", "Relay13 operator", "1:17 PM", "I am pulling the proof link into this thread and will mark the handoff ready after review."]
      ]
    },
    north: {
      title: "Follow-up scheduled for launch room",
      meta: "North Pier - snoozed - launch",
      person: "North Pier",
      summary: "Launch-room follow-up is parked until the calendar window opens.",
      details: {
        Email: "launch@northpier.example",
        Source: "Launch room",
        Lane: "Snoozed",
        "Next step": "Wake thread at calendar window"
      },
      state: ["Launch room created", "Follow-up scheduled", "Calendar watched", "Waiting"],
      draft: "I will reopen this when the launch window starts and keep the room attached to the record.",
      messages: [
        ["visitor", "North Pier", "11:20 AM", "Keep this out of the active lane until the calendar opens."],
        ["operator", "Relay13 operator", "11:22 AM", "Done. I snoozed the thread and kept the launch room attached."]
      ]
    }
  };

  const root = document.querySelector(".actual-inbox-page");
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

  let activeThread = "maya";
  let activeFilter = "All";
  let toastTimer = null;

  function toast(message) {
    const node = $(".inbox-toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2200);
  }

  function messageHtml(message) {
    const [kind, name, time, body] = message;
    return `<article class="timeline-message ${escapeHtml(kind)}">
      <div class="message-meta"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(time)}</span></div>
      <p>${escapeHtml(body)}</p>
    </article>`;
  }

  function renderThread(key) {
    const data = threads[key];
    if (!data) return;
    activeThread = key;
    $$(".mail-row").forEach((row) => {
      const selected = row.dataset.thread === key;
      row.classList.toggle("selected", selected);
      row.setAttribute("aria-selected", selected ? "true" : "false");
      if (selected) row.classList.remove("unread");
    });

    $(".reading-head h2").textContent = data.title;
    $(".reading-head p:last-child").textContent = data.meta;
    $(".reply-composer textarea").value = data.draft;
    $(".message-timeline").innerHTML = data.messages.map(messageHtml).join("");

    $(".identity-card h2").textContent = data.person;
    $(".identity-card > p:not(.eyebrow)").textContent = data.summary;
    $(".identity-card dl").innerHTML = Object.entries(data.details).map(([label, value]) => (
      `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    )).join("");
    $(".state-list").innerHTML = data.state.map((item, index) => (
      `<li${index === data.state.length - 1 ? ' class="waiting"' : ""}><span></span>${escapeHtml(item)}</li>`
    )).join("");
  }

  function rowMatches(row, filter, search) {
    const haystack = `${row.textContent} ${row.dataset.tags || ""}`.toLowerCase();
    const filterOk = filter === "All" || haystack.includes(filter.toLowerCase());
    const searchOk = !search || haystack.includes(search.toLowerCase());
    return filterOk && searchOk;
  }

  function applyFilter(filter, silent) {
    activeFilter = filter || "All";
    const search = $(".inbox-search input")?.value.trim() || "";
    let firstVisible = null;
    $$(".mail-row").forEach((row) => {
      const visible = rowMatches(row, activeFilter, search);
      row.hidden = !visible;
      if (visible && !firstVisible) firstVisible = row;
    });
    $$("[data-inbox-filter]").forEach((control) => {
      const active = control.dataset.inboxFilter === activeFilter;
      control.classList.toggle("active", active);
      control.classList.toggle("is-active", active);
      if (control.tagName === "BUTTON") control.setAttribute("aria-pressed", active ? "true" : "false");
    });
    $(".pane-title h2").textContent = activeFilter === "All" ? "Needs attention" : activeFilter;
    if (firstVisible && !$(".mail-row.selected:not([hidden])")) {
      renderThread(firstVisible.dataset.thread);
    }
    if (!silent) toast(`${activeFilter === "All" ? "All inbox" : activeFilter} filter applied`);
  }

  function appendToComposer(text) {
    const composer = $(".reply-composer textarea");
    composer.value = `${composer.value.trim()}\n\n${text}`;
    composer.focus();
  }

  function addTagToActive(label) {
    const row = $(`.mail-row[data-thread="${activeThread}"]`);
    if (!row) return;
    row.dataset.tags = `${row.dataset.tags || ""} ${label}`;
    const tags = $(".row-tags", row);
    if (tags && !tags.textContent.includes(label)) {
      const chip = document.createElement("span");
      chip.textContent = label;
      tags.appendChild(chip);
    }
  }

  function handleAction(action) {
    const textArea = $(".reply-composer textarea");
    if (action === "refresh") {
      toast(`Inbox refreshed at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
    } else if (action === "reply") {
      textArea.focus();
      toast("Composer focused");
    } else if (action === "snooze") {
      addTagToActive("Snoozed");
      threads[activeThread].state[threads[activeThread].state.length - 1] = "Snoozed for follow-up";
      renderThread(activeThread);
      toast("Thread snoozed");
    } else if (action === "archive") {
      addTagToActive("Archived");
      threads[activeThread].details["Next step"] = "Archived";
      renderThread(activeThread);
      toast("Thread archived");
    } else if (action === "attach-record") {
      appendToComposer("[Contact record attached]");
      toast("Record attached to draft");
    } else if (action === "insert-link") {
      appendToComposer("Private room: https://relay13.example/room/maya-carter");
      toast("Private room link inserted");
    } else if (action === "save-draft") {
      threads[activeThread].draft = textArea.value;
      $(".reply-composer").dataset.saved = "true";
      toast("Draft saved");
    } else if (action === "send-reply") {
      const body = textArea.value.trim();
      if (!body) {
        toast("Write a reply before sending");
        return;
      }
      threads[activeThread].messages.push(["operator", "Relay13 operator", "Now", body]);
      threads[activeThread].draft = "";
      renderThread(activeThread);
      textArea.value = "";
      addTagToActive("Replied");
      toast("Reply sent into the thread");
    }
  }

  $$(".mail-row").forEach((row) => {
    row.addEventListener("click", () => renderThread(row.dataset.thread));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        renderThread(row.dataset.thread);
      }
    });
  });

  $$("[data-inbox-filter]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      applyFilter(control.dataset.inboxFilter);
    });
  });

  $$(".actual-inbox-page [data-inbox-action]").forEach((control) => {
    control.addEventListener("click", () => handleAction(control.dataset.inboxAction));
  });

  $(".inbox-search input")?.addEventListener("input", () => applyFilter(activeFilter, true));
  renderThread(activeThread);
  applyFilter("All", true);
})();
