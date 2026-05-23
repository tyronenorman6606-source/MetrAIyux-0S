import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const PLATFORM_SOURCES_ROOT = path.resolve(ROOT, "..");
const CLIENTS_PATH = path.join(
  PLATFORM_SOURCES_ROOT,
  "glendale-northstar-valley-verified-v6-final",
  "assets",
  "data",
  "clients.json"
);
const OUT_PATH = path.join(ROOT, "seed", "businesses", "northstar-clients.json");
const TODAY = new Date().toISOString().slice(0, 10);
const CANONICAL_BASE = String(
  process.env.VALLEY_VERIFIED_CANONICAL_URL ||
  process.env.SITE_URL ||
  process.env.URL ||
  "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified"
).replace(/\/+$/, "");

const PROFILE_MAP = {
  "chicken-n-pickle-westgate": {
    category: "Food And Events",
    subcategory: "Pickleball Club / Restaurant",
    niche: "Pickleball Club / Restaurant",
    city: "Glendale",
    state: "AZ",
    zip: "85305",
    address: "9330 W Hanna Ln"
  },
  "as-you-wish-pottery-westgate": {
    category: "Creative Services",
    subcategory: "Paint-Your-Own Pottery Studio",
    niche: "Pottery Studio / Art Experience",
    city: "Glendale",
    state: "AZ",
    zip: "85305",
    address: "9410 W Hanna Ln, Suite A109"
  },
  "stir-crazy-comedy-club": {
    category: "Food And Events",
    subcategory: "Comedy Club",
    niche: "Comedy Club / Live Entertainment",
    city: "Glendale",
    state: "AZ",
    zip: "85305",
    address: "6751 N Sunset Blvd, Suite E206"
  },
  "escape-westgate": {
    category: "Food And Events",
    subcategory: "Escape Room",
    niche: "Escape Room Venue",
    city: "Glendale",
    state: "AZ",
    zip: "85305",
    address: "6751 N Sunset Blvd, Suite E108"
  },
  "dave-and-busters-westgate": {
    category: "Food And Events",
    subcategory: "Restaurant / Entertainment",
    niche: "Arcade Sports Bar / Event Venue",
    city: "Glendale",
    state: "AZ",
    zip: "85305",
    address: "9460 W Hanna Ln"
  },
  "popstroke-westgate": {
    category: "Food And Events",
    subcategory: "Restaurant / Entertainment",
    niche: "Social Mini Golf / Restaurant",
    city: "Glendale",
    state: "AZ",
    zip: "85305",
    address: "9480 W Hanna Ln"
  },
  "westgate-entertainment-district": {
    category: "Food And Events",
    subcategory: "Entertainment District",
    niche: "Entertainment District / Destination",
    city: "Glendale",
    state: "AZ",
    zip: "85305",
    address: "6770 N Sunrise Blvd"
  },
  "the-wigwam-resort": {
    category: "Food And Events",
    subcategory: "Resort / Event Venue",
    niche: "Resort / Meetings / Weddings",
    city: "Litchfield Park",
    state: "AZ",
    zip: "",
    address: "Litchfield Park, Arizona"
  },
  "state-farm-stadium": {
    category: "Food And Events",
    subcategory: "Stadium / Event Venue",
    niche: "Stadium / Tours / Private Events",
    city: "Glendale",
    state: "AZ",
    zip: "85305",
    address: "1 Cardinals Dr"
  },
  "theaterworks-peoria": {
    category: "Creative Services",
    subcategory: "Performing Arts Venue",
    niche: "Theater Company / Arts Education",
    city: "Peoria",
    state: "AZ",
    zip: "",
    address: "Peoria, AZ"
  },
  "goodyear-ballpark": {
    category: "Food And Events",
    subcategory: "Ballpark / Sports Venue",
    niche: "Ballpark / Events / Community Venue",
    city: "Goodyear",
    state: "AZ",
    zip: "",
    address: "Goodyear, AZ"
  }
};

function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function titleCase(value) {
  return text(value).replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values.map(text).filter(Boolean)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function hoursBlock() {
  return {
    mon: "See website for hours",
    tue: "See website for hours",
    wed: "See website for hours",
    thu: "See website for hours",
    fri: "See website for hours",
    sat: "See website for hours",
    sun: "See website for hours"
  };
}

const rawClients = JSON.parse(await fs.readFile(CLIENTS_PATH, "utf8"));
const businesses = rawClients.map((client) => {
  const profile = PROFILE_MAP[client.slug];
  if (!profile) throw new Error(`Missing NorthStar Valley profile mapping for ${client.slug}`);
  const tags = unique([
    "Valley Verified Featured Client",
    "NorthStar SignInPro",
    client.name,
    profile.subcategory,
    profile.niche,
    ...(client.usecases || [])
  ]);
  const landingPath = `/business/${client.slug}/`;
  return {
    id: client.slug,
    name: text(client.name),
    category: titleCase(profile.category),
    subcategory: titleCase(profile.subcategory),
    niche: titleCase(profile.niche),
    website: text(client.mainUrl),
    booking_url: "",
    landing_page_url: `${CANONICAL_BASE}${landingPath}`,
    phone: text(client.phone),
    email: "",
    address: text(profile.address),
    city: titleCase(profile.city),
    state: text(profile.state || "AZ") || "AZ",
    zip: text(profile.zip),
    tags,
    languages: ["English"],
    price_mode: "FREE99_PLATFORM_INCLUDED",
    price_note: "This featured Valley landing is complimentary and routes into the shared NorthStar SignInPro workspace when the venue uses the free guest-flow lane.",
    policies: {
      fees_transparency: "Use the public landing for discovery and the workspace lane for guest-flow intake. Confirm venue-specific pricing, tickets, reservations, memberships, or policies on the main site.",
      cancellation: "Venue schedules, reservations, classes, and event timing should still be confirmed directly with the business.",
      deposit: ""
    },
    badges: {
      no_hidden_fees: false,
      license_verified: false,
      business_verified: true,
      mobile: false,
      insured: false
    },
    description: `${text(client.name)} has a full Valley Verified landing page and a shared NorthStar SignInPro workspace lane for guest-flow, arrivals, group intake, and branded handoff. This listing should open the real landing page for the business instead of a generic generated directory page.`,
    hours: hoursBlock(),
    offers: [
      {
        id: "open-featured-landing",
        title: `Open ${text(client.name)} featured landing`,
        description: "Use the business landing page for discovery, then route into the shared NorthStar workspace for the actual visit-start flow.",
        cta: "Open landing"
      }
    ],
    featured: true,
    last_verified: TODAY,
    source_url: text(client.mainUrl)
  };
});

await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
await fs.writeFile(
  OUT_PATH,
  JSON.stringify(
    {
      updated_at: TODAY,
      generated_from: path.relative(ROOT, CLIENTS_PATH),
      businesses
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(OUT_PATH);
console.log(`northstar_seed_records=${businesses.length}`);
