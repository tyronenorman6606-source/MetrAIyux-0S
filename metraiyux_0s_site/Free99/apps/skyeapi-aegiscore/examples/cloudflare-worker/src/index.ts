import { SkyeAPIClient } from "@skyeapi/sdk";

export interface Env {
  SKYEAPI_BASE_URL: string;
  SKYEAPI_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const skye = new SkyeAPIClient({ baseUrl: env.SKYEAPI_BASE_URL, apiKey: env.SKYEAPI_KEY });
    if (new URL(request.url).pathname === "/test-email") {
      const result = await skye.email.send({
        to: "client@example.com",
        subject: "Cloudflare Worker via SkyeAPI",
        body: "This Worker called SkyeAPI instead of Resend directly."
      });
      return Response.json(result, { status: result.ok ? 200 : 502 });
    }
    return Response.json({ ok: true, service: "skyeapi-example-worker" });
  }
};
