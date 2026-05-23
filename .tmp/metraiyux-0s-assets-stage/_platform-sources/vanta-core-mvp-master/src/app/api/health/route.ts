/**
 * VantaCore Health Check API
 * Provides liveness, readiness, and deep-ping probes for
 * observability dashboards and platform health checks.
 *
 * Endpoints:
 *   GET /api/health         → Basic liveness (always 200 if server is up)
 *   GET /api/health?ready=1 → Readiness probe (DB connectivity + critical env)
 *   GET /api/health?deep=1  → Deep ping (DB + all configured providers)
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { env, validateRuntime } from "@/lib/env";
import { getJobHealth } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkReady = searchParams.has("ready");
  const checkDeep = searchParams.has("deep");

  const start = Date.now();

  const authHeader = request.headers.get("authorization");
  if (checkDeep && env.healthCheckSecret) {
    const expected = `Bearer ${env.healthCheckSecret}`;
    if (authHeader !== expected) {
      return NextResponse.json(
        { status: "unauthorized", error: "Invalid or missing health check bearer token" },
        { status: 401 }
      );
    }
  }

  if (env.isProduction) {
    try {
      validateRuntime();
    } catch (err: any) {
      return NextResponse.json(
        {
          status: "unhealthy",
          checks: { runtime: { ok: false, error: err.message } },
        },
        { status: 503 }
      );
    }
  }

  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  if (checkReady || checkDeep) {
    const dbStart = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = { ok: true, latencyMs: Date.now() - dbStart };
    } catch (err: any) {
      checks.database = { ok: false, latencyMs: Date.now() - dbStart, error: err.message };
    }
  }

  if (checkDeep) {
    if (env.hasTwilio) {
      checks.twilio = { ok: true };
    } else {
      checks.twilio = { ok: false, error: "Not configured" };
    }

    if (env.hasStripe) {
      checks.stripe = { ok: true };
    } else {
      checks.stripe = { ok: false, error: "Not configured" };
    }

    if (env.hasAIProvider) {
      checks.ai = { ok: true };
    } else {
      checks.ai = { ok: false, error: "Not configured" };
    }

    if (env.hasStorage) {
      checks.storage = { ok: true };
    } else {
      checks.storage = { ok: false, error: "Not configured" };
    }

    try {
      const jobHealth = await getJobHealth();
      checks.jobs = { ok: jobHealth.failedRuns24h === 0 };
    } catch (err: any) {
      checks.jobs = { ok: false, error: err.message };
    }
  }

  const totalLatencyMs = Date.now() - start;
  const allOk = Object.values(checks).every((c) => c.ok);
  const anyCriticalFail = (checkReady || checkDeep) && checks.database?.ok === false;

  const status = anyCriticalFail ? "unhealthy" : allOk ? "healthy" : "degraded";
  const statusCode = anyCriticalFail ? 503 : 200;

  return NextResponse.json(
    {
      status,
      version: process.env.npm_package_version || "0.1.0",
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
      latencyMs: totalLatencyMs,
      checks,
    },
    { status: statusCode }
  );
}
