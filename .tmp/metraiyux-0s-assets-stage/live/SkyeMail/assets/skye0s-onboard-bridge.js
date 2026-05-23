(function () {
  "use strict";

  const CLAIM_KEYS = [
    "skye0s.skyemail.claim.v1",
    "SMV_ONBOARDING_CLAIM",
    "kx.onboarding.emailDraft",
  ];

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function firstClaim() {
    for (const key of CLAIM_KEYS) {
      const value = readJson(key);
      if (!value) continue;
      if (value.mailbox && (value.mailbox.requested_email || value.mailbox.local_part)) return value;
      if (value.email) {
        const parts = String(value.email).toLowerCase().split("@");
        return {
          source: value.source || key,
          mailbox: {
            requested_email: value.email,
            local_part: parts[0] || "",
            domain: parts.slice(1).join("@") || "",
          },
          profile: {
            display_name: "",
            org_name: "",
            recovery_email: "",
          },
        };
      }
    }
    return null;
  }

  function setValue(selector, value) {
    const el = document.querySelector(selector);
    if (!el || value == null || value === "") return;
    if (document.activeElement === el && el.value) return;
    el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setSelectValue(selector, value) {
    const el = document.querySelector(selector);
    if (!el || value == null || value === "") return;
    const next = String(value);
    if (![...el.options].some((option) => option.value === next)) {
      const option = document.createElement("option");
      option.value = next;
      option.textContent = next;
      el.appendChild(option);
    }
    el.value = next;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function showBridgeNotice(claim) {
    if (document.querySelector("[data-skye0s-bridge-notice]")) return;
    const target = document.querySelector(".main .card, .container .card, main .card");
    if (!target || !claim.mailbox || !claim.mailbox.requested_email) return;
    const notice = document.createElement("div");
    notice.setAttribute("data-skye0s-bridge-notice", "true");
    notice.className = "notice";
    notice.style.marginBottom = "12px";
    notice.textContent =
      "SkyeGate FS27 staged this mailbox claim. SkyeMail will now bind it to the backend workspace, alias route, and provider or local proof lane.";
    target.insertBefore(notice, target.firstChild);
  }

  function applyClaim() {
    const claim = firstClaim();
    if (!claim || !claim.mailbox) return null;

    const mailbox = claim.mailbox || {};
    const profile = claim.profile || {};
    const localPart = mailbox.local_part || String(mailbox.requested_email || "").split("@")[0] || "";
    const domain = mailbox.domain || String(mailbox.requested_email || "").split("@").slice(1).join("@") || "";

    if (localPart) localStorage.setItem("SMV_HANDLE", localPart);
    localStorage.setItem("SMV_ONBOARDING_CLAIM", JSON.stringify(claim));

    setValue("#handle", localPart);
    setValue("#mailboxLocalPart", localPart);
    setSelectValue("#mailboxDomain", domain);
    setValue("#display_name", profile.display_name || localPart);
    setValue("#profile_company", profile.org_name || "");
    setValue("#preferred_from_alias", mailbox.requested_email || "");

    showBridgeNotice(claim);
    window.dispatchEvent(new CustomEvent("skye0s:skyemail-claim-applied", { detail: claim }));
    return claim;
  }

  window.Skye0SSkyEmailBridge = { applyClaim, firstClaim };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyClaim, { once: true });
  } else {
    applyClaim();
  }
  window.addEventListener("storage", (event) => {
    if (CLAIM_KEYS.includes(event.key)) applyClaim();
  });
})();
