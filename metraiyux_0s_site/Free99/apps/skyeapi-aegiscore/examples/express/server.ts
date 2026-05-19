import express from "express";
import { SkyeAPIClient } from "@skyeapi/sdk";

const app = express();
app.use(express.json());

const skye = new SkyeAPIClient({
  baseUrl: process.env.SKYEAPI_BASE_URL!,
  apiKey: process.env.SKYEAPI_KEY!
});

app.post("/contact", async (req, res) => {
  const result = await skye.email.send({
    to: req.body.to,
    subject: "New SkyeAPI message",
    body: req.body.message
  });
  res.status(result.ok ? 200 : 502).json(result);
});

app.listen(3000, () => console.log("Example listening on :3000"));
