'use server';

import { db } from '@/db';
import { tenants, businessProfiles, businessPacks, services, users } from '@/db/schema/schema';
import { BUSINESS_PACKS } from '@/lib/business-packs';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

type OnboardingService = {
  name: string;
  price?: string;
  duration?: string;
};

type OnboardingFormData = {
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email: string;
  address?: string;
  selectedPackId?: string;
  services?: OnboardingService[];
  ownerPhone?: string;
  hours?: string;
};

export async function completeOnboarding(formData: OnboardingFormData) {
  try {
    const { 
      name, industry, website, phone, email, address, 
      selectedPackId, services: servicesData, ownerPhone, hours 
    } = formData;

    // 1. Create Tenant
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const [tenant] = await db.insert(tenants).values({
      name,
      slug,
    }).returning() as Array<typeof tenants.$inferSelect>;

    const tenantId = tenant.id;

    // 2. Create User (Owner)
    const [user] = await db.insert(users).values({
      tenantId,
      email,
      name: 'Owner',
      role: 'admin',
    }).returning() as Array<typeof users.$inferSelect>;

    // 3. Create Business Profile
    await db.insert(businessProfiles).values({
      tenantId,
      industry,
      website,
      phone,
      address,
      description: `VantaCore instance for ${name}`,
    });

    // 4. Load Business Pack
    const packTemplate = BUSINESS_PACKS.find(p => p.id === selectedPackId);
    if (packTemplate) {
      await db.insert(businessPacks).values({
        tenantId,
        name: packTemplate.name,
        category: packTemplate.category,
        config: packTemplate,
      });
    }

    // 5. Create Services
    if (servicesData && servicesData.length > 0) {
      for (const service of servicesData) {
        if (service.name) {
          await db.insert(services).values({
            tenantId,
            name: service.name,
            price: service.price || '0',
            duration: parseInt(service.duration ?? '60', 10) || 60,
          });
        }
      }
    }

    // 6. Log Audit
    await logAudit({
      tenantId,
      userId: user.id,
      actor: 'user',
      action: 'onboarding_complete',
      entityType: 'tenant',
      entityId: tenantId,
      input: formData,
      result: 'success',
    });

    revalidatePath('/onboarding');
    return { success: true, tenantId };

  } catch (error: any) {
    console.error('Onboarding failed:', error);
    return { success: false, error: error.message };
  }
}
