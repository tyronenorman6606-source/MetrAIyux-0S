import { MockVanta13Adapter } from "../src/lib/vanta13/adapter";

async function smokeTest() {
  console.log("🚀 Starting VantaCore Phase 1 Smoke Test...");

  const adapter = new MockVanta13Adapter();

  console.log("\n--- Testing Lead Classification ---");
  const leads = [
    "Help! My pipe burst and there is water everywhere!",
    "I'd like to get a quote for a bathroom remodel.",
    "Hey, do you guys do SEO? I'm from a marketing agency.",
  ];

  for (const lead of leads) {
    console.log(`Input: "${lead}"`);
    const decision = await adapter.classify({ text: lead });
    console.log(`Intent: ${decision.intent}`);
    console.log(`Urgency: ${decision.urgency || "normal"}`);
    console.log(`Action: ${decision.recommendedAction}`);
    console.log(`Next Message: "${decision.nextMessage}"`);
    console.log("-" .repeat(20));
  }

  console.log("\n✅ Smoke test complete!");
}

smokeTest().catch(console.error);
