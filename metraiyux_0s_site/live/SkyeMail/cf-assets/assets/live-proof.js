(async () => {
  const qs = (selector) => document.querySelector(selector);
  const set = (selector, value) => {
    const node = qs(selector);
    if (node) node.textContent = value;
  };
  const playProofVideo = () => {
    const video = qs(".proof-video");
    if (!video) return;
    video.muted = true;
    video.playsInline = true;
    const seekToProofFrame = () => {
      if (Number.isFinite(video.duration) && video.duration > 9 && video.currentTime < 7.5) {
        video.currentTime = Math.min(8, video.duration - 0.8);
      }
    };
    if (video.readyState >= 1) seekToProofFrame();
    else video.addEventListener("loadedmetadata", seekToProofFrame, { once: true });
    video.addEventListener("timeupdate", () => {
      if (Number.isFinite(video.duration) && video.duration > 9 && video.currentTime > 9.2) {
        video.currentTime = Math.min(8, video.duration - 0.8);
      }
    });
    video.play?.().catch(() => {});
  };
  const safe = (value) => String(value ?? "");
  const escapeHtml = (value) => safe(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));
  try {
    const response = await fetch("/proof/live-email-proof.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Proof receipt is not published yet (${response.status}).`);
    const proof = await response.json();
    const ok = Boolean(proof.ok);
    set("[data-proof-status]", ok ? "Passed" : "Needs attention");
    set("[data-proof-title]", ok ? "SkyeMail passed the two-way proof run." : "SkyeMail proof run needs attention.");
    set("[data-proof-summary]", `Run ${safe(proof.run_id)} completed at ${safe(proof.completed_at)} on ${safe(proof.domain)} through ${safe(proof.provider || "the active provider")}.`);
    const ab = proof.runs?.[0];
    const ba = proof.runs?.[1];
    const confirmed = (run) => Boolean(run?.imported_to_inbox || run?.provider_inbox_visible);
    const providerId = (run) => run?.zoho_id || run?.resend_id || run?.provider_message_id || "";
    set("[data-proof-ab]", confirmed(ab) ? `Inbox confirmed ${ab.imported_message_id || ab.provider_message_id || ""}` : "Inbox not confirmed");
    set("[data-proof-ba]", confirmed(ba) ? `Inbox confirmed ${ba.imported_message_id || ba.provider_message_id || ""}` : "Inbox not confirmed");
    const runBox = qs("[data-proof-runs]");
    if (runBox) {
      runBox.innerHTML = (proof.runs || []).map((run) => `
        <article class="proof-item">
          <b>${escapeHtml(run.label)}</b>
          <span>${escapeHtml(run.from)} to ${escapeHtml(run.to)}</span><br>
          <span>Subject: ${escapeHtml(run.subject)}</span><br>
          <span>Provider: ${escapeHtml(run.provider || proof.provider || "active provider")}</span><br>
          <span>Provider ID: ${escapeHtml(providerId(run))}</span><br>
          <span class="${confirmed(run) ? "status-ok" : "status-warn"}">${confirmed(run) ? "Provider-backed inbox confirmed" : "Inbox confirmation missing"}</span>
        </article>
      `).join("");
    }
    set("[data-proof-json]", JSON.stringify(proof, null, 2));
    playProofVideo();
  } catch (error) {
    set("[data-proof-status]", "No proof");
    set("[data-proof-title]", "No published live proof receipt yet.");
    set("[data-proof-summary]", error.message || "Proof JSON could not be loaded.");
    set("[data-proof-json]", JSON.stringify({ ok: false, error: error.message || "Proof JSON could not be loaded." }, null, 2));
    playProofVideo();
  }
})();
