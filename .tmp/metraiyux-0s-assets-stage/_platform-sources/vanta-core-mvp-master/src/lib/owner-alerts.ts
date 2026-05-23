import { db } from "@/db";
import { ownerAlerts } from "@/db/schema/schema";
import { logAudit } from "./audit";

export async function createOwnerAlert({
  tenantId,
  type,
  message,
}: {
  tenantId: string;
  type: string;
  message: string;
}) {
  try {
    const [alert] = await db.insert(ownerAlerts).values({
      tenantId,
      type,
      message,
      isRead: false,
    }).returning();

    await logAudit({
      tenantId,
      actor: "system",
      action: "create_owner_alert",
      entityType: "owner_alert",
      entityId: alert.id,
      input: { type, message },
      result: "Alert created for owner",
    });

    // In a real app, this would also trigger a Push Notification or SMS to the owner
    console.log(`[Owner Alert] ${type}: ${message}`);

    return alert;
  } catch (error: any) {
    console.error("Failed to create owner alert:", error);
    throw error;
  }
}
