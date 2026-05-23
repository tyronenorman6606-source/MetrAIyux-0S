function text(value, max = 400) {
  return String(value ?? "").trim().slice(0, max);
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function buildContext(brief = {}, runtime = {}, room = "builder") {
  const pages = array(brief.pages);
  const template = text(brief.templateId || brief.template || "starter-fallback", 80);
  return {
    room,
    projectName: text(brief.projectName || "Untitled project", 120),
    businessType: text(brief.businessType || "general", 80),
    offer: text(brief.offer || "", 180),
    audience: text(brief.audience || "", 180),
    pagesRequested: pages,
    pageCount: pages.length,
    template,
    htmlChars: Number(brief.metrics?.htmlChars || 0),
    cssChars: Number(brief.metrics?.cssChars || 0),
    jsChars: Number(brief.metrics?.jsChars || 0),
    runtimeOnline: Boolean(runtime.ok),
    deliveryPacks: Number(runtime.deliveryPacks || 0),
    reviewBoard: runtime.reviewBoard || {},
    executionBoard: runtime.executionBoard || {},
    dispatchBoard: runtime.dispatchBoard || {}
  };
}

function collectIssues(brief = {}, runtime = {}) {
  const issues = [];
  const ctx = buildContext(brief, runtime);
  if (!text(ctx.projectName) || ctx.projectName === "Untitled project") {
    issues.push({ title: "Project identity is missing", detail: "Name the project before you generate or hand it off." });
  }
  if (!ctx.offer) {
    issues.push({ title: "Offer is thin", detail: "Auren needs a sharper offer to shape the homepage, CTA stack, and proof blocks." });
  }
  if (!ctx.audience) {
    issues.push({ title: "Audience is undefined", detail: "Without a target buyer or user, the builder will drift generic." });
  }
  if (ctx.pageCount < 3) {
    issues.push({ title: "Page map is too small", detail: "Add a few required pages so the package feels like a real website, not a hero-only stub." });
  }
  if (ctx.htmlChars < 3000) {
    issues.push({ title: "Markup is too light", detail: "The current source still reads like a shell. Expand sections, proof, and conversion surfaces." });
  }
  if (!ctx.runtimeOnline) {
    issues.push({ title: "Runtime is offline", detail: "The local runtime needs to be up for delivery packs, proof logging, and Auren ops." });
  }
  return issues.slice(0, 5);
}

function buildActions(brief = {}, runtime = {}, room = "builder") {
  const ctx = buildContext(brief, runtime, room);
  const actions = [];
  if (!ctx.offer || !ctx.audience) {
    actions.push({ label: "Tighten the brief", room: "briefs", reason: "Define offer, audience, and desired pages before styling deeper." });
  }
  if (ctx.htmlChars < 3000) {
    actions.push({ label: "Expand the builder output", room: "builder", reason: "Add more real sections before packaging or previewing." });
  }
  if (!ctx.runtimeOnline) {
    actions.push({ label: "Bring runtime online", room: "runtime", reason: "The runtime powers delivery packs, session proof, and operator logging." });
  } else {
    actions.push({ label: "Queue a delivery proof", room: "delivery", reason: "Push the latest state into the handoff board and confirm it survives the runtime." });
  }
  actions.push({ label: "Preview the generated site", room: "preview", reason: "Check the build in-frame before export or handoff." });
  return actions.slice(0, 5);
}

function deterministicReply(message = "", brief = {}, runtime = {}, room = "builder") {
  const ctx = buildContext(brief, runtime, room);
  const issues = collectIssues(brief, runtime);
  const actions = buildActions(brief, runtime, room);
  const reply = [
    `I’m looking at ${ctx.projectName || "this project"} from the ${room} lane.`,
    ctx.offer
      ? `The offer is ${ctx.offer}.`
      : "The offer still needs to be stated directly so the build can stop sounding generic.",
    ctx.pageCount
      ? `We currently have ${ctx.pageCount} page target${ctx.pageCount === 1 ? "" : "s"} and template ${ctx.template}.`
      : "We still need a real page map before this becomes a serious package.",
    ctx.runtimeOnline
      ? `Runtime is online with ${ctx.deliveryPacks} delivery pack${ctx.deliveryPacks === 1 ? "" : "s"} in circulation.`
      : "Runtime is offline right now, so proof and delivery are not trustworthy yet."
  ].join(" ");

  return {
    ok: true,
    assistant: "Auren",
    engine: "webcreator-context-fallback",
    reply,
    context: ctx,
    issues,
    actions,
    prompts: [
      `What should we add next to make ${ctx.projectName || "this website"} feel premium and complete?`,
      `How should the homepage for ${ctx.projectName || "this website"} convert better?`,
      "What is still missing before this is safe to deliver?"
    ]
  };
}

async function maybeCallOpenAI({ message = "", brief = {}, runtime = {}, room = "builder", env = {}, allowLiveAi = false } = {}) {
  if (!allowLiveAi) return null;
  const apiKey = env.OPENAI_API_KEY || "";
  const allow = String(env.VANTA_ALLOW_LIVE_AI ?? "0") === "1" || Boolean(env.forceLiveAi);
  const disable = String(env.VANTA_DISABLE_LIVE_AI ?? "0") === "1";
  if (!apiKey || !allow || disable) return null;

  const baseUrl = String(env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = String(env.OPENAI_MODEL || "gpt-4.1-mini");
  const draft = deterministicReply(message, brief, runtime, room);
  const system = [
    "You are Auren, the embedded website-builder operator inside SkyeWebCreatorMax.",
    "Help the operator turn briefs into real client-ready websites and handoff packs.",
    "Stay concise, practical, and grounded in the supplied brief and runtime state.",
    "Return strict JSON with keys: reply, issues, actions.",
    "issues must be an array of up to 5 objects with title and detail.",
    "actions must be an array of up to 5 objects with label, room, and reason."
  ].join(" ");

  const payload = {
    room,
    message,
    brief: buildContext(brief, runtime, room),
    currentIssues: collectIssues(brief, runtime),
    draft
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(payload) }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(`OpenAI ${response.status}: ${error || response.statusText}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  return {
    ok: true,
    assistant: "Auren",
    engine: `openai:${model}`,
    reply: text(parsed.reply, 2800) || draft.reply,
    context: draft.context,
    issues: array(parsed.issues).map((issue) => ({
      title: text(issue.title, 160),
      detail: text(issue.detail, 500),
      severity: text(issue.severity || "warn", 40)
    })).filter((issue) => issue.title),
    actions: array(parsed.actions).map((action) => ({
      label: text(action.label, 120),
      room: text(action.room, 40),
      reason: text(action.reason, 240)
    })).filter((action) => action.label),
    prompts: draft.prompts
  };
}

export async function generateWebCreatorAurenReply({
  message = "",
  brief = {},
  runtime = {},
  room = "builder",
  env = {},
  allowLiveAi = false
} = {}) {
  const draft = deterministicReply(message, brief, runtime, room);
  try {
    const live = await maybeCallOpenAI({ message, brief, runtime, room, env, allowLiveAi });
    return live || draft;
  } catch (error) {
    return {
      ...draft,
      engine: `${draft.engine}+fallback`,
      note: text(error.message, 320)
    };
  }
}
