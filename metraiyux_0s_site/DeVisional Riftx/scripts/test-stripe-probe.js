const { probeStripeEnvironment } = require('../platform/payment-gateways');
const { fail, ok } = require('./lib');

(async () => {
  const fakeFetch = async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname !== '/v1/balance') return { ok:false, status:404, async text(){ return JSON.stringify({ error:'missing' }); } };
    return { ok:true, status:200, async text(){ return JSON.stringify({ object:'balance', livemode:false, available:[{ amount:100000, currency:'usd' }], pending:[{ amount:0, currency:'usd' }] }); } };
  };
  const probe = await probeStripeEnvironment({ provider:'stripe', secretKey:'sk_test_local', apiBase:'http://127.0.0.1:9999' }, fakeFetch);
  if (probe.provider !== 'stripe' || probe.provider_mode !== 'test' || probe.available_count !== 1 || probe.object !== 'balance') fail('[stripe-probe] FAIL');
  ok('[stripe-probe] PASS');
})().catch((error) => fail(error.stack || error.message));
