(function () {
  var INDEX = [
    { title: 'Overview — MetrAIyux 0S', url: 'index.html', keywords: 'home overview platform sovereign OS edge workers pricing plans' },
    { title: 'Full Capabilities', url: 'capabilities.html', keywords: 'capabilities brains workers features lanes 17 brains auth email vault database kaixu 0meg4kai relay connectlog skyepay routex staffing music legal free99' },
    { title: 'Sell Sheet', url: 'sell-sheet.html', keywords: 'sell sheet b2b business case procurement operators licensing workers pages stripe' },
    { title: 'White Label', url: 'white-label.html', keywords: 'white label resale agency brand deploy client autonomous office' },
    { title: 'Marketplace', url: 'marketplace.html', keywords: 'marketplace products client builds bobs smoke shop empire pallets valley verified' },
    { title: 'Ecosystem Map', url: 'ecosystem.html', keywords: 'ecosystem map routes platform lanes diagram interactive' },
    { title: 'Live Proof', url: 'proof.html', keywords: 'proof live cf-ray receipts smoke tests deployment confirmed workers' },
    { title: 'Platform Valuation', url: 'valuation.html', keywords: 'valuation 1.5m 2m million deployed asset band replacement cost section accumulation' },
    { title: 'No Direct Competitor', url: 'the-gap.html', keywords: 'competitor gap gohighlevel supabase firebase appwrite retool sovereignty edge ai os market category' },
    { title: 'One-Page Flyer', url: 'flyer.html', keywords: 'flyer pdf one page overview print marketing' },
    { title: 'SkyeRouteX — Dispatch OS', url: 'skyeroutex.html', keywords: 'skyeroutex routex dispatch workforce routes contractor payment ledger' },
    { title: 'PHX Verified Platform', url: 'phx-verified-platform.html', keywords: 'phx verified phoenix valley business directory local listings' },
    { title: 'SkyeGate FS27 — Auth Platform', url: 'capabilities.html#workers', keywords: 'skyegate fs27 auth blake3 oauth twilio bearer token api keys allowlist' },
    { title: 'SkyeMail — Email Platform', url: 'capabilities.html#workers', keywords: 'skyemail email platform stalwart mailbox gmail oauth spam filtering 43395 lines' },
    { title: 'CitadelDB — Sovereign Database', url: 'capabilities.html#stack', keywords: 'citadeldb postgres k8s ha pitr wal streaming database sovereign' },
    { title: 'SkyeVault — Git Protocol', url: 'capabilities.html#workers', keywords: 'skyevault git smart-http clone push fetch vault cf worker' },
    { title: 'kAIxu 6.7 — Sovereign AI', url: 'capabilities.html#stack', keywords: 'kaixu ai model sovereign 5 variants nano mini pro max plan gated' },
    { title: '0meg4kAI — Security Scanner', url: 'capabilities.html#security', keywords: '0meg4kai security scanner two layer edge browser tenant isolation quarantine' },
    { title: 'Relay13 + ConnectLog — Realtime', url: 'capabilities.html#workers', keywords: 'relay13 connectlog durable objects websocket realtime rooms guardrails' },
    { title: 'SkyePay — Payment OS', url: 'capabilities.html#stack', keywords: 'skyepay payment os stripe 58 products checkout billing' },
    { title: 'Pricing Plans', url: 'index.html#pricing', keywords: 'pricing plans free starter growth autonomous office enterprise tiers' },
  ];

  function match(item, q) {
    var s = (item.title + ' ' + item.keywords).toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return w.length < 2 || s.includes(w); });
  }

  function init() {
    var wrap = document.querySelector('.nav-search');
    if (!wrap) return;
    var input = wrap.querySelector('.nav-search-input');
    var list  = wrap.querySelector('.nav-search-results');
    if (!input || !list) return;

    function render(q) {
      list.innerHTML = '';
      if (!q || q.length < 2) { list.hidden = true; return; }
      var hits = INDEX.filter(function (item) { return match(item, q); }).slice(0, 7);
      if (!hits.length) {
        list.innerHTML = '<li class="nav-sr-empty">No results</li>';
        list.hidden = false;
        return;
      }
      hits.forEach(function (item, i) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.innerHTML = '<a href="' + item.url + '">' + item.title + '</a>';
        list.appendChild(li);
      });
      list.hidden = false;
    }

    input.addEventListener('input', function () { render(input.value.trim()); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { list.hidden = true; input.blur(); }
      if (e.key === 'Enter') {
        var first = list.querySelector('a');
        if (first) { first.click(); }
      }
      if (e.key === 'ArrowDown') {
        var links = list.querySelectorAll('a');
        if (links.length) { e.preventDefault(); links[0].focus(); }
      }
    });

    list.addEventListener('keydown', function (e) {
      var links = Array.from(list.querySelectorAll('a'));
      var cur = document.activeElement;
      var idx = links.indexOf(cur);
      if (e.key === 'ArrowDown' && idx < links.length - 1) { e.preventDefault(); links[idx + 1].focus(); }
      if (e.key === 'ArrowUp')  { e.preventDefault(); if (idx > 0) links[idx - 1].focus(); else input.focus(); }
      if (e.key === 'Escape')   { list.hidden = true; input.focus(); }
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) list.hidden = true;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
