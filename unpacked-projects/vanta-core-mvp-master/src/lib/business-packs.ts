export interface BusinessPack {
  id: string;
  name: string;
  category: string;
  questions: string[];
  routingRules: {
    intent: string;
    target: string;
  }[];
  emergencyKeywords?: string[];
  followupTemplates?: {
    type: string;
    content: string;
  }[];
  quotingRules?: {
    basePrice: number;
    perUnitLabel?: string;
    perUnitPrice?: number;
  };
}

export const BUSINESS_PACKS: BusinessPack[] = [
  {
    id: "general",
    name: "General Business",
    category: "General",
    questions: [
      "New or existing customer?",
      "What are you contacting us about?",
      "Do you need to book something?",
      "Is this urgent?",
      "Best callback number?",
      "Preferred day/time?",
    ],
    routingRules: [
      { intent: "book_service", target: "sales/booking" },
      { intent: "existing_customer", target: "support" },
      { intent: "vendor_pitch", target: "vendor_inbox" },
      { intent: "emergency", target: "owner_alert" },
    ],
  },
  {
    id: "plumbing",
    name: "Plumbing Services",
    category: "Home Services",
    questions: [
      "What plumbing issue are you having?",
      "Is water actively leaking?",
      "Is this an emergency?",
      "What city are you in?",
      "Owner, tenant, or property manager?",
      "Can you upload a photo?",
      "Need same-day service?",
      "What time window works?",
    ],
    emergencyKeywords: [
      "burst pipe",
      "flooding",
      "no water",
      "sewage backup",
      "gas smell",
      "water heater leaking",
      "major leak",
      "toilet overflow",
      "main line clog",
    ],
    routingRules: [
      { intent: "emergency", target: "owner_alert" },
      { intent: "same_day_repair", target: "high_priority" },
      { intent: "estimate", target: "booking_flow" },
    ],
    quotingRules: {
      basePrice: 150,
      perUnitLabel: "Fixture",
      perUnitPrice: 75,
    },
  },
  // Add other packs as needed (Medical, Restaurant, etc.)
];
