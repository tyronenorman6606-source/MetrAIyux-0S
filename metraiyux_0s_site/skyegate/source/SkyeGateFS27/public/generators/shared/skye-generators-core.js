(function (root) {
  "use strict";

  const firstNames = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
    "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Lisa", "Daniel", "Nancy",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Elena", "Mateo", "Sofia", "Lucas", "Aria", "Jackson", "Mia", "Oliver",
    "Alexander", "Isabella", "Ethan", "Sophia", "Marcus", "Victoria", "Julian", "Grace"
  ];

  const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Chen", "Patel", "Nguyen", "Kim", "Singh", "Ali", "Wong", "Cohen", "Silva",
    "Sterling", "Lancaster", "Dupont", "Rothschild", "Kensington", "Sinclair", "Vance"
  ];

  const skyEmailAdjectives = [
    "swift", "cool", "dark", "light", "super", "mega", "hyper", "blue", "red", "green",
    "sly", "brave", "clever", "lucky", "quiet", "bold", "fuzzy", "wild", "calm", "neon"
  ];

  const skyEmailNouns = [
    "fox", "cat", "dog", "lion", "tiger", "bear", "wolf", "dragon", "eagle", "shark",
    "falcon", "viper", "panda", "koala", "hawk", "raven", "owl", "lynx", "puma", "byte"
  ];

  const DEFAULT_SKYEMAIL_DOMAIN = "solenterprises.org";

  const nowIso = () => new Date().toISOString();
  const cleanText = (value, max = 240) => String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const randomSource = (random) => typeof random === "function" ? random : Math.random;
  const pick = (items, random) => items[Math.floor(randomSource(random)() * items.length)] || items[0] || "";

  function normalizeSkyeId(value) {
    const raw = String(value || "").trim();
    const digits = raw.replace(/\D/g, "");
    return digits.length === 10 ? digits : raw.replace(/[^\w-]/g, "").slice(0, 64);
  }

  function generateSkyeIdNumber(random) {
    const rand = randomSource(random);
    let num = "";
    num += Math.floor(rand() * 9) + 1;
    for (let i = 0; i < 9; i += 1) num += Math.floor(rand() * 10);
    return num;
  }

  function createSkyeIdDraft(input = {}) {
    const name = cleanText(input.name || input.display_name || input.displayName || "Unknown Entity", 120);
    const idNumber = cleanText(input.idNumber || input.id_number || input.skyeId || input.skye_id || generateSkyeIdNumber(input.random), 80);
    const skyeId = normalizeSkyeId(idNumber);
    return {
      schema: "skye0s.identity.v1",
      name,
      display_name: name,
      idNumber,
      skyeId,
      identityId: skyeId || idNumber,
      profileType: cleanText(input.profileType || input.profile_type || "artist", 60).toLowerCase(),
      phone: cleanText(input.phone || "", 40),
      photoDataUrl: input.photoDataUrl || "",
      photoName: input.photoName || "",
      photoType: input.photoType || "",
      photoUpdatedAt: input.photoDataUrl ? nowIso() : input.photoUpdatedAt || "",
      source: "Skye-ID",
      reason: input.reason || "generate",
      updatedAt: input.updatedAt || nowIso()
    };
  }

  function generateSkyeIdentity(input = {}) {
    const rand = randomSource(input.random);
    return createSkyeIdDraft({
      ...input,
      name: input.name || `${pick(firstNames, rand)} ${pick(lastNames, rand)}`,
      idNumber: input.idNumber || generateSkyeIdNumber(rand),
      reason: input.reason || "generate"
    });
  }

  function normalizeSkyEmailLocalPart(value) {
    return String(value == null ? "" : value).replace(/\s+/g, "");
  }

  function normalizeSkyEmailDomain(value) {
    return String(value || DEFAULT_SKYEMAIL_DOMAIN).replace(/[^a-zA-Z0-9.-]/g, "") || DEFAULT_SKYEMAIL_DOMAIN;
  }

  function generateSkyEmailPrefix(random) {
    const rand = randomSource(random);
    const adj = pick(skyEmailAdjectives, rand);
    const noun = pick(skyEmailNouns, rand);
    const num = Math.floor(rand() * 900) + 100;
    const separator = rand() > 0.6 ? "_" : rand() > 0.5 ? "." : "";
    return `${adj}${separator}${noun}${num}`;
  }

  function splitSkyEmail(value = "") {
    const text = String(value || "").trim();
    const parts = text.includes("@") ? text.split("@") : [];
    return {
      localPart: parts[0] || "",
      domain: parts.slice(1).join("@") || ""
    };
  }

  function createSkyEmailClaim(input = {}) {
    const requested = splitSkyEmail(input.email || input.skyemail || input.skyEmail || input.requested_email || "");
    const localPart = normalizeSkyEmailLocalPart(input.local_part || input.localPart || requested.localPart || generateSkyEmailPrefix(input.random));
    const domain = normalizeSkyEmailDomain(input.domain || requested.domain || DEFAULT_SKYEMAIL_DOMAIN);
    const email = `${localPart}@${domain}`;
    return {
      schema: "skye0s.skyemail.claim.v1",
      email,
      prefix: localPart,
      local_part: localPart,
      domain,
      mailbox: {
        requested_email: email,
        local_part: localPart,
        domain
      },
      profile: {
        display_name: cleanText(input.display_name || input.displayName || input.name || "", 120),
        recovery_email: cleanText(input.recovery_email || input.recoveryEmail || input.login_email || input.emailLogin || "", 240).toLowerCase(),
        phone: cleanText(input.phone || "", 40),
        profile_type: cleanText(input.profile_type || input.profileType || "", 60).toLowerCase(),
        source: "SKYEMAIL-GEN"
      },
      source: "SKYEMAIL-GEN",
      reason: input.reason || "generate",
      updatedAt: input.updatedAt || nowIso()
    };
  }

  root.SkyeGateGenerators = {
    version: "2026-05-25.canonical-skye-id-skyemail-gen",
    firstNames,
    lastNames,
    skyEmailAdjectives,
    skyEmailNouns,
    DEFAULT_SKYEMAIL_DOMAIN,
    normalizeSkyeId,
    generateSkyeIdNumber,
    createSkyeIdDraft,
    generateSkyeIdentity,
    normalizeSkyEmailLocalPart,
    normalizeSkyEmailDomain,
    generateSkyEmailPrefix,
    splitSkyEmail,
    createSkyEmailClaim
  };
})(globalThis);
