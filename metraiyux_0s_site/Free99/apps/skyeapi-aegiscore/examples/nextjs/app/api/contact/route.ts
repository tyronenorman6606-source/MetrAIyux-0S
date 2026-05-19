import { NextResponse } from "next/server";
import { SkyeAPIClient } from "@skyeapi/sdk";

const skye = new SkyeAPIClient({
  baseUrl: process.env.SKYEAPI_BASE_URL!,
  apiKey: process.env.SKYEAPI_KEY!
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = await skye.email.send({
    to: body.to,
    subject: body.subject ?? "SkyeAPI contact",
    body: body.message
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
