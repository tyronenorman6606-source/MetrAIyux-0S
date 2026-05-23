/**
 * Audit Logs Dashboard Screen
 * Section 20 compliance: Admin visibility into audit logs
 */

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { auditLogs, tenants } from "@/db/schema/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { queryAuditLogs, getAuditStats, AuditLogRecord } from "@/lib/audit";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const actorFilter = params.actor as string | undefined;
  const actionFilter = params.action as string | undefined;
  const entityFilter = params.entity as string | undefined;

  // Get mock tenant for now
  const tenant = await db.query.tenants.findFirst();

  // Query audit logs with filters
  const logs = await queryAuditLogs({
    tenantId: tenant?.id,
    actor: actorFilter as any,
    action: actionFilter,
    entityType: entityFilter,
    limit: 50,
  });

  // Get stats
  const stats = await getAuditStats(tenant?.id);

  // Format action for display
  const formatAction = (action: string) => {
    return action
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get unique actions and entity types for filter dropdowns
  const uniqueActions = Array.from(
    new Set(logs.map((l) => l.action))
  );
  const uniqueEntities = Array.from(
    new Set(logs.map((l) => l.entityType))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary uppercase font-mono tracking-widest">
          Audit Logs
        </h1>
        <p className="text-muted-foreground">
          Complete history of all autonomous actions and system events.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary font-mono">
              {stats.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
              Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500 font-mono">
              {stats.verifiedEntries || stats.total}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
              By AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              {logs.filter((l) => l.actor === "ai").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
              By System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              {logs.filter((l) => l.actor === "system").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-primary/10 bg-card/30">
        <CardHeader>
          <CardTitle className="text-lg uppercase font-mono tracking-widest">
            Filter Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Actor
              </label>
              <select
                name="actor"
                className="w-full px-3 py-2 bg-secondary border border-primary/10 rounded text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                defaultValue={actorFilter}
              >
                <option value="">All Actors</option>
                <option value="system">System</option>
                <option value="ai">AI</option>
                <option value="user">User</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Entity Type
              </label>
              <select
                name="entity"
                className="w-full px-3 py-2 bg-secondary border border-primary/10 rounded text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                defaultValue={entityFilter}
              >
                <option value="">All Entities</option>
                {uniqueEntities.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-primary text-background font-bold uppercase tracking-widest text-xs rounded hover:bg-primary/90 transition-colors"
            >
              Apply Filters
            </button>

            <a
              href="/dashboard/audit-logs"
              className="px-4 py-2 bg-secondary text-foreground font-bold uppercase tracking-widest text-xs rounded hover:bg-secondary/80 transition-colors"
            >
              Clear
            </a>
          </form>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-primary/10 bg-card/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase font-mono tracking-widest">
            Event Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-primary/10 text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-4 px-2">Timestamp</th>
                  <th className="py-4 px-2">Actor</th>
                  <th className="py-4 px-2">Action</th>
                  <th className="py-4 px-2">Entity</th>
                  <th className="py-4 px-2">Result</th>
                  <th className="py-4 px-2">Integrity</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground italic">
                      No audit log entries found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-primary/5 hover:bg-secondary/20 transition-colors"
                    >
                      <td className="py-4 px-2 font-mono text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-4 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.actor === "ai"
                              ? "bg-purple-500/10 text-purple-500"
                              : log.actor === "system"
                              ? "bg-blue-500/10 text-blue-500"
                              : log.actor === "webhook"
                              ? "bg-orange-500/10 text-orange-500"
                              : "bg-green-500/10 text-green-500"
                          }`}
                        >
                          {log.actor}
                        </span>
                      </td>
                      <td className="py-4 px-2 font-medium">
                        {formatAction(log.action)}
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-muted-foreground">
                          {log.entityType}
                        </span>
                        {log.entityId && (
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            #{log.entityId.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-2 max-w-xs truncate">
                        {log.result ? (
                          <span className="text-muted-foreground truncate block">
                            {log.result}
                          </span>
                        ) : log.error ? (
                          <span className="text-red-500 truncate block">
                            {log.error}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        {log.integrityHash ? (
                          <span className="inline-flex items-center gap-1 text-green-500 text-xs">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                              />
                            </svg>
                            Verified
                          </span>
                        ) : (
                          <span className="text-yellow-500 text-xs">Unverified</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
