(function (global) {
  class SkyePayClient {
    constructor(options = {}) {
      this.baseUrl = String(options.baseUrl || "").replace(/\/+$/, "");
      this.defaultClient = options.client || "metraiyux-0s";
    }

    url(path) {
      return `${this.baseUrl}${path}`;
    }

    async request(path, options = {}) {
      const res = await fetch(this.url(path), {
        ...options,
        headers: {
          "content-type": "application/json",
          ...(options.headers || {})
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `SkyePay request failed: ${res.status}`);
      }
      return data;
    }

    offers(client = this.defaultClient) {
      return this.request(`/skyepay/offers?client=${encodeURIComponent(client)}`, {
        method: "GET"
      });
    }

    checkout(payload = {}) {
      const body = {
        client_slug: this.defaultClient,
        ...payload,
        idempotency_key: payload.idempotency_key || this.idempotencyKey(payload)
      };
      return this.request("/skyepay/checkout", {
        method: "POST",
        body: JSON.stringify(body)
      });
    }

    status(params = {}) {
      const query = new URLSearchParams();
      if (params.session_id) query.set("session_id", params.session_id);
      if (params.demo_session) query.set("demo_session", params.demo_session);
      return this.request(`/skyepay/status?${query.toString()}`, {
        method: "GET"
      });
    }

    async redirectToCheckout(payload = {}) {
      const result = await this.checkout(payload);
      if (!result.url) throw new Error("SkyePay did not return a checkout URL.");
      global.location.href = result.url;
      return result;
    }

    idempotencyKey(payload = {}) {
      const source = [
        payload.client_slug || this.defaultClient,
        payload.offer_id || "default",
        payload.customer_email || "unknown",
        new Date().toISOString().slice(0, 10)
      ].join(":");
      if (global.crypto?.randomUUID) return `${source}:${global.crypto.randomUUID()}`.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
      return `${source}:${Date.now().toString(36)}`.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
    }
  }

  global.SkyePayClient = SkyePayClient;
})(globalThis);
