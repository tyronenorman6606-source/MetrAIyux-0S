import { db } from "./index";
import { tenants, users, businessProfiles } from "./schema/schema";

async function main() {
  console.log("Seeding database...");

  // Create a default tenant
  const [defaultTenant] = await db.insert(tenants).values({
    name: "Skyes Over London",
    slug: "skyes-over-london",
  }).returning();

  console.log("Created tenant:", defaultTenant.name);

  // Create a default user
  const [defaultUser] = await db.insert(users).values({
    tenantId: defaultTenant.id,
    email: "admin@skyesoverlondon.com",
    name: "Admin User",
    role: "admin",
  }).returning();

  console.log("Created user:", defaultUser.name);

  // Create a business profile
  await db.insert(businessProfiles).values({
    tenantId: defaultTenant.id,
    description: "The autonomous business infrastructure platform.",
    industry: "SaaS",
    website: "https://vanta-core.com",
    phone: "+1234567890",
  });

  console.log("Seed complete!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
