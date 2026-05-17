import { AuthError, PlanLimitError, ApprovalRequiredError, MetrAIyuxError } from './errors.js';

const DEFAULT_FS27_URL = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';
const DEFAULT_GATEWAY_URL = 'https://sovereign-saas-provisioning-worker.graylondonskyes.workers.dev';

export class MetrAIyux0S {
  #token;
  #fs27Url;
  #gatewayUrl;
  #card = null;
  #initialized = false;

  constructor({ token, fs27Url, gatewayUrl } = {}) {
    if (!token) throw new AuthError('token is required — pass your FS27 gate card token');
    this.#token = token;
    this.#fs27Url = (fs27Url || DEFAULT_FS27_URL).replace(/\/$/, '');
    this.#gatewayUrl = (gatewayUrl || DEFAULT_GATEWAY_URL).replace(/\/$/, '');

    // Namespaced accessors
    this.workspace = this.#workspaceNamespace();
    this.billing = this.#billingNamespace();
    this.proof = this.#proofNamespace();
  }

  // ── init ───────────────────────────────────────────────────────────────────
  // Validates the token against FS27 and caches the gate card.
  // Called automatically on first API call — you can also call it explicitly
  // to verify credentials at startup.

  async init() {
    const res = await fetch(`${this.#fs27Url}/auth-card`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.#token}` }
    });
    if (res.status === 401) throw new AuthError('Invalid or expired FS27 gate card token');
    if (!res.ok) throw new AuthError(`FS27 auth-card returned ${res.status}`);

    const body = await res.json();
    if (!body?.card) throw new AuthError('FS27 auth-card response missing card field');

    this.#card = body.card;
    this.#initialized = true;
    return this.#publicCard();
  }

  // ── card ───────────────────────────────────────────────────────────────────
  // Returns the cached gate card. Initializes if needed.

  async card() {
    if (!this.#initialized) await this.init();
    return this.#publicCard();
  }

  // ── command ────────────────────────────────────────────────────────────────
  // Submit a command to the MetrAIyux 0S brain routing system.
  // The system classifies the command, assigns primary + secondary brains,
  // runs 0meg4kAI security review, and returns routing + approval status.
  //
  // opts.workspace_id  — override workspace (defaults to card's customer_id)
  // opts.strict        — if true, throws ApprovalRequiredError instead of returning
  // opts.metadata      — arbitrary key/value passed through to the audit ledger

  async command(text, opts = {}) {
    if (!this.#initialized) await this.init();
    if (!text?.trim()) throw new MetrAIyuxError('command text is required', 'INVALID_INPUT');

    const card = this.#card;
    const workspaceId = opts.workspace_id || card?.identity?.customer_id || null;

    const res = await this.#gatewayPost('/api/sdk/command', {
      command_text: text.trim(),
      workspace_id: workspaceId,
      metadata: opts.metadata || {}
    });

    const data = await this.#parseGatewayResponse(res);

    if (opts.strict && data.approval_required) {
      throw new ApprovalRequiredError(
        `Command routed to ${data.route?.primary} requires approval before execution`,
        data.command_id,
        data.route
      );
    }

    return data;
  }

  // ── Workspace namespace ────────────────────────────────────────────────────

  #workspaceNamespace() {
    const self = this;
    return {
      // Current workspace status + plan limits
      async status() {
        if (!self.#initialized) await self.init();
        const res = await self.#gatewayGet('/api/sdk/workspace');
        return self.#parseGatewayResponse(res);
      },

      // Visual dashboard data (KPIs, progress bars, timeline)
      async visuals(workspaceId) {
        if (!self.#initialized) await self.init();
        const id = workspaceId || self.#card?.identity?.customer_id || '';
        const res = await self.#gatewayGet(`/api/saas/customer-visuals?workspace_id=${encodeURIComponent(id)}`);
        return self.#parseGatewayResponse(res);
      },

      // Recent command history for this workspace
      async commands(limit = 20) {
        if (!self.#initialized) await self.init();
        const res = await self.#gatewayGet(`/api/sdk/commands?limit=${limit}`);
        return self.#parseGatewayResponse(res);
      },

      // SkyeMail mailbox status
      async mailbox() {
        if (!self.#initialized) await self.init();
        const id = self.#card?.identity?.customer_id || '';
        const res = await self.#gatewayGet(`/api/saas/skymail/status?workspace_id=${encodeURIComponent(id)}`);
        return self.#parseGatewayResponse(res);
      }
    };
  }

  // ── Billing namespace ──────────────────────────────────────────────────────

  #billingNamespace() {
    const self = this;
    return {
      // Create a Stripe checkout session for the given plan.
      // Returns { checkout_url, stripe_session_id } — redirect customer to checkout_url.
      async checkout(planId, opts = {}) {
        if (!self.#initialized) await self.init();
        const card = self.#card;
        const res = await self.#gatewayPost('/api/saas/billing/checkout-session', {
          plan_id: planId,
          customer_id: opts.customer_id || card?.identity?.customer_id || null,
          workspace_id: opts.workspace_id || null,
          customer_email: opts.customer_email || card?.identity?.email || null
        });
        return self.#parseGatewayResponse(res);
      },

      // Current subscription / billing status
      async status() {
        if (!self.#initialized) await self.init();
        const res = await self.#gatewayGet('/api/sdk/billing/status');
        return self.#parseGatewayResponse(res);
      }
    };
  }

  // ── Proof namespace ────────────────────────────────────────────────────────

  #proofNamespace() {
    const self = this;
    return {
      // Audit ledger — last N events for this workspace
      async ledger(limit = 20) {
        if (!self.#initialized) await self.init();
        const res = await self.#gatewayGet(`/api/sdk/proof/ledger?limit=${limit}`);
        return self.#parseGatewayResponse(res);
      },

      // Export a proof receipt (JSON) for a specific command or event
      async receipt(resourceId) {
        if (!self.#initialized) await self.init();
        const res = await self.#gatewayGet(`/api/sdk/proof/receipt?id=${encodeURIComponent(resourceId)}`);
        return self.#parseGatewayResponse(res);
      }
    };
  }

  // ── private helpers ────────────────────────────────────────────────────────

  #publicCard() {
    const c = this.#card;
    if (!c) return null;
    return {
      principal: c.principal,
      tier: c.tier,
      identity: c.identity,
      permissions: c.permissions,
      budget: c.budget,
      limits: c.limits,
      vault: c.vault,
      operations: c.operations,
      issued_at: c.issued_at
    };
  }

  async #gatewayGet(path) {
    return fetch(`${this.#gatewayUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.#token}`,
        'x-fs27-token': this.#token
      }
    });
  }

  async #gatewayPost(path, body) {
    return fetch(`${this.#gatewayUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#token}`,
        'x-fs27-token': this.#token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }

  async #parseGatewayResponse(res) {
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (res.status === 401) throw new AuthError('Gateway rejected the FS27 token', data);
    if (res.status === 402) throw new PlanLimitError(data?.error || 'Plan limit reached', data?.limit, data);
    if (!res.ok) throw new MetrAIyuxError(data?.error || `Gateway returned ${res.status}`, 'GATEWAY_ERROR', data);
    return data;
  }
}
