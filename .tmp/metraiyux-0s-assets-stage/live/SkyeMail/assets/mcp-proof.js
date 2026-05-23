(async () => {
  const qs = (selector) => document.querySelector(selector);
  const set = (selector, value) => {
    const node = qs(selector);
    if (node) node.textContent = value;
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
    const response = await fetch("/proof/skymail-mcp-proof.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Build receipt is not published yet (${response.status}).`);
    const proof = await response.json();
    const ok = Boolean(proof.ok);
    set("[data-mcp-status]", ok ? "Passed" : "Needs attention");
    set("[data-mcp-title]", ok ? "SkyeMail passed the release gate." : "SkyeMail release gate needs attention.");
    set("[data-mcp-summary]", `Receipt ${safe(proof.run_id)} completed at ${safe(proof.completed_at)} with ${proof.resources_read?.length || 0} resource checks and ${proof.tools_called?.length || 0} tool checks.`);
    set("[data-mcp-logo]", proof.logo_asset || "No logo asset recorded");
    set("[data-mcp-audit]", proof.audits?.logo?.ok ? "Approved platform logo asset detected" : "Logo audit needs attention");
    set("[data-mcp-resources]", `${proof.resources_read?.length || 0} resource checks completed`);
    set("[data-mcp-gate]", proof.audits?.quality_gate?.ok ? "Quality gate receipt present" : "Quality gate missing");
    const callBox = qs("[data-mcp-calls]");
    if (callBox) {
      const calls = [
        { label: "Logo", value: proof.audits?.logo?.ok ? "Approved SkyeMail logo asset detected" : "Logo check needs attention", status: proof.audits?.logo?.ok ? "Passed" : "Review" },
        { label: "Design", value: proof.audits?.design_validate?.ok ? "Public surface validation passed" : "Surface validation needs attention", status: proof.audits?.design_validate?.ok ? "Passed" : "Review" },
        { label: "Motion", value: proof.audits?.effects?.ok ? "Motion, browser proof, and surface effects are present" : "Motion/effect check needs attention", status: proof.audits?.effects?.ok ? "Passed" : "Review" },
        { label: "Performance", value: proof.audits?.performance?.ok ? "Performance guardrails passed" : "Performance check needs attention", status: proof.audits?.performance?.ok ? "Passed" : "Review" },
        { label: "Browser", value: proof.audits?.e2e_proof?.ok ? "Browser proof and playback receipt present" : "Browser proof needs attention", status: proof.audits?.e2e_proof?.ok ? "Passed" : "Review" },
      ];
      callBox.innerHTML = calls.map((call) => `
        <article class="proof-item">
          <b>${escapeHtml(call.label)}</b>
          <span>${escapeHtml(call.value)}</span><br>
          <span class="status-ok">${escapeHtml(call.status)}</span>
        </article>
      `).join("");
    }
    set("[data-mcp-json]", JSON.stringify(proof, null, 2));
  } catch (error) {
    set("[data-mcp-status]", "No receipt");
    set("[data-mcp-title]", "No published build receipt yet.");
    set("[data-mcp-summary]", error.message || "Build JSON could not be loaded.");
    set("[data-mcp-json]", JSON.stringify({ ok: false, error: error.message || "Build JSON could not be loaded." }, null, 2));
  }
})();
