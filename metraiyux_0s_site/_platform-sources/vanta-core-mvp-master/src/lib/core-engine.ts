import { runRevenueRescue } from "@/lib/revenue-rescue";
import { runUpsellBrain } from "@/lib/upsell-brain";
import { runReactivationCampaigns } from "@/lib/reactivation";
import { logAudit } from "@/lib/audit";

/**
 * Core Engine Orchestrator
 * Unifies Revenue Rescue, Upsell Brain, and Reactivation into a single
 * execution surface. Can run all three or a subset, with tenant scoping
 * and dry-run support.
 */

export type EngineModule = "revenue-rescue" | "upsell-brain" | "reactivation";

export interface CoreEngineOptions {
  tenantId?: string;
  modules?: EngineModule[];
  dryRun?: boolean;
}

export interface CoreEngineResult {
  success: boolean;
  revenueRescue?: Awaited<ReturnType<typeof runRevenueRescue>>;
  upsellBrain?: Awaited<ReturnType<typeof runUpsellBrain>>;
  reactivation?: Awaited<ReturnType<typeof runReactivationCampaigns>>;
  errors: string[];
}

export async function runCoreEngine(opts: CoreEngineOptions = {}): Promise<CoreEngineResult> {
  const modules = opts.modules ?? ["revenue-rescue", "upsell-brain", "reactivation"];
  const result: CoreEngineResult = { success: true, errors: [] };

  for (const moduleName of modules) {
    try {
      if (moduleName === "revenue-rescue") {
        result.revenueRescue = await runRevenueRescue({ tenantId: opts.tenantId, isDryRun: opts.dryRun });
      } else if (moduleName === "upsell-brain") {
        result.upsellBrain = await runUpsellBrain({ tenantId: opts.tenantId, isDryRun: opts.dryRun });
      } else if (moduleName === "reactivation") {
        result.reactivation = await runReactivationCampaigns({ tenantId: opts.tenantId, isDryRun: opts.dryRun });
      }
    } catch (err: any) {
      result.success = false;
      result.errors.push(`${moduleName}: ${err.message}`);
    }
  }

  await logAudit({
    tenantId: opts.tenantId,
    actor: "system",
    action: "core_engine_run",
    entityType: "automation",
    input: { modules, dryRun: opts.dryRun },
    result: result.success ? "success" : "partial_failure",
    error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
  });

  return result;
}
