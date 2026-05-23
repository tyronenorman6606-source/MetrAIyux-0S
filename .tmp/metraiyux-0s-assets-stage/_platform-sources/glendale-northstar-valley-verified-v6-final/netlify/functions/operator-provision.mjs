import { getSql, json, readBody, requireOperator, safeText, slugify, randomToken, hashPassword, hashValue } from './_shared.mjs';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
    requireOperator(event);
    const body = await readBody(event);
    const name = safeText(body.name || body.companyName, 180);
    const slug = slugify(body.slug || name);
    const email = safeText(body.ownerEmail || body.email, 254).toLowerCase();
    const password = String(body.password || randomToken(18));
    const role = ['owner','admin','operator','viewer'].includes(body.role) ? body.role : 'owner';
    if (!name || !slug || !email) return json(400, { ok: false, error: 'name, slug, and ownerEmail are required.' });
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
    const initialState = body.initialState && typeof body.initialState === 'object' ? body.initialState : null;
    const passwordHash = hashPassword(password);
    const sql = getSql();

    const w = await sql`
      insert into workspaces (slug, name, status, plan, metadata, updated_at)
      values (${slug}, ${name}, 'active', ${safeText(body.plan || 'provided-infrastructure', 80)}, ${JSON.stringify(metadata)}::jsonb, now())
      on conflict (slug) do update set name = excluded.name, status = 'active', plan = excluded.plan, metadata = workspaces.metadata || excluded.metadata, updated_at = now()
      returning id, slug, name, status, plan, metadata
    `;
    const workspace = w[0];
    const u = await sql`
      insert into workspace_users (workspace_id, email, password_hash, role, status)
      values (${workspace.id}, ${email}, ${passwordHash}, ${role}, 'active')
      on conflict (workspace_id, email) do update set password_hash = excluded.password_hash, role = excluded.role, status = 'active'
      returning id, email, role, status
    `;
    const user = u[0];
    const state = initialState || {
      schemaVersion: 4,
      appVersion: '6.4.0-workspace-closure',
      workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name, role },
      settings: {
        eventName: `${workspace.name} Guest Access`,
        idLabel: 'Event ID',
        enableSound: true,
        allowDuplicateEmails: false,
        syncEnabled: true,
        retentionNote: 'Workspace-local storage with Neon backup.'
      },
      attendees: [],
      audit: [{ at: new Date().toISOString(), action: 'workspace_provisioned', detail: 'Workspace provisioned by NorthStar operator endpoint.' }]
    };
    const branding = metadata.branding && typeof metadata.branding === 'object' ? metadata.branding : {};
    const appSettings = metadata.appSettings && typeof metadata.appSettings === 'object' ? metadata.appSettings : { eventName: `${workspace.name} Guest Access`, idLabel: 'Event ID' };
    const securitySettings = metadata.securitySettings && typeof metadata.securitySettings === 'object' ? metadata.securitySettings : { providedInfrastructure: true, tenantScoped: true };
    await sql`
      insert into workspace_settings (workspace_id, branding, app_settings, security_settings, updated_by, updated_at)
      values (${workspace.id}, ${JSON.stringify(branding)}::jsonb, ${JSON.stringify(appSettings)}::jsonb, ${JSON.stringify(securitySettings)}::jsonb, ${user.id}, now())
      on conflict (workspace_id) do update set branding = workspace_settings.branding || excluded.branding, app_settings = workspace_settings.app_settings || excluded.app_settings, security_settings = workspace_settings.security_settings || excluded.security_settings, updated_by = excluded.updated_by, updated_at = now()
    `;
    const hash = hashValue(JSON.stringify(state));
    await sql`
      insert into workspace_states (workspace_id, state, state_hash, revision, updated_by, updated_at)
      values (${workspace.id}, ${JSON.stringify(state)}::jsonb, ${hash}, 1, ${user.id}, now())
      on conflict (workspace_id) do nothing
    `;
    await sql`
      insert into workspace_audit_events (workspace_id, user_id, action, detail, data)
      values (${workspace.id}, ${user.id}, 'workspace_provisioned', 'Workspace created or refreshed.', ${JSON.stringify({ email })}::jsonb)
    `;
    return json(200, { ok: true, workspace, user, oneTimePassword: password });
  } catch (error) {
    const status = /token/i.test(error.message || '') ? 401 : 500;
    return json(status, { ok: false, error: error.message || 'Provisioning failed.' });
  }
}
