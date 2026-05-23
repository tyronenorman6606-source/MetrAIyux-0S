async function testIntake() {
  console.log("🚀 Testing VantaCore Intake API...");

  const response = await fetch("http://localhost:3000/api/intake/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId: "00000000-0000-0000-0000-000000000000", // Placeholder
      channel: "chat",
      from: "+15551234567",
      name: "Test User",
      content: "I have a massive water leak in my basement!",
    }),
  });

  const result = await response.json();
  console.log("Response:", JSON.stringify(result, null, 2));

  if (result.success) {
    console.log("✅ Intake API test successful!");
  } else {
    console.error("❌ Intake API test failed!");
  }
}

// Note: This requires the server to be running.
// For now, I'll just keep it as a reference or run it if I can start the server.
// testIntake().catch(console.error);
