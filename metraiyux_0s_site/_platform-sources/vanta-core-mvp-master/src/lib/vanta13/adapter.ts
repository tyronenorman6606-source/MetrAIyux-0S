import { env } from "@/lib/env";
import { firstEnv, isLocalRuntime } from "@/lib/runtime-env";

export interface Vanta13Decision {
  intent: string;
  confidence: number;
  callerType: "lead" | "customer" | "vendor" | "spam" | "unknown";
  leadQuality?: number;
  urgency?: "low" | "normal" | "high" | "emergency";
  recommendedAction: string;
  shouldInterruptOwner: boolean;
  shouldBook: boolean;
  shouldFollowUp: boolean;
  shouldBlock: boolean;
  shouldRouteToVendor: boolean;
  serviceAreaMatch?: boolean;
  missingFields: string[];
  summary: string;
  nextMessage: string;
}

export interface Vanta13Adapter {
  classify(input: {
    text: string;
    context?: unknown;
    businessPack?: string;
  }): Promise<Vanta13Decision>;
}

export function createVanta13Adapter(): Vanta13Adapter {
  const mode = firstEnv("VANTA13_MODE")?.toLowerCase();
  if (mode === "deterministic" || mode === "mock") return new MockVanta13Adapter();
  if (env.vanta13Endpoint) return new RemoteVanta13Adapter(env.vanta13Endpoint);
  if (env.openAIKey && firstEnv("VANTA13_OPENAI_MODEL")) return new OpenAIVanta13Adapter();
  if (env.isProduction && !isLocalRuntime()) {
    throw new Error("VANTA13 classifier is not configured. Set VANTA13_CLOUDFLARE_WORKER_URL or VANTA13_MODE=deterministic for local-only testing.");
  }
  return new MockVanta13Adapter();
}

class RemoteVanta13Adapter implements Vanta13Adapter {
  constructor(private endpoint: string) {}

  async classify(input: { text: string; context?: unknown; businessPack?: string }): Promise<Vanta13Decision> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(input),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`VANTA13 worker rejected classify request with ${response.status}`);
    }
    return normalizeDecision(body.decision || body);
  }
}

class OpenAIVanta13Adapter implements Vanta13Adapter {
  async classify(input: { text: string; context?: unknown; businessPack?: string }): Promise<Vanta13Decision> {
    const model = firstEnv("VANTA13_OPENAI_MODEL");
    if (!model) throw new Error("VANTA13_OPENAI_MODEL is required for OpenAI classifier mode.");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.openAIKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Classify service-business intake. Return only JSON matching: intent, confidence, callerType, leadQuality, urgency, recommendedAction, shouldInterruptOwner, shouldBook, shouldFollowUp, shouldBlock, shouldRouteToVendor, serviceAreaMatch, missingFields, summary, nextMessage.",
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`OpenAI classifier failed with ${response.status}`);
    }
    const content = body.choices?.[0]?.message?.content;
    return normalizeDecision(typeof content === "string" ? JSON.parse(content) : content);
  }
}

// Example Mock Adapter
export class MockVanta13Adapter implements Vanta13Adapter {
  async classify(input: { text: string }): Promise<Vanta13Decision> {
    const text = input.text.toLowerCase();
    
    const emergencyTerms = ["leak", "emergency", "burst", "flood", "water is everywhere", "gas smell"];
    if (emergencyTerms.some((term) => text.includes(term))) {
      return {
        intent: "emergency",
        confidence: 0.95,
        callerType: "lead",
        urgency: "emergency",
        recommendedAction: "escalate_to_owner",
        shouldInterruptOwner: true,
        shouldBook: false,
        shouldFollowUp: true,
        shouldBlock: false,
        shouldRouteToVendor: false,
        missingFields: [],
        summary: "Emergency leak reported",
        nextMessage: "I'm alerting the team right now. Is anyone safe?",
      };
    }

    if (
      text.includes("price") ||
      text.includes("cost") ||
      text.includes("quote") ||
      text.includes("how much")
    ) {
      return {
        intent: "request_quote",
        confidence: 0.85,
        callerType: "lead",
        urgency: "normal",
        recommendedAction: "collect_details",
        shouldInterruptOwner: false,
        shouldBook: true,
        shouldFollowUp: true,
        shouldBlock: false,
        shouldRouteToVendor: false,
        missingFields: ["service_type", "location"],
        summary: "Lead asking for pricing",
        nextMessage: "I can help with that. What service do you need and where are you located?",
      };
    }

    if (text.includes("seo") || text.includes("rank") || text.includes("marketing agency")) {
      return {
        intent: "vendor_pitch",
        confidence: 0.9,
        callerType: "vendor",
        urgency: "low",
        recommendedAction: "route_to_vendor_inbox",
        shouldInterruptOwner: false,
        shouldBook: false,
        shouldFollowUp: false,
        shouldBlock: false,
        shouldRouteToVendor: true,
        missingFields: [],
        summary: "Vendor pitch detected",
        nextMessage: "Thanks. Please send your details and the owner will review them if there is interest.",
      };
    }

    return {
      intent: "unknown",
      confidence: 0.5,
      callerType: "unknown",
      recommendedAction: "ask_clarification",
      shouldInterruptOwner: false,
      shouldBook: false,
      shouldFollowUp: false,
      shouldBlock: false,
      shouldRouteToVendor: false,
      missingFields: [],
      summary: "Undetermined intent",
      nextMessage: "I'm not sure I understand. Could you tell me more about why you're calling?",
    };
  }
}

function normalizeDecision(value: Partial<Vanta13Decision>): Vanta13Decision {
  return {
    intent: String(value.intent || "unknown"),
    confidence: Number(value.confidence ?? 0.5),
    callerType: normalizeCallerType(value.callerType),
    leadQuality: value.leadQuality == null ? undefined : Number(value.leadQuality),
    urgency: normalizeUrgency(value.urgency),
    recommendedAction: String(value.recommendedAction || "ask_clarification"),
    shouldInterruptOwner: Boolean(value.shouldInterruptOwner),
    shouldBook: Boolean(value.shouldBook),
    shouldFollowUp: Boolean(value.shouldFollowUp),
    shouldBlock: Boolean(value.shouldBlock),
    shouldRouteToVendor: Boolean(value.shouldRouteToVendor),
    serviceAreaMatch: value.serviceAreaMatch == null ? undefined : Boolean(value.serviceAreaMatch),
    missingFields: Array.isArray(value.missingFields) ? value.missingFields.map(String) : [],
    summary: String(value.summary || "No summary provided"),
    nextMessage: String(value.nextMessage || "Could you tell me a little more?"),
  };
}

function normalizeCallerType(value: unknown): Vanta13Decision["callerType"] {
  if (value === "lead" || value === "customer" || value === "vendor" || value === "spam") return value;
  return "unknown";
}

function normalizeUrgency(value: unknown): Vanta13Decision["urgency"] {
  if (value === "low" || value === "normal" || value === "high" || value === "emergency") return value;
  return "normal";
}
