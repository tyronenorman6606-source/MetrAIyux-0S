import { processIntake } from '../src/lib/intake';

async function intakeSmokeTest() {
  console.log("🚀 Starting VantaCore Phase 3 Intake Smoke Test...");

  const tenantId = '00000000-0000-0000-0000-000000000000'; // Using mock UUID

  const simulations = [
    { channel: 'sms' as const, from: '+15551234567', content: 'Help! There is a major leak in my basement!' },
    { channel: 'chat' as const, from: 'user_123', content: 'How much do you charge for a routine inspection?' },
    { channel: 'email' as const, from: 'vendor@seo-spam.com', content: 'We can help you rank #1 on Google for only $99/mo!' },
  ];

  for (const sim of simulations) {
    console.log(`\n--- Simulating ${sim.channel.toUpperCase()} intake from ${sim.from} ---`);
    const result = await processIntake({
      tenantId,
      channel: sim.channel,
      from: sim.from,
      content: sim.content,
    });

    if (result.success) {
      console.log(`✅ Success! Conversation ID: ${result.conversationId}`);
      console.log(`Intent: ${result.decision.intent}`);
      console.log(`Urgency: ${result.decision.urgency}`);
      console.log(`Recommended Action: ${result.decision.recommendedAction}`);
    } else {
      console.error(`❌ Failed: ${result.error}`);
    }
  }

  console.log("\n✅ Intake smoke test complete!");
}

intakeSmokeTest().catch(console.error);
