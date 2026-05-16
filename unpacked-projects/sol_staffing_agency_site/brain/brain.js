class SOLLocalBrain {
  constructor(corpus) {
    this.corpus = corpus;
    this.historyKey = "solBrainHistory";
    this.profileKey = "solBrainProfile";
    this.notesKey = "solBrainNotes";
  }

  normalize(text) {
    return String(text || "").toLowerCase().trim();
  }

  tokens(text) {
    return this.normalize(text).split(/[^a-z0-9$%.@/-]+/).filter(Boolean);
  }

  getMemory() {
    return {
      profile: JSON.parse(localStorage.getItem(this.profileKey) || "{}"),
      notes: JSON.parse(localStorage.getItem(this.notesKey) || "[]"),
      history: JSON.parse(localStorage.getItem(this.historyKey) || "[]")
    };
  }

  saveHistory(user, assistant) {
    const history = JSON.parse(localStorage.getItem(this.historyKey) || "[]");
    history.push({ at: new Date().toISOString(), user, assistant });
    localStorage.setItem(this.historyKey, JSON.stringify(history.slice(-50)));
  }

  saveProfileField(key, value) {
    const profile = JSON.parse(localStorage.getItem(this.profileKey) || "{}");
    profile[key] = value;
    localStorage.setItem(this.profileKey, JSON.stringify(profile));
  }

  addNote(note) {
    const notes = JSON.parse(localStorage.getItem(this.notesKey) || "[]");
    notes.push({ at: new Date().toISOString(), note });
    localStorage.setItem(this.notesKey, JSON.stringify(notes.slice(-100)));
  }

  clearMemory() {
    localStorage.removeItem(this.profileKey);
    localStorage.removeItem(this.notesKey);
    localStorage.removeItem(this.historyKey);
  }

  scoreKeywords(input, keywords) {
    const text = this.normalize(input);
    return keywords.reduce((score, kw) => score + (text.includes(this.normalize(kw)) ? 1 : 0), 0);
  }

  findService(input) {
    let best = null;
    for (const service of this.corpus.services || []) {
      const score = this.scoreKeywords(input, service.keywords || []);
      if (!best || score > best.score) best = { ...service, score };
    }
    return best && best.score > 0 ? best : null;
  }

  findRoute(input) {
    let best = null;
    for (const route of this.corpus.routing || []) {
      const score = this.scoreKeywords(input, route.keywords || []);
      if (!best || score > best.score) best = { ...route, score };
    }
    return best && best.score > 0 ? best : null;
  }

  detectIntakeType(input) {
    const text = this.normalize(input);
    if (/government|prime|subcontract|rfp|rfq|sam|uei|cage|naics|municipal/.test(text)) return "government";
    if (/candidate|apply|resume|looking for work|job seeker|availability/.test(text)) return "candidate";
    if (/ae|account executive|commission|sales rep/.test(text)) return "ae";
    return "employer";
  }

  intakeChecklist(type) {
    const items = (this.corpus.intake_requirements || {})[type] || [];
    return items.map(item => `• ${item}`).join("\n");
  }

  safeClaimReminder(input) {
    const text = this.normalize(input);
    if (/government|sam|uei|cage|certif|gsa|8\(a\)|sdvosb|wosb|hubzone|bond|insurance|federal/.test(text)) {
      return "\n\nSafe-claim reminder: do not claim UEI, CAGE, SAM registration, certifications, GSA Schedule, set-aside status, bonding, insurance, clearance, or past federal awards unless verified.";
    }
    if (/testimonial|case study|proof|client win/.test(text)) {
      return "\n\nProof reminder: publish only verified outcomes and approved testimonials. No fake case studies.";
    }
    if (/job opening|hiring now|open role|apply/.test(text)) {
      return "\n\nJobs reminder: advertise only real openings or clearly label candidate pools.";
    }
    return "";
  }

  answer(input) {
    const clean = this.normalize(input);
    const memory = this.getMemory();

    if (!clean) return "Ask me about staffing models, job orders, candidate screening, government contracting readiness, AE sales, pricing models, or which page/form to use.";

    if (/clear.*memory|reset.*brain|forget/.test(clean)) {
      this.clearMemory();
      return "Local brain memory cleared from this browser.";
    }

    if (/remember that|save note|note that/.test(clean)) {
      const note = input.replace(/^(remember that|save note|note that)\s*/i, "").trim();
      if (note) {
        this.addNote(note);
        return `Saved locally in this browser: “${note}”`;
      }
    }

    const nameMatch = input.match(/(?:my name is|i am|i'm)\s+([a-zA-Z][a-zA-Z\s'-]{1,60})/i);
    if (nameMatch) {
      this.saveProfileField("name", nameMatch[1].trim());
      return `Saved locally in this browser. Name: ${nameMatch[1].trim()}`;
    }

    if (/what do you remember|show memory|memory/.test(clean)) {
      return `Local browser memory:\n\nProfile:\n${JSON.stringify(memory.profile, null, 2)}\n\nNotes:\n${(memory.notes || []).map(n => `• ${n.note}`).join("\n") || "No notes saved."}`;
    }

    if (/job order|what.*need.*employer|employer intake|intake/.test(clean)) {
      return `Employer job-order checklist:\n${this.intakeChecklist("employer")}\n\nUse the employer intake page or job-order template.`;
    }

    if (/candidate screen|screen candidate|candidate intake|apply/.test(clean)) {
      return `Candidate screening checklist:\n${this.intakeChecklist("candidate")}\n\nUse candidate-application.html or recruiter-desk.html for internal screening.`;
    }

    if (/government|prime|subcontract|rfp|rfq|sam|uei|cage|naics/.test(clean)) {
      return `Government / prime pursuit checklist:\n${this.intakeChecklist("government")}\n\nRecommended pages: government.html, capability-statement.html, procurement-packet.html, government-opportunities.html, and government-go-no-go-template.md.${this.safeClaimReminder(input)}`;
    }

    if (/script|call|email|opener|pitch/.test(clean)) {
      return `Useful scripts:\n\nEmployer opener:\n${this.corpus.quick_scripts.employer_opener}\n\nJob-order close:\n${this.corpus.quick_scripts.job_order_close}\n\nPrime opener:\n${this.corpus.quick_scripts.prime_opener}`;
    }

    const service = this.findService(input);
    const route = this.findRoute(input);

    let response = "";
    if (service) response += `${service.name}:\n${service.answer}\n`;
    else response += "I can help route this staffing question using the local site brain.\n";

    if (route) {
      response += `\nRecommended route: ${route.cta} → ${route.page}`;
    } else {
      const type = this.detectIntakeType(input);
      response += `\nSuggested intake checklist (${type}):\n${this.intakeChecklist(type)}`;
    }

    response += this.safeClaimReminder(input);
    this.saveHistory(input, response);
    return response;
  }
}

async function bootSOLBrain() {
  const output = document.getElementById("brainOutput");
  const input = document.getElementById("brainInput");
  const askBtn = document.getElementById("brainAsk");
  const askLiveBtn = document.getElementById("brainAskLive");
  const chips = document.querySelectorAll("[data-brain-prompt]");
  const clearBtn = document.getElementById("brainClear");
  const memoryBox = document.getElementById("brainMemory");

  if (!output || !input || !askBtn) return;

  let corpus = null;
  try {
    const res = await fetch("./brain/brain-corpus.json");
    corpus = await res.json();
  } catch (err) {
    corpus = window.SOL_BRAIN_FALLBACK || { services: [], routing: [], intake_requirements: {} };
  }

  const brain = new SOLLocalBrain(corpus);

  function refreshMemory() {
    if (!memoryBox) return;
    const memory = brain.getMemory();
    memoryBox.textContent = JSON.stringify(memory, null, 2);
  }

  function ask(prompt) {
    const question = prompt || input.value;
    const answer = brain.answer(question);
    output.innerHTML += `<div class="brain-msg user"><strong>You</strong><pre></pre></div>`;
    output.lastElementChild.querySelector("pre").textContent = question;
    output.innerHTML += `<div class="brain-msg assistant"><strong>SOL Brain</strong><pre></pre></div>`;
    output.lastElementChild.querySelector("pre").textContent = answer;
    input.value = "";
    output.scrollTop = output.scrollHeight;
    refreshMemory();
  }

  async function askLive() {
    const question = input.value;
    if (!question.trim()) return;
    output.innerHTML += `<div class="brain-msg user"><strong>You</strong><pre></pre></div>`;
    output.lastElementChild.querySelector("pre").textContent = question;
    output.innerHTML += `<div class="brain-msg assistant"><strong>Live SOL Brain</strong><pre>Contacting authenticated GPU/Ollama endpoint...</pre></div>`;
    const liveNode = output.lastElementChild.querySelector("pre");
    input.value = "";
    output.scrollTop = output.scrollHeight;

    try {
      const res = await fetch("/.netlify/functions/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ prompt: question })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.answer || `HTTP ${res.status}`);
      liveNode.textContent = data.answer || "No answer returned.";
    } catch (error) {
      liveNode.textContent = `${error.message || "Live brain unavailable"}\n\nLocal fallback:\n${brain.answer(question)}`;
    }
  }

  askBtn.addEventListener("click", () => ask());
  if (askLiveBtn) askLiveBtn.addEventListener("click", askLive);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
  });

  chips.forEach(chip => chip.addEventListener("click", () => ask(chip.dataset.brainPrompt)));
  if (clearBtn) clearBtn.addEventListener("click", () => {
    brain.clearMemory();
    refreshMemory();
    output.innerHTML += `<div class="brain-msg assistant"><strong>SOL Brain</strong><pre>Local memory cleared.</pre></div>`;
  });

  refreshMemory();
  output.innerHTML = `<div class="brain-msg assistant"><strong>SOL Brain</strong><pre>Local brain loaded. Ask about staffing, job orders, candidates, government contracting, AE scripts, pricing, routing, or safe claims.</pre></div>`;
}

window.addEventListener("DOMContentLoaded", bootSOLBrain);
