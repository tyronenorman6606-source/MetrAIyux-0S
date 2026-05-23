const env = globalThis.process?.env || {};

export const PUBLIC_PROVIDER_NAME = env.KAIXU_PUBLIC_PROVIDER_NAME || "Skyes Over London";

const MODEL_BY_PROVIDER = {
  "openai::gpt-4o-mini": "kaixu-6.7-mini",
  "openai::gpt-4o": "kaixu-6.7",
  "gemini::gemini-2.5-flash": "kaixu-6.7-nano",
  "gemini::gemini-embedding-001": "kaixu-6.7-embed",
  "anthropic::claude-3-5-sonnet-20241022": "kaixu-6.7-pro",
  "anthropic::claude-opus-4-6": "kaixu-6.7-max"
};

const MODEL_ONLY = {
  "gpt-4o-mini": "kaixu-6.7-mini",
  "gpt-4o": "kaixu-6.7",
  "gemini-2.5-flash": "kaixu-6.7-nano",
  "gemini-embedding-001": "kaixu-6.7-embed",
  "claude-3-5-sonnet-20241022": "kaixu-6.7-pro",
  "claude-opus-4-6": "kaixu-6.7-max"
};

export function publicModelName(provider, model) {
  const rawModel = String(model || "").trim();
  if (!rawModel) return "kaixu-6.7";
  if (/^kaixu(?:[-/]|$)/i.test(rawModel)) return rawModel;
  const key = `${String(provider || "").trim().toLowerCase()}::${rawModel}`;
  return MODEL_BY_PROVIDER[key] || MODEL_ONLY[rawModel] || "kaixu-6.7";
}

export function publicAllowedModels(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return null;
  const out = new Set();
  for (const [provider, models] of Object.entries(policy)) {
    const values = Array.isArray(models) ? models : [models];
    for (const model of values) {
      if (model === "*") {
        out.add("kaixu-6.7");
        out.add("kaixu-6.7-pro");
        out.add("kaixu-6.7-max");
      } else {
        out.add(publicModelName(provider, model));
      }
    }
  }
  return out.size ? { [PUBLIC_PROVIDER_NAME]: Array.from(out) } : null;
}

export function publicProviderPolicy(policy = null) {
  if (!policy) return null;
  return {
    source: policy.source || "gate",
    values: [PUBLIC_PROVIDER_NAME]
  };
}
