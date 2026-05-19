import { createRouteRegistry } from '../runtime/route-registry.mjs';
import * as templates from './templates.routes.mjs';
import * as cases from './cases.routes.mjs';
import * as review from './review.routes.mjs';
import * as partner from './partner.routes.mjs';
import * as commercial from './commercial.routes.mjs';
import * as documents from './documents.routes.mjs';
import * as packets from './packets.routes.mjs';
import * as reminders from './reminders.routes.mjs';
import * as editor from './editor.routes.mjs';
import * as billing from './billing.routes.mjs';
import * as storage from './storage.routes.mjs';
import * as audit from './audit.routes.mjs';
import * as casesV18 from './cases-v18.routes.mjs';
import * as editorV18 from './editor-v18.routes.mjs';
import * as workspaceV18 from './workspace-v18.routes.mjs';
export const premiumRouteRegistry = createRouteRegistry([workspaceV18,casesV18,editorV18,templates,cases,review,partner,commercial,documents,packets,reminders,editor,billing,storage,audit]);
export function routeManifest(){ return premiumRouteRegistry.manifest(); }
export async function handlePremiumRoute(ctx){ return premiumRouteRegistry.handle(ctx); }
