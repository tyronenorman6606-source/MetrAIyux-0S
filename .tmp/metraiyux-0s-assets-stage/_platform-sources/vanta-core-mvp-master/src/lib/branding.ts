import { db } from "@/db";
import { tenants, tenantBranding, resellers } from "@/db/schema/schema";
import { eq } from "drizzle-orm";

export async function getEffectiveBranding(tenantId: string) {
  // 1. Check for specific tenant branding
  const branding = await db.query.tenantBranding.findFirst({
    where: eq(tenantBranding.tenantId, tenantId),
  });

  if (branding && (branding.logoUrl || branding.primaryColor)) {
    return {
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      fontFamily: branding.fontFamily,
      customCss: branding.customCss,
      source: 'tenant'
    };
  }

  // 2. Fallback to reseller branding if tenant is managed by one
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    with: {
      reseller: true,
    }
  });

  if (tenant?.reseller) {
    return {
      logoUrl: tenant.reseller.logoUrl,
      primaryColor: (tenant.reseller.branding as any)?.primaryColor,
      secondaryColor: (tenant.reseller.branding as any)?.secondaryColor,
      fontFamily: (tenant.reseller.branding as any)?.fontFamily,
      customCss: (tenant.reseller.branding as any)?.customCss,
      source: 'reseller',
      resellerName: tenant.reseller.name
    };
  }

  // 3. Default Skye/VantaCore branding
  return {
    logoUrl: null,
    primaryColor: '#00FFFF', // Neon Cyan
    secondaryColor: '#0F172A', // Slate 900
    source: 'default'
  };
}
