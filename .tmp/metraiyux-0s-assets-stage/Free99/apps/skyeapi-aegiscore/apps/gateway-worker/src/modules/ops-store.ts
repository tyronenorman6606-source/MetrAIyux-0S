import type { CapabilityName } from "@skyeapi/core";
import type { DurableAsyncJobRecord, OpsStore } from "@skyeapi/ops";

export interface OpsRuntimeEnv {
  AEGIS_KV: KVNamespace;
}

export class WorkerOpsStore implements OpsStore {
  constructor(private readonly kv: KVNamespace) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    return await this.kv.get<T>(`ops:${key}`, "json") ?? null;
  }

  async put<T = unknown>(key: string, value: T): Promise<void> {
    await this.kv.put(`ops:${key}`, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(`ops:${key}`);
  }

  async list<T = unknown>(prefix: string): Promise<Array<{ key: string; value: T }>> {
    const listed = await this.kv.list({ prefix: `ops:${prefix}`, limit: 1000 });
    const rows: Array<{ key: string; value: T }> = [];
    for (const key of listed.keys) {
      const value = await this.kv.get<T>(key.name, "json");
      if (value) rows.push({ key: key.name.replace(/^ops:/, ""), value });
    }
    return rows;
  }
}

export function opsStore(env: OpsRuntimeEnv): WorkerOpsStore {
  return new WorkerOpsStore(env.AEGIS_KV);
}

export async function findOpsJob(env: OpsRuntimeEnv, projectId: string, jobId: string): Promise<{ key: string; value: DurableAsyncJobRecord } | undefined> {
  const rows = await opsStore(env).list<DurableAsyncJobRecord>(`job:${projectId}:`);
  return rows.find((row) => row.value.id === jobId);
}

export async function usageSamplesForAnomalies(env: OpsRuntimeEnv, projectId: string, date: string): Promise<Array<{ projectId: string; window: string; capability: CapabilityName; ok: boolean; count: number }>> {
  const listed = await env.AEGIS_KV.list({ prefix: `usage:${projectId}:${date}:`, limit: 1000 });
  const samples: Array<{ projectId: string; window: string; capability: CapabilityName; ok: boolean; count: number }> = [];
  for (const key of listed.keys) {
    const parts = key.name.split(":");
    samples.push({ projectId, window: date, capability: parts[3] as CapabilityName, ok: parts[4] !== "failed", count: Number(await env.AEGIS_KV.get(key.name) || "0") });
  }
  return samples;
}
