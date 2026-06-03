(function bootSkyeMusicNexusNeoFront() {
  const PUBLIC_TELEMETRY_ENDPOINT = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skymusicnexus/music-drops';
  const PUBLIC_TELEMETRY_CONTENT_TYPE = 'text/plain;charset=UTF-8';
  const PUBLIC_LISTENER_KEY = 'skymusicnexus.listenerId.v1';
  const PUBLIC_SESSION_KEY = 'skymusicnexus.sessionId.v1';

  function starterSocialPayload() {
    const createdAt = new Date().toISOString();
    const feedItems = [{
      id: 'static_feed_signal',
      type: 'release-post',
      source: 'musicnexus',
      status: 'local-preview',
      artistId: 'static_preview_artist',
      releaseId: 'static_preview_release',
      author: 'Nexus Signal',
      handle: 'skye:preview',
      avatar: 'GS',
      title: 'Nexus Signal Preview',
      caption: 'First post in the MusicNexus feed: release signal, artist profile, story rail, comments, saves, and publishing queues all stay attached.',
      hashtags: ['newmusic', 'musicnexus'],
      media: { kind: 'generated-cover', gradient: 'linear-gradient(135deg,#6be8d6,#f2c766)', label: 'GS' },
      stats: { likes: 13, saves: 5, boosts: 2, comments: [{ id: 'static_comment', artistId: 'artist-team', body: 'Feed mechanics are ready for artist teams.', createdAt }] },
      createdAt,
    }];
    return {
      feedItems,
      stories: [{ id: 'static_story', artistId: 'static_preview_artist', label: 'Nexus Signal', sublabel: 'release-post', avatar: 'NS', releaseId: 'static_preview_release' }],
      summary: { connectors: 0, readyConnectors: 0, feedItems: feedItems.length, queuedPosts: 0, publishedPosts: 0, providerTokenRequired: 0 },
    };
  }

  const starterSocial = starterSocialPayload();
  const state = {
    mode: document.body.dataset.mode || 'artist',
    artists: [],
    releases: [],
    payouts: [],
    workflows: [],
    assets: [],
    assetStorage: null,
    drops: {
      items: [],
      batches: [],
      deploys: [],
      trafficSummary: null,
      env: null,
      estimate: null,
    },
    exchange: {
      contentRequests: [],
      threads: [],
      communityPosts: [],
      campaigns: [],
      progress: null,
    },
    social: {
      catalog: [],
      connectors: [],
      postQueue: [],
      feedItems: starterSocial.feedItems,
      stories: starterSocial.stories,
      feedPulls: [],
      moderation: [],
      feedActions: [],
      follows: [],
      notifications: [],
      profiles: [],
      media: [],
      prRuns: [],
      featuredBlogs: [],
      marketingPackages: [],
      contestBriefs: [],
      summary: starterSocial.summary,
    },
    contests: {
      contests: [],
      entries: [],
      featurePackages: [],
      backlinks: [],
      winners: [],
      summary: null,
    },
    store: {
      stores: [],
      products: [],
      orders: [],
      fulfillments: [],
      summary: null,
    },
    brains: {
      profiles: [],
      memory: [],
      actions: [],
      cycles: [],
      summary: null,
    },
    gamify: {
      meters: [],
      merits: [],
      events: [],
      giveaways: [],
      entries: [],
      summary: null,
    },
    player: {
      queue: [],
      activeIndex: 0,
      isPlaying: false,
      mode: 'idle',
      startedAt: 0,
      elapsed: 0,
      audioContext: null,
      audioElement: null,
      objectUrl: '',
      nodes: [],
      timer: null,
      currentTrack: null,
      publicPlayStartSent: false,
      publicQualifiedSent: false,
    },
    analytics: null,
    lastArtistId: sessionStorage.getItem('skye-music-nexus:lastArtistId') || '',
    lastReleaseId: sessionStorage.getItem('skye-music-nexus:lastReleaseId') || '',
    identity: null,
  };

  const lensCopy = {
    distribution: {
      micro: 'Distribution Spine',
      title: 'Release objects need a launch path, not a table row.',
      text: 'This lane frames each release as a live capsule with targets, review state, stream telemetry, and operations checkpoints.',
    },
    royalty: {
      micro: 'Royalty River',
      title: 'Money movement should feel visible before it becomes finance work.',
      text: 'Credits, payout requests, and pending movement are rendered clearly so artist teams can see value forming in real time.',
    },
    content: {
      micro: 'Content Request Exchange',
      title: 'Artists should be able to ask for content at the exact moment the release needs it.',
      text: 'The exchange captures cover, canvas, short-form, caption, EPK, and rollout requests, then creates a Relay13-ready inbox thread for handoff.',
    },
    community: {
      micro: 'Community Relay',
      title: 'The platform should create motion between artists, not isolate them in forms.',
      text: 'Artists can post collab calls, feedback asks, producer needs, show-slot signals, and milestones into a protected community lane.',
    },
    progression: {
      micro: 'Achievement Orbit',
      title: 'Progress needs to be visible enough to pull artists forward.',
      text: 'Artist actions unlock signal points, mission completion, release runway milestones, and campaign readiness while client access stays protected.',
    },
    proof: {
      micro: 'Launch Path',
      title: 'Clear release states keep the client experience honest.',
      text: 'The app shows creation, release packaging, rights, delivery, and payout state without forcing artists into technical receipts.',
    },
    ops: {
      micro: 'Ops Sequencer',
      title: 'Operations is a rhythm grid, not a buried control panel.',
      text: 'Queue release handoffs, assign owners, update checkpoints, and expose the runway state as a kinetic command surface.',
    },
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const plainText = (value) => String(value == null ? '' : value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const fmtNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
  const fmtMoney = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  const PUBLIC_PLAY_COUNT_THRESHOLD = 1000;
  function publicCountLabel(value, noun = 'plays') {
    const total = Number(value || 0) || 0;
    if (total >= PUBLIC_PLAY_COUNT_THRESHOLD) return `${fmtNumber(total)} ${noun}`;
    return `building toward first ${fmtNumber(PUBLIC_PLAY_COUNT_THRESHOLD)} ${noun}`;
  }
  function connectedAccountLabel(value) {
    const status = String(value || '').toLowerCase();
    if (status === 'env-key-set' || status === 'token-ready' || status === 'ready') return 'account connected';
    if (status === 'token-required' || status === 'provider-token-required' || status === 'needs-token') return 'needs connected account';
    return value || 'account pending';
  }
  const ARTIST_WORKFORCE_COMMAND_URL = '/SkyeRouteX/workforce-command-v0.4.0/index.html#contractor-panel';
  const ARTIST_WORKFORCE_PACKET_URL = '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html';
  const ARTIST_CONNECTLOG_URL = '/connectlog-v7.7-relay13-operator-proof/app.html';
  const ARTIST_RELAY13_INBOX_URL = '/connectlog-v7.7-relay13-operator-proof/relay13-inbox.html';
  const FOUNDER_ARTIST_STOREFRONTS = [
    {
      artistId: '444666666666',
      slug: 'gray-skyes',
      name: 'Gray Skyes',
      label: 'SOLE Boosted, reaching Over every Skye.',
      tier: 'unlimited',
      email: 'graylondonskyes@gmail.com',
      href: '../artist-storefronts/gray-skyes/',
      skyepayRef: 'skyepay_artist_444666666666',
      paperworkUrl: `${ARTIST_WORKFORCE_PACKET_URL}?source=SkyeMusicNexus&artist=gray-skyes`,
      storeName: 'Gray Skyes Nexus Store',
      plan: 'managed',
    },
    {
      artistId: '444666666667',
      slug: 'supaboy',
      name: 'SupaBoy',
      label: 'Founding SkyeMusicNexus artist workspace.',
      tier: 'founding-core-2026-05',
      email: 'supaboy@skymusicnexus.local',
      href: '../artist-storefronts/supaboy/',
      skyepayRef: 'skyepay_artist_444666666667',
      paperworkUrl: `${ARTIST_WORKFORCE_PACKET_URL}?source=SkyeMusicNexus&artist=supaboy`,
      storeName: 'SupaBoy Nexus Store',
      plan: 'storefront-starter',
    },
  ];
  const launchParams = new URLSearchParams(window.location.search);
  function slugForArtistLink(value, fallback = 'new-artist') {
    return String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || fallback;
  }
  function launchArtistPreset() {
    const slug = slugForArtistLink(launchParams.get('artist') || launchParams.get('artistSlug') || launchParams.get('slug'), '');
    if (!slug) return null;
    return FOUNDER_ARTIST_STOREFRONTS.find((artist) => artist.slug === slug || slugForArtistLink(artist.name) === slug) || null;
  }
  function launchArtistId() {
    return launchParams.get('artistId') || launchParams.get('artist_id') || launchArtistPreset()?.artistId || '';
  }
  function launchReleaseId() {
    return launchParams.get('releaseId') || launchParams.get('release_id') || '';
  }
  function artistLinkSlug(artist = {}) {
    return slugForArtistLink(artist.paperwork?.artistSlug || artist.slug || artist.name || artist.artistId || artist.id || artist.skyeId || artist.email || state.lastArtistId, 'new-artist');
  }
  function workforcePacketHref(artist = {}) {
    const paperwork = artist.paperwork || {};
    return paperwork.workforceFormUrl || `${ARTIST_WORKFORCE_PACKET_URL}?source=SkyeMusicNexus&artist=${encodeURIComponent(artistLinkSlug(artist))}`;
  }
  function artistPaperworkLinks(artist = {}) {
    const paperwork = artist.paperwork || {};
    return {
      status: paperwork.status || 'required',
      legalPaymentNotice: paperwork.legalPaymentNotice || 'If paperwork is not completed, this artist cannot legally be paid through SkyePay.',
      payoutHoldReason: paperwork.payoutHoldReason || 'Paperwork must be completed and owner-approved before payout release.',
      workforceFormUrl: workforcePacketHref(artist),
      workforceCommandUrl: paperwork.workforceCommandUrl || ARTIST_WORKFORCE_COMMAND_URL,
      grayWorkforceFormUrl: paperwork.grayWorkforceFormUrl || `${ARTIST_WORKFORCE_PACKET_URL}?source=SkyeMusicNexus&artist=gray-skyes`,
      supaboyWorkforceFormUrl: paperwork.supaboyWorkforceFormUrl || `${ARTIST_WORKFORCE_PACKET_URL}?source=SkyeMusicNexus&artist=supaboy`,
      connectLogUrl: paperwork.connectLogUrl || ARTIST_CONNECTLOG_URL,
      relay13InboxUrl: paperwork.relay13InboxUrl || ARTIST_RELAY13_INBOX_URL,
    };
  }
  function paperworkComplete(artist = {}) {
    return ['complete','completed','approved','on_file','verified'].includes(String(artist.paperwork?.status || '').toLowerCase());
  }
  function ensureArtistContracts(artist = {}) {
    const links = artistPaperworkLinks(artist);
    const ready = paperworkComplete(artist);
    return {
      ...artist,
      paperwork: {
        ...(artist.paperwork || {}),
        requiredBeforePayout: true,
        payoutHold: !ready,
        status: artist.paperwork?.status || 'required',
        ...links,
      },
      communications: {
        ...(artist.communications || {}),
        connectLog: { ...(artist.communications?.connectLog || {}), href: links.connectLogUrl, label: 'ConnectLog relationship workspace', access: 'artist' },
        relay13: { ...(artist.communications?.relay13 || {}), href: links.relay13InboxUrl, label: 'Relay13 inbox', access: 'artist' },
      },
      skyepay: {
        ...(artist.skyepay || {}),
        trackingRef: artist.skyepay?.trackingRef || `skyepay_artist_${slugForArtistLink(artist.artistId || artist.id || artist.skyeId || artist.identityId, 'artist')}`,
        trackingStatus: artist.skyepay?.trackingStatus || 'reserved',
        payoutReview: artist.skyepay?.payoutReview || 'paperwork_required_before_payout',
        payoutEligibility: ready ? (artist.skyepay?.payoutEligibility === 'blocked_until_paperwork_complete' ? 'owner_review_required' : (artist.skyepay?.payoutEligibility || 'owner_review_required')) : 'blocked_until_paperwork_complete',
      },
    };
  }
  function musicFunctionBase() {
    const configured = window.METRAIYUX_API_BASES && window.METRAIYUX_API_BASES.skymusicnexus;
    if (configured) return `${String(configured).replace(/\/+$/, '')}/`;
    if (/^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname)) return '/.netlify/functions/';
    if (/(^|\.)skye-music-nexus\.pages\.dev$/i.test(window.location.hostname)) return 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skymusicnexus/';
    return '/api/skymusicnexus/';
  }
  const apiBase = musicFunctionBase();
  function standalonePagesHost() {
    return /(^|\.)skye-music-nexus\.pages\.dev$/i.test(window.location.hostname);
  }
  const staticPreviewOverride = window.SKYE_MUSIC_NEXUS_STATIC_PREVIEW;
  const explicitStaticPreview = window.SKYE_MUSIC_NEXUS_ALLOW_STATIC_PREVIEW === true
    && (staticPreviewOverride === true || new URLSearchParams(window.location.search).get('static_preview') === '1');
  const localStaticPreview = staticPreviewOverride !== false
    && window.location.protocol === 'http:'
    && /^(127\.0\.0\.1|localhost)$/.test(window.location.hostname);
  const staticPreview = explicitStaticPreview || localStaticPreview;
  const allowStaticFallback = staticPreview || window.SKYE_MUSIC_NEXUS_ALLOW_STATIC_FALLBACK === true;
  if (!allowStaticFallback) {
    state.social.feedItems = [];
    state.social.stories = [];
    state.social.summary = { connectors: 0, readyConnectors: 0, feedItems: 0, queuedPosts: 0, publishedPosts: 0, providerTokenRequired: 0 };
  }
  const auth = window.createSkyGateAuth ? window.createSkyGateAuth({ storageKey: 'skye_music_nexus_session' }) : null;
  const previewSeconds = 24;
  window.__SKYE_MUSIC_PLAYBACK = { isPlaying: false, queueLength: 0, mode: 'idle', currentTime: 0 };

  function toast(message, tone) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone || 'info';
    node.style.display = 'block';
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.style.display = 'none'; }, 4200);
  }

  function setLoading(form, loading) {
    if (!form) return;
    form.classList.toggle('is-loading', Boolean(loading));
  }

  function updateSessionChip(info) {
    const chip = $('#sessionChip');
    if (!chip) return;
    const musicGateSession = window.SkyeMusicGate && typeof window.SkyeMusicGate.session === 'function'
      ? window.SkyeMusicGate.session()
      : null;
    if ((auth && auth.hasToken()) || musicGateSession) {
      const session = info && info.activeSession;
      chip.textContent = session && session.email ? `Client: ${session.role || 'session'} / ${session.email}` : 'Client session active';
      chip.className = 'chip chip-ready';
    } else if (staticPreview) {
      chip.textContent = 'Client session preview';
      chip.className = 'chip chip-ready';
    } else {
      chip.textContent = 'Client access required';
      chip.className = 'chip chip-hot';
    }
  }

  function pageRoom() {
    const pageName = (window.location.pathname.split('/').pop() || 'index.html').replace(/\.html$/i, '') || 'index';
    if (document.body.dataset.mode === 'home') return 'home';
    return pageName === 'index' ? 'dashboard' : pageName;
  }

  function relativeProofHref() {
    return window.location.pathname.includes('/public/') ? '../proof.html' : './proof.html';
  }

  function ownerToolsPage() {
    const mode = document.body.dataset.mode || '';
    return mode === 'admin' || mode === 'operator' || ['admin', 'command-dashboard'].includes(pageRoom());
  }

  function ensureProofNavLink() {
    const nav = $('.nexus-nav');
    if (!ownerToolsPage()) return;
    if (!nav || nav.querySelector('[data-proof-link]')) return;
    const link = document.createElement('a');
    link.href = relativeProofHref();
    link.dataset.proofLink = 'true';
    link.textContent = 'Readiness';
    nav.appendChild(link);
  }

  function ensureCommandDashboardNavLink() {
    const nav = $('.nexus-nav');
    if (!ownerToolsPage()) return;
    if (!nav || nav.querySelector('[data-command-dashboard-link]')) return;
    const link = document.createElement('a');
    link.href = window.location.pathname.includes('/public/') ? './command-dashboard.html' : './public/command-dashboard.html';
    link.dataset.commandDashboardLink = 'true';
    link.textContent = 'Service Health';
    if (pageRoom() === 'command-dashboard') link.classList.add('active');
    nav.appendChild(link);
  }

  function ensureLivingArtistNavLinks() {
    const nav = $('.nexus-nav');
    if (!nav) return;
    const links = [
      { key: 'store', href: './store.html', label: 'Store' },
      { key: 'brain', href: './brain.html', label: 'Brain' },
    ];
    links.forEach((item) => {
      if (nav.querySelector(`[data-living-artist-link="${item.key}"], a[href="${item.href}"]`)) return;
      const link = document.createElement('a');
      link.href = window.location.pathname.includes('/public/') ? item.href : `./public/${item.href.replace('./', '')}`;
      link.dataset.livingArtistLink = item.key;
      link.textContent = item.label;
      if (pageRoom() === item.key) link.classList.add('active');
      nav.appendChild(link);
    });
  }

  function walkthroughGuide() {
    const guides = {
      home: {
        micro: 'start here',
        title: 'Use the Nexus from left to right.',
        text: 'Open the Workspace for the map, DAW or Upload Studio to create/import audio, Rights before playback/release, then Media, Brand, Drops, Feed, Store, and Artist Apps for rollout.',
        steps: ['Workspace shows every client room.', 'DAW starts new sessions while Upload Studio brings in finished audio.', 'Media, brand, upload, release, rights, drops, feed, exchange, and store rooms stay behind client access.'],
      },
      dashboard: {
        micro: 'artist workspace',
        title: 'Pick the room that matches the job.',
        text: 'Start with DAW for creation or Upload Studio for existing audio. Use Media Center, BrandID, kAIxUBrandKit, and BusinessLaunchGo to package the launch before publishing or playback.',
        steps: ['Use the room cards for navigation.', 'Send visuals, brand, logo, and offer work into the connected launch apps.', 'Open Rights when a track needs clearance before playback or release.'],
      },
      create: {
        micro: 'creation hub',
        title: 'Choose how the music enters the system.',
        text: 'Start a DAW session, import stems, or move straight to release/export lanes. The session remains tied to the shared client identity.',
        steps: ['Open DAW for new sessions.', 'Use Upload Studio for finished audio.', 'Send usable output to Release Forge.'],
      },
      upload: {
        micro: 'upload walkthrough',
        title: 'Import audio, then turn it into a release line.',
        text: 'Paste or create an Artist ID, choose the audio file, upload it through the protected upload service, then copy the generated track line into Release Forge.',
        steps: ['Artist ID identifies the owner.', 'The file goes through music-assets.', 'Release Forge links that uploaded stream to a release.'],
      },
      player: {
        micro: 'playback walkthrough',
        title: 'Play only what the rights state allows.',
        text: 'The player loads the protected release queue, checks linked audio/preview mode, and blocks uncleared rights states from pretending they are publish-ready.',
        steps: ['Refresh records after upload/release work.', 'Press play to prove audio advances.', 'Use Rights Vault if playback is blocked.'],
      },
      releases: {
        micro: 'release walkthrough',
        title: 'Create the artist, forge the release, then move operations.',
        text: 'Release Forge stores artist and release records, review state, payout movement, stream reports, and operations checkpoints.',
        steps: ['Register artist or confirm Skye ID bridge.', 'Submit release with tracks.', 'Queue review, publish intent, and operations only after rights are clear.'],
      },
      rights: {
        micro: 'rights walkthrough',
        title: 'Clear the song before the platform treats it as ready.',
        text: 'Ownership, preview use, distribution permission, takedown holds, and playback blocks are kept visible so nobody mistakes a preview for a cleared live distribution.',
        steps: ['Attach the release ID.', 'Set ownership/preview/distribution attestations.', 'Use holds when rights are uncertain.'],
      },
      exchange: {
        micro: 'exchange walkthrough',
        title: 'Request creative help and keep the thread attached.',
        text: 'Content requests, inbox messages, community posts, achievements, and campaign packs stay connected to the artist and release records.',
        steps: ['Create a content request from the release need.', 'Reply in the generated thread.', 'Build campaign copy when the rollout is ready.'],
      },
      drops: {
        micro: 'drop walkthrough',
        title: 'Build delivery pages after the release is ready.',
        text: 'Create a drop, submit it, batch it, send approval, then package it for publishing. Private delivery stays behind client access instead of becoming a public file dump.',
        steps: ['Create drop from artist/release IDs.', 'Submit and batch for approval.', 'Publish the approved release package.'],
      },
      discover: {
        micro: 'discover walkthrough',
        title: 'Browse the listener-facing release graph.',
        text: 'Discovery is for scanning previews, playlists, and artist lanes after releases and rights are in a usable state.',
        steps: ['Use this after releases exist.', 'Open the player for preview playback.', 'Return to Rights if a track is blocked.'],
      },
      feed: {
        micro: 'feed walkthrough',
        title: 'Post release moments from the same workspace.',
        text: 'The feed, stories, comments, saves, boosts, queue, and connector states stay attached to the artist release plan.',
        steps: ['Compose a release post.', 'Queue connected social posts.', 'Review queued posts before publishing.'],
      },
      admin: {
        micro: 'review walkthrough',
        title: 'Protected review work stays behind shared access.',
        text: 'This protected room is for review, payout, analytics, drops, exchange, social queue, and release inspection. It relies on the shared 0S access lane, not a separate app password.',
        steps: ['Review releases and operations state.', 'Inspect analytics and payout queues.', 'Use Readiness for service records and release checks.'],
      },
      'command-dashboard': {
        micro: 'live service health',
        title: 'Read the platform from live data first.',
        text: 'This owner-facing health view reads live SkyeMusicNexus visual data first, then clearly labels sample data if the service cannot answer. Use it to see analytics, service health, activity records, and workflow counts.',
        steps: ['Check the data-source line first.', 'Service cards show which areas have retained events.', 'Activity rows show successful release actions by actor, action, route, and status.'],
      },
      exports: {
        micro: 'export walkthrough',
        title: 'Package usable outputs for the release lane.',
        text: 'Exports should end in a track line, manifest, or handoff that Release Forge and Drops can understand.',
        steps: ['Confirm artist/release IDs.', 'Export the manifest.', 'Move the result to Release Forge or Drops.'],
      },
      stems: {
        micro: 'stem walkthrough',
        title: 'Keep private working files tied to delivery rules.',
        text: 'Stem work belongs behind client access and should move into private delivery only after the recipient and rights state are confirmed.',
        steps: ['Organize stems by artist/release.', 'Keep private delivery protected.', 'Record the handoff in Drops or Releases.'],
      },
    };
    return guides[pageRoom()] || guides.dashboard;
  }

  function injectWalkthroughGuide() {
    if (document.querySelector('[data-nexus-walkthrough]')) return;
    const shell = $('.nexus-shell');
    if (!shell) return;
    const guide = walkthroughGuide();
    const node = document.createElement('section');
    node.className = 'panel-xl nexus-guidance';
    node.dataset.nexusWalkthrough = 'true';
    node.innerHTML = `
      <div class="nexus-guidance-copy">
        <p class="micro">${escapeHtml(guide.micro)}</p>
        <h2>${escapeHtml(guide.title)}</h2>
        <p>${escapeHtml(guide.text)}</p>
      </div>
      <div class="nexus-guidance-steps">
        ${guide.steps.map((step, index) => `<article><span>${index + 1}</span><strong>${escapeHtml(step)}</strong></article>`).join('')}
      </div>
      <div class="nexus-guidance-actions">
        ${ownerToolsPage() ? `<a class="ghost mini" href="${relativeProofHref()}">Owner readiness</a>` : '<a class="ghost mini" href="./releases.html">Open releases</a>'}
        <button class="ghost mini" type="button" data-action="refresh-records">Refresh records</button>
      </div>`;
    shell.insertBefore(node, shell.firstElementChild);
  }

  async function readJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Request failed with ${response.status}`);
    }
    return data;
  }

  async function callFunction(name, options = {}) {
    if (staticPreview) return staticFunctionResponse(name, options);
    const url = new URL(apiBase + name, window.location.origin);
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') url.searchParams.set(key, value);
    });
    const init = {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
    };
    if (options.body) init.body = JSON.stringify(options.body);
    const needsAuth = options.auth !== false;
    let response;
    try {
      response = needsAuth && auth ? await auth.fetch(url.toString(), init) : await fetch(url.toString(), init);
    } catch (err) {
      if (allowStaticFallback) return staticFunctionResponse(name, options);
      throw err;
    }
    if ([401, 403, 404].includes(response.status) && allowStaticFallback) {
      return staticFunctionResponse(name, options);
    }
    return readJson(response);
  }

  function staticId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function ensureStaticCollections() {
    if (!Array.isArray(state.artists)) state.artists = [];
    if (!Array.isArray(state.releases)) state.releases = [];
    if (!Array.isArray(state.assets)) state.assets = [];
    if (!Array.isArray(state.payouts)) state.payouts = [];
    if (!Array.isArray(state.workflows)) state.workflows = [];
    if (!state.drops || typeof state.drops !== 'object') state.drops = {};
    if (!Array.isArray(state.drops.items)) state.drops.items = [];
    if (!Array.isArray(state.drops.batches)) state.drops.batches = [];
    if (!Array.isArray(state.drops.deploys)) state.drops.deploys = [];
    if (!state.drops.trafficSummary) {
      state.drops.trafficSummary = { total: 0, pageViews: 0, playStarts: 0, nexusStreams: 0, completePlays: 0, downloads: 0 };
    }
    if (!state.drops.env) {
      state.drops.env = {
        netlify: { configured: false, liveDeployEnabled: false },
        email: { provider: 'local-receipt', configured: false },
        privateStorage: { configured: false, mode: 'browser-static-preview' },
      };
    }
    if (!state.drops.estimate) state.drops.estimate = { estimatedCredits: 15, estimatedBandwidthGb: 0, fitsReserve: true };
    if (!state.exchange || typeof state.exchange !== 'object') state.exchange = {};
    ['contentRequests', 'threads', 'communityPosts', 'campaigns'].forEach((key) => {
      if (!Array.isArray(state.exchange[key])) state.exchange[key] = [];
    });
    if (!state.exchange.progress) {
      state.exchange.progress = {
        points: 50,
        level: 1,
        nextLevelAt: 300,
        percentToNext: 17,
        counts: { contentRequests: 0, communityPosts: 0, inboxThreads: 0, campaigns: 0 },
        achievements: [],
        missions: [],
      };
    }
    if (!state.social || typeof state.social !== 'object') state.social = {};
    ['catalog', 'connectors', 'postQueue', 'feedItems', 'stories', 'feedPulls', 'moderation', 'feedActions', 'follows', 'notifications', 'profiles', 'media', 'prRuns', 'featuredBlogs', 'marketingPackages', 'contestBriefs'].forEach((key) => {
      if (!Array.isArray(state.social[key])) state.social[key] = [];
    });
    if (!state.social.feedItems.length) state.social.feedItems = starterSocial.feedItems.slice();
    if (!state.social.stories.length) state.social.stories = starterSocial.stories.slice();
    if (!state.social.summary) state.social.summary = { ...starterSocial.summary };
    if (!state.store || typeof state.store !== 'object') state.store = {};
    ['stores', 'products', 'orders', 'fulfillments'].forEach((key) => {
      if (!Array.isArray(state.store[key])) state.store[key] = [];
    });
    if (!state.store.summary) state.store.summary = { stores: 0, products: 0, activeProducts: 0, orders: 0, pendingOrders: 0, grossCents: 0, platformFeeCents: 0, artistNetCents: 0 };
    if (!state.brains || typeof state.brains !== 'object') state.brains = {};
    ['profiles', 'memory', 'actions', 'cycles', 'toolRuns'].forEach((key) => {
      if (!Array.isArray(state.brains[key])) state.brains[key] = [];
    });
    if (!Array.isArray(state.brains.toolCatalog)) state.brains.toolCatalog = [];
    if (!state.brains.summary) state.brains.summary = { profiles: 0, memory: 0, actions: 0, executedActions: 0, cycles: 0, toolRuns: 0, providerRequired: false };
    if (!state.gamify || typeof state.gamify !== 'object') state.gamify = {};
    ['meters', 'merits', 'events', 'giveaways', 'entries'].forEach((key) => {
      if (!Array.isArray(state.gamify[key])) state.gamify[key] = [];
    });
    if (!state.gamify.summary) state.gamify.summary = { meters: 0, merits: 0, events: 0, giveaways: 0, openGiveaways: 0, entries: 0, totalLifetimePoints: 0, totalMeritBalance: 0, nextMeritAt: 100 };
    if (!state.contests || typeof state.contests !== 'object') state.contests = {};
    ['contests', 'entries', 'featurePackages', 'backlinks', 'winners'].forEach((key) => {
      if (!Array.isArray(state.contests[key])) state.contests[key] = [];
    });
    if (!state.contests.summary) state.contests.summary = { contests: 0, open: 0, entries: 0, winners: 0, featurePackages: 0, approvedFeaturePackages: 0, pendingBacklinks: 0 };
  }

  function refreshStaticDropEstimate() {
    ensureStaticCollections();
    const dropCount = state.drops.items.length;
    const batchCount = state.drops.batches.length;
    state.drops.estimate = {
      estimatedCredits: Math.max(15, dropCount * 4 + batchCount * 3),
      estimatedBandwidthGb: Number((dropCount * 0.015).toFixed(3)),
      fitsReserve: true,
    };
  }

  function staticDropEnvelope(extra = {}) {
    ensureStaticCollections();
    refreshStaticDropEstimate();
    return {
      ok: true,
      drops: state.drops.items,
      batches: state.drops.batches,
      deploys: state.drops.deploys,
      trafficSummary: state.drops.trafficSummary,
      env: state.drops.env,
      estimate: state.drops.estimate,
      previewOnly: true,
      ...extra,
    };
  }

  function findStaticBatch(batchId) {
    ensureStaticCollections();
    return state.drops.batches.find((batch) => batch.batchId === batchId) || state.drops.batches[0] || null;
  }

  function writeStaticDrop(action, body = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    if (action === 'create-drop') {
      const drop = {
        dropId: body.dropId || staticId('drop'),
        artistId: body.artistId || state.lastArtistId || 'static_preview_artist',
        artistName: body.artistName || 'Static Preview Artist',
        releaseId: body.releaseId || state.lastReleaseId || '',
        title: body.title || 'Untitled MusicNexus Drop',
        dropType: body.dropType || 'single_drop',
        visibility: body.visibility || 'public',
        rightsStatus: body.rightsStatus || 'preview-ready',
        tierPolicy: body.tierPolicy || 'free99-lite',
        story: body.story || '',
        coverArtUrl: body.coverArtUrl || '',
        appName: body.appName || '',
        pwaEnabled: body.pwaEnabled === true || body.dropType === 'app_drop',
        artistPageUrl: body.artistPageUrl || '',
        socialLinks: body.socialLinks && typeof body.socialLinks === 'object' ? body.socialLinks : {},
        brandedVideos: Array.isArray(body.brandedVideos) ? body.brandedVideos : [],
        downloadAllowed: body.downloadAllowed === true,
        tracks: Array.isArray(body.tracks) && body.tracks.length ? body.tracks : [{ title: body.title || 'Untitled Signal', duration: 180, previewUrl: '' }],
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        previewOnly: true,
      };
      state.drops.items.unshift(drop);
      state.lastArtistId = drop.artistId;
      if (drop.releaseId) state.lastReleaseId = drop.releaseId;
      return staticDropEnvelope({ drop });
    }
    if (action === 'submit-drop') {
      const drop = state.drops.items.find((item) => item.dropId === body.dropId) || state.drops.items[0];
      if (!drop) throw new Error('Create a drop draft before submitting to the release pool.');
      drop.status = 'deploy-pool';
      drop.updatedAt = now;
      return staticDropEnvelope({ drop });
    }
    if (action === 'form-batch') {
      const requested = Array.isArray(body.dropIds) ? body.dropIds.filter(Boolean) : [];
      const candidates = requested.length
        ? state.drops.items.filter((drop) => requested.includes(drop.dropId))
        : state.drops.items.filter((drop) => drop.status === 'deploy-pool');
      const selected = candidates.length ? candidates : state.drops.items;
      if (!selected.length) throw new Error('Create or submit at least one drop before forming a batch.');
      selected.forEach((drop) => {
        drop.status = 'batched';
        drop.updatedAt = now;
      });
      const batch = {
        batchId: staticId('batch'),
        dropIds: selected.map((drop) => drop.dropId),
        status: 'formed',
        estimatedCredits: Math.max(15, selected.length * 4),
        createdAt: now,
        updatedAt: now,
        autoApprovalEligibleAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        previewOnly: true,
      };
      state.drops.batches.unshift(batch);
      return staticDropEnvelope({ batch });
    }
    const batch = findStaticBatch(body.batchId);
    if (!batch) throw new Error('Form a batch before running this release action.');
    batch.updatedAt = now;
    if (action === 'send-approval') {
      batch.status = 'approval-sent';
      return staticDropEnvelope({ batch, approval: { approvalId: staticId('approval'), status: 'sent-preview', createdAt: now } });
    }
    if (action === 'approve-batch') {
      batch.status = 'approved';
      return staticDropEnvelope({ batch, receipt: { approvalId: staticId('manual_approval'), status: 'approved-preview', createdAt: now } });
    }
    if (action === 'run-approval-brain') {
      batch.status = 'auto-approved';
      return staticDropEnvelope({ batch, receipt: { approvalId: staticId('brain_approval'), status: 'auto-approved-preview', createdAt: now } });
    }
    if (action === 'build-static-bundle') {
      batch.status = 'bundle-built';
      batch.outputDir = `browser-static-bundle/${batch.batchId}`;
      return staticDropEnvelope({ batch, outputDir: batch.outputDir });
    }
    if (action === 'publish-batch') {
      batch.status = 'deploy-intent-written';
      const deploy = {
        deployReceiptId: staticId('deploy_receipt'),
        batchId: batch.batchId,
        status: 'intent-preview',
        mode: 'cloudflare-static-preview',
        outputDir: batch.outputDir || `browser-static-bundle/${batch.batchId}`,
        liveBaseUrl: '',
        redacted: true,
        createdAt: now,
      };
      state.drops.deploys.unshift(deploy);
      return staticDropEnvelope({ batch, deploy });
    }
    return staticDropEnvelope();
  }

  function writeStaticArtist(action, body = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    const id = body.id || body.artistId || body.skyeId || staticId('artist');
    const onboardingProfile = compactObject(body.onboardingProfile || body.artistProfile || body.profileGeneration || {});
    let artist = state.artists.find((item) => item.id === id || item.skyeId === id);
    if (!artist) {
      artist = ensureArtistContracts({
        id,
        artistId: body.artistId || id,
        skyeId: body.skyeId || id,
        identityId: body.identityId || body.skyeId || id,
        name: body.name || 'Static Preview Artist',
        email: body.email || '',
        genre: body.genre || [],
        bio: body.bio || '',
        status: action === 'approve' ? 'active' : 'pending',
        balance: 0,
        profilePhoto: body.profilePhoto || null,
        crossAppIdentity: body.crossAppIdentity || null,
        socialLinks: body.socialLinks && typeof body.socialLinks === 'object' ? body.socialLinks : {},
        onboardingProfile: hasStructuredValue(onboardingProfile) ? onboardingProfile : null,
        paperwork: body.paperwork || { status: 'required', acknowledgedAt: body.paperworkAcknowledgedAt || now },
        createdAt: now,
        previewOnly: true,
      });
      state.artists.unshift(artist);
    } else {
      Object.assign(artist, {
        name: body.name || artist.name,
        email: body.email || artist.email,
        genre: Array.isArray(body.genre) ? body.genre : artist.genre,
        bio: body.bio || artist.bio || '',
        phone: body.phone || artist.phone || '',
        profilePhoto: body.profilePhoto || artist.profilePhoto || null,
        crossAppIdentity: body.crossAppIdentity || artist.crossAppIdentity || null,
        socialLinks: body.socialLinks && typeof body.socialLinks === 'object' ? body.socialLinks : (artist.socialLinks || {}),
        onboardingProfile: hasStructuredValue(onboardingProfile) ? { ...(artist.onboardingProfile || {}), ...onboardingProfile, updatedAt: now } : (artist.onboardingProfile || null),
        updatedAt: now,
      });
    }
    artist = ensureArtistContracts(artist);
    const index = state.artists.findIndex((item) => item.id === artist.id || item.skyeId === artist.skyeId);
    if (index >= 0) state.artists[index] = artist;
    if (action === 'approve') artist.status = 'active';
    state.lastArtistId = artist.id;
    return { ok: true, artistId: artist.id, artist, artists: state.artists, previewOnly: true };
  }

  function writeStaticRelease(action, body = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    const id = body.id || body.releaseId || staticId('release');
    let release = state.releases.find((item) => item.id === id);
    if (!release) {
      release = {
        id,
        artistId: body.artistId || state.lastArtistId || 'static_preview_artist',
        title: body.title || body.releaseTitle || 'Static Preview Release',
        type: body.type || 'single',
        status: 'submitted',
        releaseDate: body.releaseDate || '',
        tracks: Array.isArray(body.tracks) && body.tracks.length ? body.tracks : [{ title: body.title || 'Static Preview Track', duration: 180, previewUrl: '' }],
        distributionTargets: body.distributionTargets || ['SkyeMusicNexus Player'],
        analytics: { streams: 0, downloads: 0, saves: 0, plays: 0, listenSeconds: 0 },
        rights: { status: 'preview-ready', ownershipAttested: true, previewUseAuthorized: true, distributionAuthorized: false },
        submittedAt: now,
        previewOnly: true,
      };
      state.releases.unshift(release);
    }
    if (action === 'review') release.status = body.decision === 'reject' ? 'needs-review' : 'reviewed';
    if (action === 'publish') {
      release.status = 'live';
      release.publishedAt = now;
    }
    if (action === 'report-streams') {
      release.analytics = {
        ...release.analytics,
        streams: Number(release.analytics?.streams || 0) + Number(body.streams || 0),
        downloads: Number(release.analytics?.downloads || 0) + Number(body.downloads || 0),
        saves: Number(release.analytics?.saves || 0) + Number(body.saves || 0),
      };
    }
    if (action === 'queue-operations') {
      const workflow = { id: staticId('workflow'), releaseId: release.id, owner: body.owner || 'artist-team', checkpoint: body.checkpoint || 'Runway check', notes: body.notes || '', status: body.status || 'queued', createdAt: now };
      state.workflows.unshift(workflow);
      return { ok: true, workflow, workflows: state.workflows, release, previewOnly: true };
    }
    if (action === 'update-rights') {
      release.rights = { ...(release.rights || {}), ...(body.rights || {}), status: 'preview-ready' };
      return { ok: true, release, rights: release.rights, previewOnly: true };
    }
    if (action === 'takedown-request') {
      release.rights = { ...(release.rights || {}), status: 'blocked', takedownHold: true, playbackBlocked: true, takedownContactEmail: body.requesterEmail || '' };
      return { ok: true, release, rights: release.rights, request: { id: staticId('takedown'), reason: body.reason || '', createdAt: now }, previewOnly: true };
    }
    state.lastArtistId = release.artistId;
    state.lastReleaseId = release.id;
    return { ok: true, release, releases: state.releases, previewOnly: true };
  }

  function writeStaticAsset(action, body = {}) {
    ensureStaticCollections();
    if (action === 'create-upload-session') {
      const asset = { id: staticId('asset'), ...body, storage: 'browser-static-preview', status: 'upload-session-preview' };
      return { ok: true, asset, upload: { url: 'data:application/octet-stream,static-preview', method: 'PUT', headers: { 'content-type': body.contentType || 'audio/mpeg' } }, previewOnly: true };
    }
    const asset = {
      id: body.id || staticId('asset'),
      artistId: body.artistId || state.lastArtistId || 'static_preview_artist',
      releaseId: body.releaseId || state.lastReleaseId || '',
      title: body.title || body.fileName || 'Static Preview Audio',
      fileName: body.fileName || 'static-preview-audio.mp3',
      contentType: body.contentType || 'audio/mpeg',
      bytes: Number(body.bytes || 0),
      streamUrl: '',
      sha256: staticId('sha').replace('sha_', ''),
      storage: 'browser-static-preview',
      status: 'ready',
      previewOnly: true,
    };
    state.assets.unshift(asset);
    state.lastArtistId = asset.artistId;
    if (asset.releaseId) state.lastReleaseId = asset.releaseId;
    return { ok: true, asset, assets: state.assets, storage: state.assetStorage, previewOnly: true };
  }

  function writeStaticPayment(action, body = {}) {
    ensureStaticCollections();
    const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
    const artist = state.artists.find((item) => [item.id, item.artistId, item.skyeId, item.identityId].includes(artistId)) || { id: artistId, name: artistId, paperwork: { status: 'required' } };
    const paperwork = artistPaperworkLinks(artist);
    if (action === 'complete-payout' && !paperworkComplete(artist)) {
      const existing = state.payouts.find((item) => item.id === body.payoutId) || { id: body.payoutId || staticId('payout'), artistId, amount: Number(body.amount || 0), createdAt: new Date().toISOString() };
      Object.assign(existing, { status: 'paperwork_hold', holdReason: paperwork.payoutHoldReason, paperwork });
      state.payouts = state.payouts.some((item) => item.id === existing.id) ? state.payouts.map((item) => item.id === existing.id ? existing : item) : [existing, ...state.payouts];
      return { ok: false, error: 'paperwork_required_before_payout', payout: existing, paperwork, payouts: state.payouts, previewOnly: true };
    }
    const payout = { id: body.payoutId || staticId('payout'), artistId, amount: Number(body.amount || 0), status: action === 'complete-payout' ? 'completed' : (paperworkComplete(artist) ? 'pending_owner_approval' : 'paperwork_hold'), holdReason: paperworkComplete(artist) ? '' : paperwork.payoutHoldReason, paperwork, payoutMethod: 'static-preview', createdAt: new Date().toISOString() };
    if (action === 'complete-payout') state.payouts = state.payouts.map((item) => item.id === payout.id ? payout : item);
    else state.payouts.unshift(payout);
    return { ok: true, balance: Number(body.amount || 0), entry: { id: staticId('ledger'), amount: Number(body.amount || 0) }, payout, payouts: state.payouts, previewOnly: true };
  }

  function writeStaticExchange(action, body = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    if (action === 'request-content') {
      const request = { id: staticId('request'), threadId: staticId('thread'), artistId: body.artistId || state.lastArtistId, releaseId: body.releaseId || '', requestType: body.requestType || 'content', title: body.title || 'Content request', brief: body.brief || '', budgetLane: body.budgetLane || 'standard', dueAt: body.dueAt || '', status: 'open', createdAt: now };
      state.exchange.contentRequests.unshift(request);
      return { ok: true, request, previewOnly: true };
    }
    if (action === 'send-message') {
      const thread = { id: staticId('thread'), artistId: body.artistId || state.lastArtistId, topic: body.topic || 'Artist inbox', messages: [{ body: body.body || '', createdAt: now }], relay: { status: 'static-preview-receipted' } };
      state.exchange.threads.unshift(thread);
      return { ok: true, thread, previewOnly: true };
    }
    if (action === 'publish-community') {
      const post = { id: staticId('community'), artistId: body.artistId || state.lastArtistId, linkedReleaseId: body.linkedReleaseId || '', category: body.category || 'signal', body: body.body || '', status: 'published-preview', createdAt: now };
      state.exchange.communityPosts.unshift(post);
      return { ok: true, post, previewOnly: true };
    }
    if (action === 'build-release-campaign') {
      const campaign = { id: staticId('campaign'), artistId: body.artistId || state.lastArtistId, releaseId: body.releaseId || state.lastReleaseId, releaseTitle: body.releaseTitle || 'Static Preview Release', mood: body.mood || '', platforms: body.platforms || '', offerLane: body.offerLane || 'download', status: 'built-preview', createdAt: now };
      state.exchange.campaigns.unshift(campaign);
      return { ok: true, campaign, previewOnly: true };
    }
    return { ok: true, ...state.exchange, previewOnly: true };
  }

  function staticSocialPrPackage(body = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    const artistId = body.winnerArtistId || body.artistId || state.lastArtistId || 'static_preview_artist';
    const artist = state.artists.find((item) => [item.id, item.artistId, item.slug].includes(artistId)) || { id: artistId, artistId, name: artistId, slug: artistId };
    const release = state.releases.find((item) => item.id === body.releaseId || item.artistId === artistId) || { id: body.releaseId || state.lastReleaseId || 'static_preview_release', title: body.focus || 'Nexus Signal Preview', artistId };
    const slug = String(body.slug || `${artist.name || artistId}-${release.title || 'feature'}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'music-feature';
    const featuredBlogId = body.featuredBlogId || staticId('featured_blog');
    const title = body.title || `${artist.name || artistId} turns ${release.title || 'a new drop'} into a Nexus moment`;
    const summary = body.summary || `${artist.name || artistId} has a SkyeMusicNexus feature packet with the player, feed, storefront, and PR links moving together.`;
    const links = [
      { label: 'Artist storefront', href: `https://skye-music-nexus.pages.dev/artist-storefronts/${artist.slug || artistId}/`, rel: 'noopener noreferrer' },
      { label: 'Nexus player', href: 'https://skye-music-nexus.pages.dev/public/player.html', rel: 'noopener noreferrer' },
      { label: 'Social feed', href: 'https://skye-music-nexus.pages.dev/public/feed.html', rel: 'noopener noreferrer' },
    ];
    const blog = { featuredBlogId, id: featuredBlogId, slug, title, summary, artistId, artistName: artist.name || artistId, releaseId: release.id || '', releaseTitle: release.title || '', markdown: `# ${title}\n\n${summary}\n`, html: `<article><h1>${title}</h1><p>${summary}</p></article>`, links, status: 'drafted_for_owner_review', disclosure: body.contestId ? 'Contest winner editorial feature pending owner approval.' : 'SkyeMusicNexus editorial feature pending owner approval.', createdAt: now, updatedAt: now, previewOnly: true };
    const marketingPackage = { marketingPackageId: body.marketingPackageId || staticId('marketing_pkg'), featuredBlogId, artistId, releaseId: blog.releaseId, status: 'ready_for_owner_review', providerRequired: false, providerCallMade: false, socialPosts: [{ channel: 'nexus-feed', caption: title, href: links[2].href }], seo: { keywords: ['SkyeMusicNexus', 'independent artists', 'new music'], canonicalPath: `/blog/${slug}.html`, internalLinks: links }, skynetIntent: { projectId: 'skyemusicnexus-pr-agent', mountPath: `/skyenet/skyemusicnexus-pr-agent/${slug}`, publicAccess: true, readyForOwnerDeploy: true, tool: 'tools/skyenet-deploy.mjs' }, createdAt: now, updatedAt: now, previewOnly: true };
    const prRun = { prRunId: body.prRunId || staticId('pr_run'), artistId, releaseId: blog.releaseId, featuredBlogId, marketingPackageId: marketingPackage.marketingPackageId, focus: body.focus || 'new drop and artist story', status: 'drafted_for_owner_review', providerRequired: false, providerCallMade: false, targetSite: body.targetSite || 'devoderator-and-skymusicnexus', source: 'local-skymusicnexus-pr-brain', createdAt: now, updatedAt: now, previewOnly: true };
    prRun.id = prRun.prRunId;
    return { prRun, blog, marketingPackage };
  }

  function writeStaticSocial(action, body = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    if (action === 'save-connector') {
      const connector = { id: staticId('connector'), platform: body.platform || 'mastodon', platformName: body.platform || 'Open social', name: body.name || 'Static connector', handle: body.handle || '', instanceUrl: body.instanceUrl || '', tokenStatus: body.tokenEnvKey ? 'env-key-set' : 'token-required', defaultVisibility: body.defaultVisibility || 'public', createdAt: now };
      state.social.connectors.unshift(connector);
      return { ok: true, connector, previewOnly: true };
    }
    if (action === 'create-feed-post' || action === 'queue-post') {
      const post = { id: staticId('post'), type: 'release-post', source: 'musicnexus', status: action === 'queue-post' ? 'queued-preview' : 'local-preview', artistId: body.artistId || state.lastArtistId || 'static_preview_artist', releaseId: body.releaseId || state.lastReleaseId || '', author: body.artistId || 'Preview Artist', handle: 'skye:preview', avatar: 'SP', title: 'MusicNexus post', caption: body.caption || '', hashtags: parseCsv(body.hashtags), media: { kind: 'external', url: body.mediaUrl || '', altText: body.altText || '' }, stats: { likes: 0, saves: 0, boosts: 0, comments: [] }, platform: body.connectorId || body.visibility || 'local-feed', createdAt: now };
      if (action === 'queue-post') state.social.postQueue.unshift(post);
      state.social.feedItems.unshift(post);
      return { ok: true, post, previewOnly: true };
    }
    if (action === 'publish-post') {
      const post = state.social.postQueue.find((item) => item.id === body.postId) || state.social.postQueue[0] || state.social.feedItems[0];
      if (post) post.status = 'provider-token-required';
      return { ok: true, post, publication: { ok: false, note: 'Preview queued the connected publish intent.' }, previewOnly: true };
    }
    if (action === 'sync-feed') {
      const pull = { id: staticId('feed_pull'), connectorId: body.connectorId || '', artistId: body.artistId || state.lastArtistId, hashtag: body.hashtag || '', statusCount: 3, sourceUrl: body.hashtag ? `#${body.hashtag}` : 'static-preview', createdAt: now };
      state.social.feedPulls.unshift(pull);
      return { ok: true, pull, previewOnly: true };
    }
    if (action === 'feed-action') {
      const post = state.social.feedItems.find((item) => item.id === body.targetId) || state.social.feedItems[0];
      if (post && body.feedAction === 'comment') post.stats.comments.push({ id: staticId('comment'), artistId: body.artistId || state.lastArtistId, body: body.body || '', createdAt: now });
      if (post && body.feedAction === 'like') post.stats.likes += 1;
      if (post && body.feedAction === 'save') post.stats.saves += 1;
      if (post && body.feedAction === 'boost') post.stats.boosts += 1;
      if (post && body.feedAction === 'follow') state.social.follows.unshift({ followId: staticId('follow'), followerArtistId: body.artistId || state.lastArtistId, targetArtistId: post.artistId || '', status: 'following', createdAt: now });
      return { ok: true, post, previewOnly: true };
    }
    if (action === 'run-pr-agent') {
      const built = staticSocialPrPackage(body);
      state.social.prRuns.unshift(built.prRun);
      state.social.featuredBlogs.unshift(built.blog);
      state.social.marketingPackages.unshift(built.marketingPackage);
      const post = { id: staticId('feed'), type: 'featured-blog', source: 'skymusicnexus-pr-agent', status: 'published', artistId: built.blog.artistId, author: built.blog.artistName, title: built.blog.title, caption: built.blog.summary, hashtags: ['musicnexus', 'artistfeature', 'newmusic'], stats: { likes: 0, saves: 0, boosts: 0, comments: [] }, createdAt: now, previewOnly: true };
      state.social.feedItems.unshift(post);
      return { ok: true, run: built.prRun, blog: built.blog, marketingPackage: built.marketingPackage, skynetIntent: built.marketingPackage.skynetIntent, feedPost: post, previewOnly: true };
    }
    if (action === 'publish-feature-blog') {
      const blog = state.social.featuredBlogs.find((item) => item.featuredBlogId === body.featuredBlogId || item.id === body.featuredBlogId) || state.social.featuredBlogs[0];
      if (blog) {
        blog.status = 'published_to_skynet_queue';
        blog.publishedAt = now;
        blog.liveUrl = body.liveUrl || `https://skye-music-nexus.pages.dev/public/feed.html#featured-${blog.slug || blog.featuredBlogId}`;
      }
      return { ok: true, blog, skynetIntent: blog ? { projectId: 'skyemusicnexus-pr-agent', mountPath: `/skyenet/skyemusicnexus-pr-agent/${blog.slug || blog.featuredBlogId}`, readyForOwnerDeploy: true } : null, previewOnly: true };
    }
    return { ok: true, ...state.social, previewOnly: true };
  }

  function staticStoreSummary() {
    ensureStaticCollections();
    const products = state.store.products;
    const orders = state.store.orders;
    return {
      stores: state.store.stores.length,
      products: products.length,
      activeProducts: products.filter((product) => product.status === 'active').length,
      orders: orders.length,
      pendingOrders: orders.filter((order) => !['fulfilled', 'refunded'].includes(order.status)).length,
      grossCents: orders.reduce((sum, order) => sum + Number(order.subtotalCents || 0), 0),
      platformFeeCents: orders.reduce((sum, order) => sum + Number(order.platformFeeCents || 0), 0),
      artistNetCents: orders.reduce((sum, order) => sum + Number(order.artistNetCents || 0), 0),
    };
  }

  function writeStaticStore(action, body = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    if (action === 'upsert-store') {
      const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
      let store = state.store.stores.find((item) => item.artistId === artistId || item.storeId === body.storeId);
      if (!store) {
        store = { storeId: body.storeId || staticId('store'), artistId, createdAt: now };
        state.store.stores.unshift(store);
      }
      Object.assign(store, {
        artistId,
        artistName: body.artistName || store.artistName || artistId,
        name: body.name || store.name || `${body.artistName || artistId} Nexus Store`,
        slug: body.slug || store.slug || String(body.name || body.artistName || artistId).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        bio: body.bio || store.bio || '',
        status: body.status || store.status || 'active',
        feeMode: body.feeMode || store.feeMode || 'buyer_covered',
        fulfillmentEmail: body.fulfillmentEmail || store.fulfillmentEmail || '',
        supportUrl: body.supportUrl || store.supportUrl || '',
        updatedAt: now,
        previewOnly: true,
      });
      state.lastArtistId = artistId;
      state.store.summary = staticStoreSummary();
      return { ok: true, store, summary: state.store.summary, previewOnly: true };
    }
    if (action === 'create-product') {
      const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
      if (!state.store.stores.some((item) => item.artistId === artistId)) writeStaticStore('upsert-store', { artistId, artistName: body.artistName });
      const store = state.store.stores.find((item) => item.artistId === artistId);
      const product = {
        productId: body.productId || staticId('prod'),
        id: body.productId || staticId('prod'),
        storeId: store.storeId,
        artistId,
        releaseId: body.releaseId || state.lastReleaseId || '',
        dropId: body.dropId || '',
        title: body.title || 'Nexus Store Item',
        description: body.description || '',
        productType: body.productType || body.type || 'digital',
        priceCents: Number(body.priceCents || body.amountCents || 0) || 0,
        currency: body.currency || 'USD',
        inventory: body.inventory === '' || body.inventory == null ? null : Number(body.inventory) || 0,
        imageUrl: body.imageUrl || '',
        fulfillmentType: body.fulfillmentType || 'manual',
        status: body.status || 'active',
        createdAt: now,
        updatedAt: now,
        previewOnly: true,
      };
      product.id = product.productId;
      state.store.products = state.store.products.filter((item) => item.productId !== product.productId && item.id !== product.productId);
      state.store.products.unshift(product);
      staticGamifyRecord({ artistId, activityType: 'store_product', releaseId: product.releaseId, source: 'static-store' });
      state.store.summary = staticStoreSummary();
      return { ok: true, product, store, summary: state.store.summary, previewOnly: true };
    }
    if (action === 'record-order') {
      const product = state.store.products.find((item) => item.productId === body.productId || item.id === body.productId) || state.store.products[0];
      if (!product) throw new Error('Create a store product before recording an order.');
      const quantity = Math.max(1, Number(body.quantity || 1) || 1);
      const subtotalCents = Number(product.priceCents || 0) * quantity;
      const platformFeeCents = Math.round(subtotalCents * 0.13);
      const feeMode = body.feeMode || 'buyer_covered';
      const order = {
        orderId: body.orderId || staticId('order'),
        artistId: product.artistId,
        storeId: product.storeId,
        productId: product.productId || product.id,
        title: product.title,
        quantity,
        currency: product.currency || 'USD',
        subtotalCents,
        platformFeeBps: 1300,
        platformFeeCents,
        totalCents: feeMode === 'buyer_covered' ? subtotalCents + platformFeeCents : subtotalCents,
        artistNetCents: feeMode === 'buyer_covered' ? subtotalCents : Math.max(0, subtotalCents - platformFeeCents),
        feeMode,
        buyerEmail: body.buyerEmail || '',
        fanNote: body.fanNote || body.note || '',
        status: 'pending_skyepay_checkout',
        fulfillmentStatus: 'not_started',
        checkoutIntent: { provider: 'skypay', providerRequiredForMoneyMovement: true, url: `/skyepay-store.html?client=metraiyux-0s&offer=skyemusicnexus-artist-store&orderId=${encodeURIComponent(body.orderId || 'preview')}` },
        createdAt: now,
        updatedAt: now,
        previewOnly: true,
      };
      state.store.orders.unshift(order);
      staticGamifyRecord({ artistId: order.artistId, activityType: 'store_order', releaseId: product.releaseId || '', source: 'static-store' });
      state.store.summary = staticStoreSummary();
      return { ok: true, order, checkoutIntent: order.checkoutIntent, summary: state.store.summary, previewOnly: true };
    }
    if (action === 'fulfill-order') {
      const order = state.store.orders.find((item) => item.orderId === body.orderId || item.id === body.orderId) || state.store.orders[0];
      if (!order) throw new Error('No order found.');
      const fulfillment = { fulfillmentId: staticId('fulfill'), orderId: order.orderId, artistId: order.artistId, status: body.status || 'fulfilled', note: body.note || '', trackingUrl: body.trackingUrl || '', createdAt: now };
      order.status = fulfillment.status === 'fulfilled' ? 'fulfilled' : order.status;
      order.fulfillmentStatus = fulfillment.status;
      order.updatedAt = now;
      state.store.fulfillments.unshift(fulfillment);
      state.store.summary = staticStoreSummary();
      return { ok: true, order, fulfillment, summary: state.store.summary, previewOnly: true };
    }
    if (action === 'publish-skynet-storefront') {
      const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
      const store = state.store.stores.find((item) => item.artistId === artistId || item.storeId === body.storeId) || writeStaticStore('upsert-store', { artistId }).store;
      const routeSlug = String(body.skyeNetSlug || body.skyenetSlug || body.routeSlug || store.slug || artistId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'artist';
      const publish = {
        publishId: staticId('skyenet'),
        artistId,
        storeId: store.storeId,
        routeSlug,
        status: 'static_preview_skyenet_publish',
        provider: 'fs27-skynet',
        liveUrl: `/skyenet/musicnexus/artists/${routeSlug}/`,
        mountPath: `/skyenet/musicnexus/artists/${routeSlug}`,
        projectId: body.projectId || `skymusicnexus-artist-${routeSlug}`,
        deploymentId: staticId('dep'),
        published: false,
        createdAt: now,
        previewOnly: true,
      };
      store.skyeNetPublishes = [publish, ...(store.skyeNetPublishes || [])].slice(0, 20);
      store.lastSkyeNetPublish = publish;
      store.skyeNetUrl = publish.liveUrl;
      store.skyeNetRouteSlug = routeSlug;
      state.store.summary = staticStoreSummary();
      return { ok: true, publish, store, summary: state.store.summary, previewOnly: true };
    }
    return { ok: true, ...state.store, summary: staticStoreSummary(), previewOnly: true };
  }

  function staticGamifySummary() {
    ensureStaticCollections();
    return {
      meters: state.gamify.meters.length,
      merits: state.gamify.merits.length,
      events: state.gamify.events.length,
      giveaways: state.gamify.giveaways.length,
      openGiveaways: state.gamify.giveaways.filter((item) => item.status === 'open').length,
      entries: state.gamify.entries.length,
      totalLifetimePoints: state.gamify.meters.reduce((sum, meter) => sum + Number(meter.lifetimePoints || 0), 0),
      totalMeritBalance: state.gamify.meters.reduce((sum, meter) => sum + Number(meter.meritBalance || 0), 0),
      nextMeritAt: 100,
    };
  }

  function staticGamifyRecord(payload = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    const artistId = payload.artistId || state.lastArtistId || 'static_preview_artist';
    const pointsTable = { stream_other_artist: 18, stream_received: 4, feed_post: 14, feed_comment: 8, feed_like: 3, feed_save: 5, feed_boost: 7, engagement_received: 3, store_product: 20, store_order: 30, drop_create: 25, tool_asset: 22, brand_asset: 22, brain_cycle: 15, giveaway_enter: 10, giveaway_win: 50, operator_award: 100 };
    const activityType = String(payload.activityType || payload.type || 'activity').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const points = Number(payload.points || pointsTable[activityType] || 5);
    let meter = state.gamify.meters.find((item) => item.artistId === artistId);
    if (!meter) {
      meter = { meterId: staticId('skyemeter'), artistId, artistName: artistId, lifetimePoints: 0, cyclePoints: 0, level: 1, meritBalance: 0, meritCount: 0, nextMeritAt: 100, status: 'active', createdAt: now };
      state.gamify.meters.unshift(meter);
    }
    const event = { gamifyEventId: staticId('skye_evt'), id: staticId('skye_evt'), artistId, artistName: meter.artistName || artistId, activityType, points, releaseId: payload.releaseId || '', targetArtistId: payload.targetArtistId || '', postId: payload.postId || payload.targetId || '', source: payload.source || 'static-preview', note: payload.note || '', createdAt: now };
    event.id = event.gamifyEventId;
    meter.lifetimePoints += points;
    meter.cyclePoints += points;
    meter.level = Math.max(1, Math.floor(meter.lifetimePoints / 500) + 1);
    meter.updatedAt = now;
    const merits = [];
    while (meter.cyclePoints >= 100) {
      meter.cyclePoints -= 100;
      const merit = { meritId: staticId('skye_merit'), artistId, artistName: meter.artistName || artistId, denomination: 1, reason: `SkyeMeter filled by ${activityType.replace(/_/g, ' ')}`, sourceEventId: event.gamifyEventId, sourceType: activityType, status: 'issued', createdAt: now };
      meter.meritBalance += 1;
      meter.meritCount += 1;
      state.gamify.merits.unshift(merit);
      merits.push(merit);
    }
    event.meterPercent = Math.round((meter.cyclePoints / 100) * 100);
    event.issuedMerits = merits.map((merit) => merit.meritId);
    state.gamify.events.unshift(event);
    state.gamify.summary = staticGamifySummary();
    return { event, meter: { ...meter, percent: event.meterPercent }, merits };
  }

  function writeStaticGamify(action, body = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    if (action === 'record-activity') return { ok: true, ...staticGamifyRecord({ ...body, source: body.source || 'manual-static-activity' }), previewOnly: true };
    if (action === 'award-merits') {
      const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
      const count = Math.max(1, Math.min(25, Number(body.count || body.denomination || 1) || 1));
      const recorded = staticGamifyRecord({ artistId, activityType: 'operator_award', points: count * 100, source: 'team-award', note: body.reason || 'Team SkyeMerit award' });
      return { ok: true, meter: recorded.meter, merits: recorded.merits, previewOnly: true };
    }
    if (action === 'open-giveaway') {
      const giveaway = { giveawayId: body.giveawayId || staticId('giveaway'), title: body.title || 'Content launch drop package giveaway', prizeType: body.prizeType || 'content_launch_drop_package', prizeDescription: body.prizeDescription || 'Owner-approved content launch, new drop, or agentic website growth package.', sponsorArtistId: body.sponsorArtistId || body.artistId || '', entryCostPoints: Number(body.entryCostPoints || 0) || 0, maxEntries: Number(body.maxEntries || 250) || 250, status: 'open', winnerEntryId: '', winnerArtistId: '', createdAt: now, updatedAt: now, previewOnly: true };
      giveaway.id = giveaway.giveawayId;
      state.gamify.giveaways.unshift(giveaway);
      state.gamify.summary = staticGamifySummary();
      return { ok: true, giveaway, previewOnly: true };
    }
    if (action === 'enter-giveaway') {
      const giveaway = state.gamify.giveaways.find((item) => item.giveawayId === body.giveawayId || item.id === body.giveawayId) || state.gamify.giveaways[0];
      if (!giveaway) throw new Error('Open a giveaway before entering.');
      const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
      const entry = { entryId: body.entryId || staticId('giveaway_entry'), giveawayId: giveaway.giveawayId, artistId, artistName: artistId, status: 'entered', note: body.note || '', createdAt: now, updatedAt: now, previewOnly: true };
      entry.id = entry.entryId;
      state.gamify.entries.unshift(entry);
      const recorded = staticGamifyRecord({ artistId, activityType: 'giveaway_enter', source: 'static-giveaway', note: `Entered ${giveaway.title}` });
      state.gamify.summary = staticGamifySummary();
      return { ok: true, giveaway, entry, meter: recorded.meter, previewOnly: true };
    }
    if (action === 'draw-giveaway') {
      const giveaway = state.gamify.giveaways.find((item) => item.giveawayId === body.giveawayId || item.id === body.giveawayId) || state.gamify.giveaways[0];
      const entries = state.gamify.entries.filter((entry) => giveaway && entry.giveawayId === giveaway.giveawayId);
      if (!giveaway || !entries.length) throw new Error('Giveaway needs at least one entry.');
      const winner = entries[0];
      winner.status = 'winner';
      winner.wonAt = now;
      giveaway.status = 'awarded';
      giveaway.winnerEntryId = winner.entryId;
      giveaway.winnerArtistId = winner.artistId;
      giveaway.awardedAt = now;
      giveaway.updatedAt = now;
      const recorded = staticGamifyRecord({ artistId: winner.artistId, activityType: 'giveaway_win', source: 'static-giveaway', note: `Won ${giveaway.title}` });
      state.gamify.summary = staticGamifySummary();
      return { ok: true, giveaway, winner, meter: recorded.meter, prizeReceipt: { status: 'owner_approval_required', prizeType: giveaway.prizeType, route: 'agentic-growth-or-drop-package-handoff' }, previewOnly: true };
    }
    return { ok: true, ...state.gamify, summary: staticGamifySummary(), previewOnly: true };
  }

  function staticContestSummary() {
    ensureStaticCollections();
    return {
      contests: state.contests.contests.length,
      open: state.contests.contests.filter((item) => item.status === 'open').length,
      entries: state.contests.entries.length,
      winners: state.contests.entries.filter((item) => item.status === 'winner').length,
      featurePackages: state.contests.featurePackages.length,
      approvedFeaturePackages: state.contests.featurePackages.filter((item) => item.status === 'approved').length,
      pendingBacklinks: state.contests.backlinks.filter((item) => item.reviewStatus === 'pending_review').length,
    };
  }

  function staticSafeLink(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (raw.startsWith('/') && !raw.startsWith('//')) return { href: raw, rel: 'noopener noreferrer', reviewStatus: 'pending_review' };
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:') throw new Error('unsafe_url_protocol');
      return { href: url.toString(), rel: 'noopener noreferrer ugc nofollow', reviewStatus: 'pending_review' };
    } catch {
      throw new Error('unsafe_url_rejected');
    }
  }

  function writeStaticContests(action, body = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    if (action === 'create-contest') {
      const contest = { contestId: body.contestId || staticId('contest'), title: body.title || 'SkyeMusicNexus featured artist contest', prizeType: body.prizeType || 'featured_blog_pr_package', prizeDescription: body.prizeDescription || 'Featured blog, Nexus feed push, and SkyeNet PR package after owner approval.', sponsorArtistId: body.sponsorArtistId || body.artistId || '', maxEntries: Number(body.maxEntries || 500) || 500, status: body.status === 'draft' ? 'draft' : 'open', createdAt: now, updatedAt: now, previewOnly: true };
      contest.id = contest.contestId;
      state.contests.contests.unshift(contest);
      state.contests.summary = staticContestSummary();
      return { ok: true, contest, summary: state.contests.summary, previewOnly: true };
    }
    if (action === 'enter-contest') {
      const contest = state.contests.contests.find((item) => item.contestId === body.contestId || item.id === body.contestId) || state.contests.contests[0];
      if (!contest) throw new Error('Create a contest before entering.');
      const links = parseCsv(body.submittedLinks || body.links || '').map(staticSafeLink).filter(Boolean);
      const entry = { contestEntryId: body.contestEntryId || staticId('contest_entry'), contestId: contest.contestId, entrantType: body.artistId ? 'artist' : 'fan', artistId: body.artistId || '', artistName: body.artistName || body.artistId || 'Fan entrant', note: body.note || '', moderationStatus: 'pending_review', status: 'entered', submittedLinks: links, createdAt: now, updatedAt: now, previewOnly: true };
      entry.id = entry.contestEntryId;
      state.contests.entries.unshift(entry);
      links.forEach((link) => state.contests.backlinks.unshift({ backlinkId: staticId('backlink'), contestId: contest.contestId, contestEntryId: entry.contestEntryId, artistId: entry.artistId, ...link, classification: 'entrant-submitted', createdAt: now, updatedAt: now, previewOnly: true }));
      state.contests.summary = staticContestSummary();
      return { ok: true, contest, entry, summary: state.contests.summary, previewOnly: true };
    }
    if (action === 'draw-winner' || action === 'select-winner') {
      const contest = state.contests.contests.find((item) => item.contestId === body.contestId || item.id === body.contestId) || state.contests.contests[0];
      const entries = state.contests.entries.filter((item) => contest && item.contestId === contest.contestId);
      if (!contest || !entries.length) throw new Error('Contest needs at least one entry.');
      const winner = entries[0];
      winner.status = 'winner';
      winner.wonAt = now;
      contest.status = 'winner_selected';
      contest.winnerEntryId = winner.contestEntryId;
      contest.winnerArtistId = winner.artistId;
      const featurePackage = { featurePackageId: body.featurePackageId || staticId('feature_pkg'), contestId: contest.contestId, contestEntryId: winner.contestEntryId, artistId: winner.artistId, artistName: winner.artistName, prizeType: contest.prizeType, status: 'owner_approval_required', providerRequired: false, providerCallMade: false, createdAt: now, updatedAt: now, previewOnly: true };
      featurePackage.id = featurePackage.featurePackageId;
      winner.featurePackageId = featurePackage.featurePackageId;
      contest.featurePackageId = featurePackage.featurePackageId;
      state.contests.featurePackages.unshift(featurePackage);
      state.contests.summary = staticContestSummary();
      return { ok: true, contest, winner, featurePackage, prizeReceipt: { status: 'owner_approval_required', prizeType: contest.prizeType, route: 'music-contests:generate-feature-package' }, previewOnly: true };
    }
    if (action === 'generate-feature-package') {
      const featurePackage = state.contests.featurePackages.find((item) => item.featurePackageId === body.featurePackageId || item.id === body.featurePackageId) || state.contests.featurePackages[0];
      if (!featurePackage) throw new Error('Draw a winner before generating the feature package.');
      const built = staticSocialPrPackage({ ...body, artistId: body.artistId || featurePackage.artistId, contestId: featurePackage.contestId });
      state.social.prRuns.unshift(built.prRun);
      state.social.featuredBlogs.unshift(built.blog);
      state.social.marketingPackages.unshift(built.marketingPackage);
      featurePackage.status = 'generated_for_owner_review';
      featurePackage.featuredBlogId = built.blog.featuredBlogId;
      featurePackage.marketingPackageId = built.marketingPackage.marketingPackageId;
      return { ok: true, featurePackage, run: built.prRun, blog: built.blog, marketingPackage: built.marketingPackage, previewOnly: true };
    }
    if (action === 'approve-winner-package') {
      const featurePackage = state.contests.featurePackages.find((item) => item.featurePackageId === body.featurePackageId || item.id === body.featurePackageId) || state.contests.featurePackages[0];
      if (featurePackage) featurePackage.status = 'approved';
      return { ok: true, featurePackage, previewOnly: true };
    }
    return { ok: true, ...state.contests, summary: staticContestSummary(), previewOnly: true };
  }

  function staticBrainSummary() {
    ensureStaticCollections();
    const actions = state.brains.actions || [];
    return { profiles: state.brains.profiles.length, memory: state.brains.memory.length, actions: actions.length, executedActions: actions.filter((action) => action.status === 'executed').length, cycles: state.brains.cycles.length, toolRuns: state.brains.toolRuns.length, providerRequired: false, mode: 'local-rule-memory-tooling' };
  }

  function staticBrainToolCatalog(profile = {}) {
    const artistId = profile.artistId || state.lastArtistId || 'static_preview_artist';
    const artistName = profile.artistName || artistId;
    const release = state.releases.find((item) => item.artistId === artistId) || state.releases[0] || {};
    const product = state.store.products.find((item) => item.artistId === artistId) || state.store.products[0] || {};
    const params = new URLSearchParams({ source: 'skymusicnexus', artistId, artistName });
    if (release.id) params.set('releaseId', release.id);
    if (release.title) params.set('releaseTitle', release.title);
    if (product.productId || product.id) params.set('productId', product.productId || product.id);
    const qs = params.toString();
    return [
      { id: 'media_asset_pack', kind: 'media', label: 'SkyeMediaCenter asset pack', appId: 'skyemediacenter', appName: 'SkyeMediaCenter', handoffUrl: `/SkyeMediaCenter/index.html?${qs}`, value: 'Routes cover art, clips, visualizers, photos, and delivery files into the shared media center.', localOnly: true, providerRequired: false },
      { id: 'brand_kit', kind: 'brand', label: 'BrandID Offline PWA kit', appId: 'brandid-offline-pwa', appName: 'BrandID Offline PWA', handoffUrl: `/Marketing-Made-Easy/BrandID-Offline-PWA/index.html?${qs}`, value: 'Turns artist memory, releases, and store offers into a reusable offline brand kit.', localOnly: true, providerRequired: false },
      { id: 'logo_brief', kind: 'identity', label: 'kAIxUBrandKit logo brief', appId: 'kaixu-brand-kit', appName: 'kAIxUBrandKit', handoffUrl: `/Marketing-Made-Easy/kAIxUBrandKit/index.html?${qs}`, value: 'Creates a practical logo and visual identity brief.', localOnly: true, providerRequired: false },
      { id: 'launch_offer', kind: 'offer', label: 'BusinessLaunchGo offer pack', appId: 'businesslaunchgo', appName: 'BusinessLaunchGo', handoffUrl: `/Marketing-Made-Easy/BusinessLaunchGo/index.html?${qs}`, value: 'Shapes the drop into a fan-facing offer with bundle copy and checkout CTA context.', localOnly: true, providerRequired: false },
      { id: 'web_creator_landing', kind: 'web', label: 'SkyeWebCreator landing plan', appId: 'skye-web-creator-max', appName: 'SkyeWebCreatorMax', handoffUrl: `/Marketing-Made-Easy/SkyeWebCreatorMax/builder.html?${qs}`, value: 'Builds the launch-page skeleton from release, store, and artist memory.', localOnly: true, providerRequired: false },
      { id: 'campaign_brief', kind: 'campaign', label: 'BrandForge local campaign brief', appId: 'brandforge', appName: 'BrandForge Campaign Studio', handoffUrl: `/Free99/apps/brandforge/brandforge_campaign_studio_v5_uploaded_intro_silent.html?skipIntro=1&${qs}`, value: 'Uses the free local BrandForge intelligence lane before paid model generation.', localOnly: true, providerRequired: false },
      { id: 'press_kit', kind: 'docs', label: 'SkyeDocxMax press kit', appId: 'skyedocxmax', appName: 'SkyeDocxMax', handoffUrl: `/Marketing-Made-Easy/SkyeDocxMax/editor.html?${qs}`, value: 'Drafts a press kit for blogs, venues, and collabs.', localOnly: true, providerRequired: false },
      { id: 'workforce_launch_package', kind: 'workforce', label: 'RouteX launch package brief', appId: 'skyeroutex', appName: 'SkyeRouteXFlow Workforce Command', handoffUrl: `/SkyeRouteX/workforce-command-v0.4.0/public/index.html?${qs}`, value: 'Prepares a RouteX-ready content launch job for team approval.', localOnly: true, providerRequired: false },
    ];
  }

  function staticBrainCaption(profile, subject = null) {
    const name = profile.artistName || profile.artistId || state.lastArtistId || 'Static Preview Artist';
    if (subject?.toolRunId) return `${name} built a local ${subject.toolLabel} for ${subject.releaseTitle || 'the next drop'}. It stays provider-free and has a real handoff: ${subject.handoffUrl}. What should we show first: page, logo, store offer, or launch clips?`;
    if (subject?.title) return `${name} is moving ${subject.title} through the Nexus with a useful next step attached. Ask for the hook, story, visuals, or store offer and the brain will route it.`;
    return `${name} is using this Nexus feed for release notes, useful replies, local brand assets, network listens, and store routing.`;
  }

  function staticBrainBuildTool(profile, body = {}) {
    const now = new Date().toISOString();
    const catalog = staticBrainToolCatalog(profile);
    const tool = catalog.find((item) => item.id === (body.toolId || 'brand_kit')) || catalog[0];
    const release = state.releases.find((item) => item.id === body.releaseId) || state.releases.find((item) => item.artistId === profile.artistId) || state.releases[0] || {};
    const product = state.store.products.find((item) => (item.productId || item.id) === body.productId) || state.store.products.find((item) => item.artistId === profile.artistId) || {};
    const toolRunId = body.toolRunId || staticId('artist_tool_run');
    const toolRun = {
      toolRunId,
      id: toolRunId,
      artistId: profile.artistId,
      artistName: profile.artistName || profile.artistId,
      brainId: profile.brainId,
      toolId: tool.id,
      toolLabel: tool.label,
      appId: tool.appId,
      appName: tool.appName,
      handoffUrl: tool.handoffUrl,
      releaseId: release.id || body.releaseId || '',
      releaseTitle: release.title || '',
      productId: product.productId || product.id || body.productId || '',
      status: 'ready_for_artist_review',
      providerRequired: false,
      localOnly: true,
      title: body.title || `${tool.label} for ${profile.artistName || profile.artistId}`,
      brief: body.brief || body.body || tool.value,
      outputs: {
        artist: profile.artistName || profile.artistId,
        releaseTitle: release.title || 'next release',
        storeOffer: product.title || 'artist store offer',
        checklist: ['specific copy', 'asset checklist', 'proof notes', 'handoff route'],
      },
      createdAt: now,
      updatedAt: now,
      previewOnly: true,
    };
    toolRun.publishablePost = staticBrainCaption(profile, toolRun);
    state.brains.toolRuns.unshift(toolRun);
    state.brains.memory.unshift({ memoryId: staticId('mem'), artistId: profile.artistId, title: `Tool run: ${tool.label}`, text: `${toolRun.title}. ${toolRun.brief} Handoff: ${toolRun.handoffUrl}`, tags: ['tool-run', tool.id], source: 'artist-tool-run', toolRunId: toolRun.toolRunId, createdAt: now, previewOnly: true });
    staticGamifyRecord({ artistId: profile.artistId, activityType: ['brand_kit', 'logo_brief'].includes(tool.id) ? 'brand_asset' : 'tool_asset', source: 'static-brain-tool', note: toolRun.title });
    return { toolRun, tool };
  }

  function staticBrainPlan(profile) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    const ownRelease = state.releases.find((release) => release.artistId === profile.artistId) || state.releases[0];
    const product = state.store.products.find((item) => item.artistId === profile.artistId);
    const networkRelease = state.releases.find((release) => release.artistId && release.artistId !== profile.artistId);
    const networkPost = state.social.feedItems.find((post) => post.artistId && post.artistId !== profile.artistId);
    const actions = [];
    if (ownRelease) actions.push({ actionId: staticId('brain_action'), artistId: profile.artistId, brainId: profile.brainId, type: 'feed_post', status: 'planned', title: `Post release signal for ${ownRelease.title || ownRelease.id}`, caption: `${profile.artistName || profile.artistId}: ${ownRelease.title || 'the release'} is moving in the Nexus.`, releaseId: ownRelease.id || '', hashtags: ['musicnexus', 'newmusic'], createdAt: now });
    if (product) actions.push({ actionId: staticId('brain_action'), artistId: profile.artistId, brainId: profile.brainId, type: 'feed_post', status: 'planned', title: `Spotlight store item ${product.title}`, caption: `${profile.artistName || profile.artistId}: ${product.title} is open in the Nexus Store.`, productId: product.productId || product.id, hashtags: ['artiststore', 'musicnexus'], createdAt: now });
    [
      ['media_asset_pack', `Build SkyeMediaCenter pack for ${profile.artistName || profile.artistId}`, 'Collect cover art, promo clips, visualizers, photos, and delivery files.'],
      ['brand_kit', `Build BrandID kit for ${profile.artistName || profile.artistId}`, 'Package artist voice, audience, palette, content pillars, and release positioning.'],
      ['logo_brief', `Build kAIxUBrandKit brief for ${profile.artistName || profile.artistId}`, 'Create logo direction for cover art, avatars, merch, and clip watermarks.'],
      ['launch_offer', `Build BusinessLaunchGo offer for ${profile.artistName || profile.artistId}`, 'Turn the release and store path into a fan-facing offer and CTA.'],
    ].forEach(([toolId, title, body]) => {
      actions.push({ actionId: staticId('brain_action'), artistId: profile.artistId, brainId: profile.brainId, type: 'tool_asset', toolId, status: 'planned', title, body, releaseId: ownRelease?.id || '', productId: product?.productId || product?.id || '', publishToFeed: true, createdAt: now });
    });
    if (networkRelease) actions.push({ actionId: staticId('brain_action'), artistId: profile.artistId, brainId: profile.brainId, type: 'listen_release', status: 'planned', title: `Stream ${networkRelease.title || networkRelease.id}`, releaseId: networkRelease.id, targetArtistId: networkRelease.artistId, listenSeconds: 45, body: `Run a local Nexus listen on ${networkRelease.title || networkRelease.id}.`, createdAt: now });
    if (networkPost) actions.push({ actionId: staticId('brain_action'), artistId: profile.artistId, brainId: profile.brainId, type: 'engage_post', status: 'planned', title: `Engage ${networkPost.title || 'network post'}`, targetId: networkPost.id, targetArtistId: networkPost.artistId, feedAction: 'comment', body: `${profile.artistName || profile.artistId} tapped in. This has motion in the Nexus.`, createdAt: now });
    if (!state.store.stores.some((store) => store.artistId === profile.artistId)) actions.push({ actionId: staticId('brain_action'), artistId: profile.artistId, brainId: profile.brainId, type: 'task', status: 'planned', title: 'Create artist store', body: 'Open the Store room and create the artist store before public rollout.', createdAt: now });
    return actions;
  }

  function writeStaticBrain(action, body = {}) {
    ensureStaticCollections();
    const now = new Date().toISOString();
    if (action === 'seed-artist-brain') {
      const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
      let profile = state.brains.profiles.find((item) => item.artistId === artistId);
      if (!profile) {
        profile = { brainId: staticId('artist_brain'), artistId, createdAt: now };
        state.brains.profiles.unshift(profile);
      }
      Object.assign(profile, { artistName: body.artistName || profile.artistName || artistId, status: body.status || profile.status || 'active', localOnly: true, providerRequired: false, autopilot: body.autopilot === true || body.autopilot === 'true', voice: { tone: body.tone || 'specific, useful, grateful, release-focused', bannedClaims: parseCsv(body.bannedClaims || 'guaranteed streams,fake chart claims,rights claims not approved,fake scarcity') }, objectives: parseCsv(body.objectives || 'post release updates,reply to fans with useful answers,route fans to store,build brand assets locally,stream network releases'), updatedAt: now, previewOnly: true });
      const memory = { memoryId: staticId('mem'), artistId, title: 'Artist identity', text: `${profile.artistName || artistId}: local brain profile is live in MusicNexus.`, tags: ['identity', 'profile'], source: 'brain-profile', createdAt: now };
      state.brains.memory.unshift(memory);
      const plannedActions = staticBrainPlan(profile);
      state.brains.actions.unshift(...plannedActions);
      state.lastArtistId = artistId;
      state.brains.summary = staticBrainSummary();
      return { ok: true, profile, plannedActions, memory: state.brains.memory.filter((item) => item.artistId === artistId).slice(0, 12), summary: state.brains.summary, previewOnly: true };
    }
    if (action === 'add-memory') {
      const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
      const memory = { memoryId: body.memoryId || staticId('mem'), artistId, title: body.title || 'Memory chunk', text: body.text || body.body || '', tags: parseCsv(body.tags), source: body.source || 'artist-team', createdAt: now, previewOnly: true };
      state.brains.memory.unshift(memory);
      state.brains.summary = staticBrainSummary();
      return { ok: true, memory, summary: state.brains.summary, previewOnly: true };
    }
    if (action === 'plan-post') {
      const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
      let profile = state.brains.profiles.find((item) => item.artistId === artistId);
      if (!profile) profile = writeStaticBrain('seed-artist-brain', { artistId, seedMemory: false }).profile;
      const planned = { actionId: staticId('brain_action'), artistId, brainId: profile.brainId, type: 'feed_post', status: 'planned', title: body.title || 'Artist brain feed post', caption: body.caption || staticBrainCaption(profile, state.releases.find((item) => item.id === body.releaseId) || null), releaseId: body.releaseId || state.lastReleaseId || '', hashtags: parseCsv(body.hashtags || 'musicnexus'), createdAt: now, previewOnly: true };
      state.brains.actions.unshift(planned);
      state.brains.summary = staticBrainSummary();
      return { ok: true, action: planned, summary: state.brains.summary, previewOnly: true };
    }
    if (action === 'build-tool-asset' || action === 'run-tool' || action === 'create-tool-run') {
      const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
      let profile = state.brains.profiles.find((item) => item.artistId === artistId);
      if (!profile) profile = writeStaticBrain('seed-artist-brain', { artistId, seedMemory: true }).profile;
      const built = staticBrainBuildTool(profile, body);
      let post = null;
      if (body.publishToFeed === true || body.publishToFeed === 'true') {
        post = { id: staticId('feed'), type: 'tool-post', source: 'artist-local-brain:tool-run', status: 'published', artistId, releaseId: built.toolRun.releaseId || '', toolRunId: built.toolRun.toolRunId, author: profile.artistName || artistId, handle: 'skye:brain', avatar: 'AI', title: `${built.toolRun.toolLabel} ready`, caption: built.toolRun.publishablePost, hashtags: ['musicnexus', 'artisttools', built.toolRun.toolId], stats: { likes: 0, saves: 0, boosts: 0, comments: [] }, createdAt: now, previewOnly: true };
        state.social.feedItems.unshift(post);
        staticGamifyRecord({ artistId, activityType: 'feed_post', releaseId: post.releaseId, postId: post.id, source: 'static-brain-tool-feed' });
      }
      state.brains.summary = staticBrainSummary();
      return { ok: true, toolRun: built.toolRun, tool: built.tool, post, summary: state.brains.summary, previewOnly: true };
    }
    if (action === 'run-local-cycle') {
      const artistId = body.artistId || state.lastArtistId || 'static_preview_artist';
      let profile = state.brains.profiles.find((item) => item.artistId === artistId);
      if (!profile) profile = writeStaticBrain('seed-artist-brain', { artistId, seedMemory: true }).profile;
      const planned = staticBrainPlan(profile).slice(0, Math.max(1, Math.min(8, Number(body.limit || 4) || 4)));
      const execute = body.execute === true || body.execute === 'true';
      const receipts = [];
      planned.forEach((item) => {
        if (!execute || item.type === 'task') return;
        if (item.type === 'tool_asset') {
          const built = staticBrainBuildTool(profile, item);
          let post = null;
          if (item.publishToFeed !== false) {
            post = { id: staticId('feed'), type: 'tool-post', source: 'artist-local-brain:tool-run', status: 'published', artistId, releaseId: built.toolRun.releaseId || '', toolRunId: built.toolRun.toolRunId, author: profile.artistName || artistId, handle: 'skye:brain', avatar: 'AI', title: `${built.toolRun.toolLabel} ready`, caption: built.toolRun.publishablePost, hashtags: ['musicnexus', 'artisttools', built.toolRun.toolId], stats: { likes: 0, saves: 0, boosts: 0, comments: [] }, createdAt: now, previewOnly: true };
            state.social.feedItems.unshift(post);
            staticGamifyRecord({ artistId, activityType: 'feed_post', releaseId: post.releaseId, postId: post.id, source: 'static-brain-tool-feed' });
          }
          item.execution = { ok: true, kind: 'tool_asset', toolRunId: built.toolRun.toolRunId, toolId: built.toolRun.toolId, appId: built.toolRun.appId, handoffUrl: built.toolRun.handoffUrl, postId: post?.id || '' };
        }
        if (item.type === 'feed_post') {
          const post = { id: staticId('feed'), type: 'release-post', source: 'artist-local-brain', status: 'published', artistId: item.artistId, releaseId: item.releaseId || '', author: profile.artistName || item.artistId, handle: 'skye:brain', avatar: 'AI', title: item.title, caption: item.caption || item.body || '', hashtags: item.hashtags || [], stats: { likes: 0, saves: 0, boosts: 0, comments: [] }, createdAt: now };
          state.social.feedItems.unshift(post);
          staticGamifyRecord({ artistId, activityType: 'feed_post', releaseId: post.releaseId, postId: post.id, source: 'static-brain' });
          item.execution = { ok: true, kind: 'feed_post', postId: post.id };
        }
        if (item.type === 'listen_release') {
          const release = state.releases.find((candidate) => candidate.id === item.releaseId);
          if (release) {
            release.analytics = release.analytics || {};
            release.analytics.plays = Number(release.analytics.plays || 0) + 1;
            release.analytics.streams = Number(release.analytics.streams || 0) + 1;
            release.analytics.listenSeconds = Number(release.analytics.listenSeconds || 0) + Number(item.listenSeconds || 45);
            staticGamifyRecord({ artistId, activityType: 'stream_other_artist', releaseId: release.id, targetArtistId: release.artistId, source: 'static-brain' });
            if (release.artistId && release.artistId !== artistId) staticGamifyRecord({ artistId: release.artistId, activityType: 'stream_received', releaseId: release.id, targetArtistId: artistId, source: 'static-brain' });
            item.execution = { ok: true, kind: 'listen_release', releaseId: release.id, streams: release.analytics.streams };
          }
        }
        if (item.type === 'engage_post') {
          const post = state.social.feedItems.find((candidate) => candidate.id === item.targetId) || state.social.feedItems[0];
          if (post) {
            post.stats = post.stats || { likes: 0, saves: 0, boosts: 0, comments: [] };
            post.stats.comments.push({ id: staticId('comment'), artistId, body: item.body || 'Tapped in from the local artist brain.', source: 'artist-local-brain', createdAt: now });
            staticGamifyRecord({ artistId, activityType: 'feed_comment', postId: post.id, releaseId: post.releaseId || '', targetArtistId: post.artistId || '', source: 'static-brain' });
            if (post.artistId && post.artistId !== artistId) staticGamifyRecord({ artistId: post.artistId, activityType: 'engagement_received', postId: post.id, releaseId: post.releaseId || '', targetArtistId: artistId, source: 'static-brain' });
            item.execution = { ok: true, kind: 'engage_post', postId: post.id, feedAction: 'comment' };
          }
        }
        if (item.execution) {
          item.status = 'executed';
          item.executedAt = now;
          receipts.push(item.execution);
        }
      });
      state.brains.actions.unshift(...planned);
      const cycle = { cycleId: staticId('cycle'), artistId, brainId: profile.brainId, goal: body.goal || 'local artist brain cycle', providerRequired: false, executed: execute, actionIds: planned.map((item) => item.actionId), receipts, createdAt: now, previewOnly: true };
      state.brains.cycles.unshift(cycle);
      staticGamifyRecord({ artistId, activityType: 'brain_cycle', source: 'static-brain', note: cycle.goal });
      state.brains.summary = staticBrainSummary();
      return { ok: true, profile, cycle, actions: planned, receipts, summary: state.brains.summary, previewOnly: true };
    }
    return { ok: true, ...state.brains, summary: staticBrainSummary(), previewOnly: true };
  }

  async function staticFunctionResponse(name, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const action = (options.query && options.query.action) || (options.body && options.body.action) || '';
    const body = options.body || {};
    ensureStaticCollections();
    if (method !== 'GET') {
      if (name === 'music-drops') return writeStaticDrop(action, body);
      if (name === 'music-artists') return writeStaticArtist(action, body);
      if (name === 'music-releases') return writeStaticRelease(action, body);
      if (name === 'music-assets') return writeStaticAsset(action, body);
      if (name === 'music-payments') return writeStaticPayment(action, body);
      if (name === 'music-exchange') return writeStaticExchange(action, body);
      if (name === 'music-social') return writeStaticSocial(action, body);
      if (name === 'music-contests') return writeStaticContests(action, body);
      if (name === 'music-store') return writeStaticStore(action, body);
      if (name === 'music-brain') return writeStaticBrain(action, body);
      if (name === 'music-gamify') return writeStaticGamify(action, body);
      return { ok: true, previewOnly: true, action };
    }
    if (name === 'music-artists' && action === 'paperwork') {
      const id = options.query?.id || options.query?.artist || state.lastArtistId || 'new-artist';
      const artist = state.artists.find((item) => [item.id, item.artistId, item.skyeId, item.identityId, item.slug].includes(id)) || { id, slug: id };
      const linked = ensureArtistContracts(artist);
      return { ok: true, artistId: linked.id || linked.artistId || '', paperwork: linked.paperwork, communications: linked.communications, previewOnly: true };
    }
    if (name === 'music-artists') {
      state.artists = state.artists.map((artist) => ensureArtistContracts(artist));
      return { ok: true, artists: state.artists };
    }
    if (name === 'music-assets' && action === 'storage-status') {
      state.assetStorage = { mode: 'browser-static-preview', durable: false, directUploadAvailable: false, maxBase64UploadBytes: 52428800, maxDirectUploadBytes: 0 };
      return { ok: true, storage: state.assetStorage };
    }
    if (name === 'music-assets') return { ok: true, assets: state.assets, total: state.assets.length, maxUploadBytes: 52428800, storage: state.assetStorage };
    if (name === 'music-drops') return staticDropEnvelope();
    if (name === 'music-store') return { ok: true, ...state.store, summary: staticStoreSummary(), platformFeeBps: 1300, providerRequired: false, previewOnly: true };
    if (name === 'music-brain') {
      const profile = state.brains.profiles.find((item) => item.artistId === state.lastArtistId) || state.brains.profiles[0] || { artistId: state.lastArtistId || 'static_preview_artist' };
      state.brains.toolCatalog = staticBrainToolCatalog(profile);
      return { ok: true, ...state.brains, toolCatalog: state.brains.toolCatalog, summary: staticBrainSummary(), providerRequired: false, localOnly: true, previewOnly: true };
    }
    if (name === 'music-gamify') return { ok: true, ...state.gamify, summary: staticGamifySummary(), providerRequired: false, previewOnly: true };
    if (name === 'music-contests') return { ok: true, ...state.contests, summary: staticContestSummary(), providerRequired: false, previewOnly: true };
    const fallbackRelease = {
      id: 'static_preview_release',
      artistId: 'static_preview_artist',
      title: 'Nexus Signal Preview',
      type: 'single',
      status: 'live',
      tracks: [
        { title: 'Nexus Signal', duration: 24, previewUrl: '', plays: 0, listenSeconds: 0 },
        { title: 'Relay Bounce', duration: 26, previewUrl: '', plays: 0, listenSeconds: 0 },
      ],
      analytics: { streams: 1280, downloads: 22, saves: 87, plays: 0, listenSeconds: 0 },
      rights: { status: 'preview-ready', ownershipAttested: true, previewUseAuthorized: true, distributionAuthorized: false },
      distributionTargets: ['SkyeMusicNexus Player', 'release review'],
    };
    const releaseReadSet = state.releases.length ? state.releases : [fallbackRelease];
    if (name === 'music-releases' && action === 'operations-board') return { ok: true, workflows: state.workflows };
    if (name === 'music-releases' && action === 'playback-stream') return {
      ok: true,
      playback: { playbackKind: 'generated-preview', plays: 1, proofPlays: 1 },
    };
    if (name === 'music-releases' && action === 'rights-audit') return {
      ok: true,
      rights: releaseReadSet.map((release) => {
        const rights = release.rights || {};
        return {
          releaseId: release.id,
          title: release.title,
          status: rights.status || 'preview-ready',
          ownershipAttested: rights.ownershipAttested !== false,
          previewUseAuthorized: rights.previewUseAuthorized !== false,
          distributionAuthorized: rights.distributionAuthorized === true,
          playbackBlocked: rights.playbackBlocked === true || rights.takedownHold === true,
          linkedPreviewCount: Array.isArray(release.tracks) ? release.tracks.filter((track) => track.previewUrl).length : 0,
        };
      }),
      summary: {
        total: releaseReadSet.length,
        ready: releaseReadSet.filter((release) => (release.rights?.status || 'preview-ready') === 'preview-ready').length,
        blocked: releaseReadSet.filter((release) => release.rights?.playbackBlocked || release.rights?.takedownHold).length,
        needsClearance: releaseReadSet.filter((release) => (release.rights?.status || '') === 'needs-clearance').length,
      },
    };
    if (name === 'music-releases') return { ok: true, releases: releaseReadSet };
    if (name === 'music-payments') return { ok: true, payouts: state.payouts };
    if (name === 'music-exchange') {
      state.exchange.progress.counts = {
        contentRequests: state.exchange.contentRequests.length,
        communityPosts: state.exchange.communityPosts.length,
        inboxThreads: state.exchange.threads.length,
        campaigns: state.exchange.campaigns.length,
      };
      return {
        ok: true,
        gateSessionRequired: true,
        contentRequests: state.exchange.contentRequests,
        threads: state.exchange.threads,
        communityPosts: state.exchange.communityPosts,
        campaigns: state.exchange.campaigns,
        progress: state.exchange.progress,
      };
    }
    if (name === 'music-social') {
      const summary = {
        connectors: state.social.connectors.length,
        readyConnectors: state.social.connectors.filter((connector) => connector.tokenStatus === 'env-key-set').length,
        feedItems: state.social.feedItems.length,
        queuedPosts: state.social.postQueue.length,
        publishedPosts: state.social.postQueue.filter((post) => post.status === 'published').length,
        providerTokenRequired: state.social.postQueue.filter((post) => post.status === 'provider-token-required').length,
        reactions: state.social.feedActions.length,
        follows: state.social.follows.length,
        prRuns: state.social.prRuns.length,
        featuredBlogs: state.social.featuredBlogs.length,
        marketingPackages: state.social.marketingPackages.length,
      };
      state.social.summary = summary;
      return {
        ok: true,
        gateSessionRequired: true,
        catalog: [
          {
            id: 'pixelfed',
            name: 'Pixelfed',
            lane: 'instagram-like-photo-feed',
            protocol: 'ActivityPub plus Mastodon-compatible REST posting',
            productionBoundary: 'Connect a self-hosted or trusted Pixelfed account through the protected server account lane.',
          },
          {
            id: 'mastodon',
            name: 'Mastodon-compatible Fediverse',
            lane: 'status-feed-and-hashtag-discovery',
            protocol: 'OAuth2 + REST API + ActivityPub federation',
            productionBoundary: 'Use OAuth app access stored in the protected server account lane.',
          },
          {
            id: 'funkwhale',
            name: 'Funkwhale',
            lane: 'federated-audio-publication',
            protocol: 'ActivityPub audio federation + Funkwhale API',
            productionBoundary: 'Use after rights, storage, and native API mapping are live.',
          },
        ],
        connectors: state.social.connectors,
        postQueue: state.social.postQueue,
        feedItems: state.social.feedItems,
        stories: state.social.stories,
        feedPulls: state.social.feedPulls,
        moderation: state.social.moderation,
        feedActions: state.social.feedActions,
        follows: state.social.follows,
        notifications: state.social.notifications,
        prRuns: state.social.prRuns,
        featuredBlogs: state.social.featuredBlogs,
        marketingPackages: state.social.marketingPackages,
        contestBriefs: state.social.contestBriefs,
        summary,
      };
    }
    if (name === 'music-analytics') {
      return {
        ok: true,
        totalArtists: state.artists.length,
        activeArtists: state.artists.filter((artist) => artist.status === 'active').length,
        totalReleases: releaseReadSet.length,
        liveReleases: releaseReadSet.filter((release) => release.status === 'live').length,
        totalStreams: releaseReadSet.reduce((sum, release) => sum + Number(release.analytics?.streams || 0), 0),
        pendingPayouts: state.payouts.filter((payout) => payout.status !== 'completed').length,
        storeProducts: state.store.products.length,
        storeOrders: state.store.orders.length,
        artistBrains: state.brains.profiles.length,
        brainActions: state.brains.actions.length,
        skyeMeters: state.gamify.meters.length,
        skyeMerits: state.gamify.merits.length,
        gamifyEvents: state.gamify.events.length,
        giveaways: state.gamify.giveaways.length,
        giveawayEntries: state.gamify.entries.length,
      };
    }
    return { ok: true };
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function hasStructuredValue(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    return String(value || '').trim() !== '';
  }

  function compactObject(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
      let nextValue = value;
      if (Array.isArray(value)) {
        nextValue = value.map((item) => (typeof item === 'string' ? item.trim() : item)).filter(hasStructuredValue);
      } else if (value && typeof value === 'object') {
        nextValue = compactObject(value);
      } else if (typeof value === 'string') {
        nextValue = value.trim();
      }
      if (hasStructuredValue(nextValue)) output[key] = nextValue;
    });
    return output;
  }

  function parseLines(value) {
    return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }

  function isChecked(data, key) {
    return ['on', 'yes', 'true', '1'].includes(String(data[key] || '').toLowerCase());
  }

  function parseCsv(value) {
    return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  }

  function buildArtistOnboardingProfile(data, identityPayload = {}) {
    const consent = {
      epkWebsite: isChecked(data, 'epkWebsiteConsent'),
      storefront: isChecked(data, 'storefrontConsent'),
      artistBrainMemory: isChecked(data, 'artistBrainMemoryConsent'),
      skynetPublishing: isChecked(data, 'skynetPublishingConsent'),
    };
    const links = compactObject({
      website: data.websiteUrl,
      instagram: data.instagramUrl,
      tiktok: data.tiktokUrl,
      youtube: data.youtubeUrl,
      spotify: data.spotifyUrl,
      soundcloud: data.soundcloudUrl,
      bandcamp: data.bandcampUrl,
      other: parseLines(data.otherLinks),
    });
    return compactObject({
      schema: 'skymusicnexus.artist_onboarding.v1',
      source: 'SkyeMusicNexus signup',
      collectedAt: new Date().toISOString(),
      gate: {
        owner: 'FS27/SkyGate/Free99',
        identityId: identityPayload.identityId || data.identityId || '',
        skyeId: identityPayload.skyeId || data.skyeId || '',
      },
      usage: {
        artistWebpageStorefront: true,
        pressKit: true,
        artistBrainMemory: consent.artistBrainMemory,
        legalPayoutReadiness: true,
        rightsSplitSafety: true,
        skynetArtistPublishing: consent.skynetPublishing,
      },
      background: {
        originStory: data.originStory,
        influences: parseCsv(data.influences),
        soundDetails: data.soundDetails,
        audience: data.audience,
        goals: data.artistGoals,
      },
      brand: {
        visualIdentity: data.visualIdentity,
        brandColors: parseCsv(data.brandColors),
      },
      links,
      operations: {
        bookingPreference: data.bookingPreference,
        bookingEmail: data.bookingEmail,
        publicContactPreference: data.publicContactPreference,
      },
      rights: {
        rightsSplitsNotes: data.rightsSplitsNotes,
      },
      consent,
      legalHandoff: {
        legalSkyesUrl: 'https://skyes-over-london-legal.pages.dev/legal/creator-media/',
        disclaimer: 'Music Nexus organizes artist onboarding context and routes review; Legal Skyes controls public policy language and this is not legal advice.',
      },
    });
  }

  function parseTracks(value) {
    const rows = String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
    if (!rows.length) return [{ title: 'Untitled Signal', duration: 180, previewUrl: '' }];
    return rows.map((row) => {
      const [title, duration, previewUrl] = row.split('|').map((part) => part.trim());
      return { title: title || 'Untitled Signal', duration: Number(duration || 180) || 180, previewUrl: previewUrl || '' };
    });
  }

  function parseNamedLinks(value) {
    return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean).reduce((links, row) => {
      const [label, url] = row.split('|').map((part) => part.trim());
      if (label && url) links[label] = url;
      return links;
    }, {});
  }

  function parseVideoLinks(value) {
    return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean).map((row) => {
      const [title, url, poster] = row.split('|').map((part) => part.trim());
      return { title: title || 'Video', url: url || '', poster: poster || '' };
    }).filter((video) => video.url);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  function readSkyeIdentity() {
    if (!window.SkyeIDBridge || !window.SkyeIDBridge.readCurrentIdentity) return null;
    state.identity = window.SkyeIDBridge.readCurrentIdentity();
    return state.identity;
  }

  function readSkyEmailDraft() {
    if (window.SkyeIDBridge && window.SkyeIDBridge.readCurrentEmailDraft) return window.SkyeIDBridge.readCurrentEmailDraft();
    try {
      const draft = JSON.parse(localStorage.getItem('kx.onboarding.emailDraft') || 'null');
      if (draft && draft.email) return draft;
    } catch {}
    return null;
  }

  function currentSkyeArtistId() {
    const identity = state.identity || readSkyeIdentity();
    return (identity && (identity.skyeId || identity.idNumber || identity.identityId)) || '';
  }

  function refreshIdentityPanel(identity = state.identity || readSkyeIdentity()) {
    const status = $('#artistIdentityStatus');
    const meta = $('#artistPhotoMeta');
    const preview = $('#artistPhotoPreview');
    if (status) {
      const id = identity && (identity.skyeId || identity.idNumber || identity.identityId);
      status.textContent = id ? `${identity.name || 'Artist'} · ${id}` : 'No shared identity loaded';
    }
    if (meta) meta.textContent = identity && identity.photoDataUrl ? 'Skye ID photo linked.' : 'No artist photo linked yet.';
    if (preview) {
      if (identity && identity.photoDataUrl) {
        preview.src = identity.photoDataUrl;
        preview.hidden = false;
      } else {
        preview.removeAttribute('src');
        preview.hidden = true;
      }
    }
  }

  function syncIdentityToArtistForm({ force = false } = {}) {
    const form = $('#artistForm');
    const identity = readSkyeIdentity();
    if (!form || !identity) {
      refreshIdentityPanel(identity);
      return identity;
    }
    if (window.SkyeIDBridge && window.SkyeIDBridge.applyToArtistForm) window.SkyeIDBridge.applyToArtistForm(form);
    if (force || !form.elements.skyeId.value) form.elements.skyeId.value = identity.skyeId || identity.idNumber || '';
    if (form.elements.identityId) form.elements.identityId.value = identity.identityId || identity.skyeId || identity.idNumber || '';
    if (force || !form.elements.name.value) form.elements.name.value = identity.name || form.elements.name.value;
    if (form.elements.email && (force || !form.elements.email.value) && identity.email) form.elements.email.value = identity.email;
    refreshIdentityPanel(identity);
    return identity;
  }

  function syncSkyEmailToArtistForm({ force = false } = {}) {
    const form = $('#artistForm');
    const draft = readSkyEmailDraft();
    if (!form || !draft || !draft.email) return draft;
    if (form.elements.email && (force || !form.elements.email.value)) {
      form.elements.email.value = draft.email;
      form.elements.email.dispatchEvent(new Event('input', { bubbles: true }));
      form.elements.email.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return draft;
  }

  async function readArtistPhoto(form, identity) {
    const file = form && form.elements.profilePhotoFile && form.elements.profilePhotoFile.files && form.elements.profilePhotoFile.files[0];
    if (!file) {
      if (identity && identity.photoDataUrl) {
        return {
          dataUrl: identity.photoDataUrl,
          name: identity.photoName || 'skye-id-photo.jpg',
          type: identity.photoType || 'image/jpeg',
          updatedAt: identity.photoUpdatedAt || identity.updatedAt,
        };
      }
      return null;
    }
    if (window.SkyeIDBridge && window.SkyeIDBridge.fileToIdentityPhoto) return window.SkyeIDBridge.fileToIdentityPhoto(file);
    const dataUrl = await fileToDataUrl(file);
    return { dataUrl, name: file.name, type: file.type, originalBytes: file.size, updatedAt: new Date().toISOString() };
  }

  function publishArtistIdentity(payload) {
    if (!window.SkyeIDBridge || !window.SkyeIDBridge.publishIdentity) return null;
    return window.SkyeIDBridge.publishIdentity(payload, 'music-nexus-artist-register');
  }

  function renderResult(target, title, fields) {
    const node = $(target);
    if (!node) return;
    const rows = Object.entries(fields || {}).map(([key, value]) => `<span class="pill">${escapeHtml(key)}: ${escapeHtml(value)}</span>`).join('');
    node.innerHTML = `<strong>${escapeHtml(title)}</strong><div class="record-meta" style="margin-top:10px">${rows}</div>`;
  }

  function appendArtistPaperworkResult(target, artist = {}) {
    const node = $(target);
    if (!node) return;
    const links = artistPaperworkLinks(artist);
    node.insertAdjacentHTML('beforeend', `
      <div class="paperwork-callout">
        <strong>Paperwork required before payout</strong>
        <p>${escapeHtml(links.legalPaymentNotice)} ${escapeHtml(links.payoutHoldReason)}</p>
        <div class="paperwork-link-grid">
          <a class="pill gold" href="${escapeHtml(links.workforceFormUrl)}">Artist packet</a>
          <a class="pill" href="${escapeHtml(links.workforceCommandUrl)}">Workforce</a>
          <a class="pill" href="${escapeHtml(links.connectLogUrl)}">ConnectLog</a>
          <a class="pill" href="${escapeHtml(links.relay13InboxUrl)}">Relay13</a>
        </div>
      </div>`);
  }

  function fillLastIds() {
    const seededArtistId = launchArtistId();
    const seededReleaseId = launchReleaseId();
    const identityArtistId = currentSkyeArtistId();
    if (seededArtistId) state.lastArtistId = seededArtistId;
    if (seededReleaseId) state.lastReleaseId = seededReleaseId;
    if (!state.lastArtistId && identityArtistId) state.lastArtistId = identityArtistId;
    if (state.lastArtistId) sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
    if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
    $$('input[name="artistId"]').forEach((input) => {
      if (!input.value && (state.lastArtistId || identityArtistId)) input.value = state.lastArtistId || identityArtistId;
    });
    $$('input[name="id"], input[name="releaseId"]').forEach((input) => {
      if (!input.value && state.lastReleaseId) input.value = state.lastReleaseId;
    });
    const trackTitle = launchParams.get('trackTitle') || launchParams.get('track_title') || '';
    if (trackTitle) {
      const uploadTitle = $('#assetUploadForm input[name="title"]');
      if (uploadTitle && !uploadTitle.value) uploadTitle.value = trackTitle;
    }
  }

  function setMeters() {
    const totalStreams = state.analytics ? Number(state.analytics.totalStreams || 0) : state.releases.reduce((sum, item) => sum + Number(item.analytics && item.analytics.streams || 0), 0);
    const live = state.analytics ? Number(state.analytics.liveReleases || 0) : state.releases.filter((item) => item.status === 'live').length;
    const pendingPayouts = state.analytics ? Number(state.analytics.pendingPayouts || 0) : state.payouts.filter((item) => item.status !== 'completed').length;
    const values = {
      meterArtists: state.analytics ? state.analytics.totalArtists : state.artists.length,
      meterReleases: state.analytics ? state.analytics.totalReleases : state.releases.length,
      meterStreams: fmtNumber(totalStreams),
      meterPayouts: pendingPayouts,
      meterLive: live,
    };
    Object.entries(values).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value == null ? '—' : value;
    });
  }

  function recordCard(type, title, text, pills, options = {}) {
    const photoDataUrl = String(options.photoDataUrl || '');
    const safePhoto = photoDataUrl.startsWith('data:image/') ? photoDataUrl : '';
    const href = String(options.href || '');
    return `<article class="record-card${safePhoto ? ' has-photo' : ''}">
      ${safePhoto ? `<img class="record-photo" src="${escapeHtml(safePhoto)}" alt="" />` : ''}
      <header><h4>${escapeHtml(title)}</h4><span class="pill ${type === 'release' ? 'pink' : type === 'payout' ? 'gold' : type === 'workflow' ? 'lime' : ''}">${escapeHtml(type)}</span></header>
      <p>${escapeHtml(text)}</p>
      <div class="record-meta">${(pills || []).map((pill) => `<span class="pill">${escapeHtml(pill)}</span>`).join('')}${href ? `<a class="ghost mini" href="${escapeHtml(href)}">Open</a>` : ''}</div>
    </article>`;
  }

  function renderRecords() {
    const list = $('#constellationList');
    if (!list) return;
    const cards = [];
    state.artists.slice(0, 6).forEach((artist) => {
      const photoDataUrl = artist.profilePhoto?.dataUrl || artist.photoDataUrl || artist.crossAppIdentity?.photoDataUrl || '';
      const id = artist.skyeId || artist.id;
      const pills = [artist.status || 'unknown', id, fmtMoney(artist.balance || 0)];
      if (artist.skyeId && artist.skyeId !== artist.id) pills.push(`Skye ID ${artist.skyeId}`);
      cards.push(recordCard('artist', artist.name || 'Unnamed Artist', artist.email || artist.id, pills, { photoDataUrl }));
    });
    state.releases.slice(0, 8).forEach((release) => {
      const streams = Number(release.analytics?.streams || 0) || 0;
      cards.push(recordCard('release', release.title || 'Untitled Release', `Artist ${release.artistId || 'unknown'} · ${release.type || 'release'}`, [release.status || 'draft', release.id, publicCountLabel(streams, 'streams')]));
    });
    state.workflows.slice(0, 6).forEach((workflow) => {
      cards.push(recordCard('workflow', workflow.checkpoint || 'Workflow', workflow.notes || `Release ${workflow.releaseId}`, [workflow.status || 'queued', workflow.owner || 'unassigned', workflow.releaseId || 'no release']));
    });
    state.payouts.slice(0, 6).forEach((payout) => {
      cards.push(recordCard('payout', `${fmtMoney(payout.amount)} payout`, `Artist ${payout.artistId || 'unknown'}`, [payout.status || 'pending', payout.payoutMethod || 'method', payout.id || 'no id']));
    });
    list.innerHTML = cards.length ? cards.join('') : '<article class="record-card"><h4>No records yet</h4><p>Connect a client session, register an artist, and forge a release to populate the constellation.</p></article>';
  }

  function renderAnalytics() {
    const prism = $('#analyticsPrism');
    if (!prism) return;
    const a = state.analytics || {};
    const rows = [
      ['Artists', a.totalArtists ?? state.artists.length],
      ['Active Artists', a.activeArtists ?? state.artists.filter((x) => x.status === 'active').length],
      ['Releases', a.totalReleases ?? state.releases.length],
      ['Live Releases', a.liveReleases ?? state.releases.filter((x) => x.status === 'live').length],
      ['Streams', fmtNumber(a.totalStreams || 0)],
      ['Payout Holds', a.pendingPayouts ?? state.payouts.filter((x) => x.status !== 'completed').length],
    ];
    prism.innerHTML = rows.map(([label, value]) => `<div class="prism-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  }

  function rightsStatusFor(release) {
    const rights = release.rights || {};
    const ownership = rights.ownershipAttested === true;
    const preview = rights.previewUseAuthorized === true;
    const blocked = rights.playbackBlocked === true || rights.takedownHold === true;
    return {
      status: blocked ? 'blocked' : rights.status || (ownership && preview ? 'preview-ready' : 'needs-clearance'),
      ownership,
      preview,
      distribution: rights.distributionAuthorized === true,
      blocked,
      email: rights.takedownContactEmail || '',
    };
  }

  function buildPlaybackQueue() {
    const releases = state.releases
      .filter((release) => Array.isArray(release.tracks) && release.tracks.length)
      .sort((left, right) => {
        const liveScore = (right.status === 'live' ? 1 : 0) - (left.status === 'live' ? 1 : 0);
        if (liveScore) return liveScore;
        return String(right.publishedAt || right.submittedAt || right.id).localeCompare(String(left.publishedAt || left.submittedAt || left.id));
      });
    return releases.flatMap((release) => {
      const rights = rightsStatusFor(release);
      return release.tracks.map((track, trackIndex) => {
        const previewUrl = track.previewUrl || track.audioUrl || track.streamUrl || '';
        const trackId = track.trackId || track.id || track.productId || `${release.id || 'release'}-${trackIndex}`;
        return {
          releaseId: release.id,
          releaseTitle: release.title || 'Untitled Release',
          artistId: release.artistId || '',
          artistName: release.artistName || release.artistId || '',
          trackId,
          productId: track.productId || trackId,
          status: release.status || 'draft',
          trackIndex,
          title: track.title || `Track ${trackIndex + 1}`,
          duration: Number(track.duration || 0) || previewSeconds,
          previewUrl,
          previewAuthorized: !previewUrl || (rights.ownership && rights.preview && !rights.blocked),
          playbackBlocked: rights.blocked,
          rightsStatus: rights.status,
          plays: Number(track.plays || 0) || Number(release.analytics?.trackStats?.[trackIndex]?.plays || 0) || 0,
          listenSeconds: Number(track.listenSeconds || 0) || Number(release.analytics?.trackStats?.[trackIndex]?.listenSeconds || 0) || 0,
        };
      });
    });
  }

  function syncPlaybackDebug() {
    const player = state.player;
    const elapsed = player.isPlaying && player.startedAt ? (Date.now() - player.startedAt) / 1000 : player.elapsed || 0;
    window.__SKYE_MUSIC_PLAYBACK = {
      isPlaying: player.isPlaying,
      queueLength: player.queue.length,
      activeIndex: player.activeIndex,
      mode: player.mode,
      currentTime: elapsed,
      trackTitle: player.currentTrack?.title || '',
      releaseId: player.currentTrack?.releaseId || '',
      audioContextState: player.audioContext?.state || '',
    };
  }

  function persistentPublicId(key, prefix) {
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const next = `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, next);
      return next;
    } catch {
      return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }

  function publicSessionId() {
    try {
      const existing = sessionStorage.getItem(PUBLIC_SESSION_KEY);
      if (existing) return existing;
      const next = `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(PUBLIC_SESSION_KEY, next);
      return next;
    } catch {
      return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }

  function publicProgress(track, seconds) {
    const duration = Math.max(1, Number(track?.duration || previewSeconds || 1) || 1);
    return Math.max(0, Math.min(100, Math.round((Number(seconds || 0) / duration) * 100)));
  }

  function publicQualifiedReady(track, seconds) {
    return Number(seconds || 0) >= 5 || publicProgress(track, seconds) >= 20;
  }

  function reportPublicPlayback(eventType, track, seconds = 0, completed = false) {
    if (!track) return;
    const listenSeconds = Math.max(0, Math.round(Number(seconds || 0) || 0));
    const body = JSON.stringify({
      action: 'track-public-event',
      eventType,
      listenerId: persistentPublicId(PUBLIC_LISTENER_KEY, 'listener'),
      sessionId: publicSessionId(),
      listenerKind: 'human_listener',
      sourceType: 'neo_nexus_player',
      source: 'neo-nexus-public-player',
      trackId: track.trackId || `${track.releaseId || 'release'}-${track.trackIndex || 0}`,
      productId: track.productId || track.trackId || '',
      releaseId: track.releaseId || '',
      artistId: track.artistId || '',
      artistName: track.artistName || track.artistId || '',
      title: track.title || '',
      genre: track.genre || '',
      listenSeconds,
      durationSeconds: Math.max(0, Math.round(Number(track.duration || previewSeconds || 0) || 0)),
      progressPct: completed ? 100 : publicProgress(track, listenSeconds),
      queueId: 'neo-nexus-player',
      completed: completed === true,
      nexusMetricEligible: ['play_start', 'qualified_stream', 'complete_play'].includes(eventType),
      publicMetricEligible: ['play_start', 'qualified_stream', 'complete_play'].includes(eventType),
    });
    fetch(PUBLIC_TELEMETRY_ENDPOINT, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: body.length < 60000,
      headers: { 'content-type': PUBLIC_TELEMETRY_CONTENT_TYPE },
      body,
    }).catch(() => {
      try {
        navigator.sendBeacon?.(`${PUBLIC_TELEMETRY_ENDPOINT}?action=track-public-event`, new Blob([body], { type: PUBLIC_TELEMETRY_CONTENT_TYPE }));
      } catch {}
    });
  }

  function setPlayerStatus(message) {
    const node = $('#playerStatus');
    if (node) node.textContent = message;
    syncPlaybackDebug();
  }

  function setPlayerProgress(percent) {
    const bar = $('#playerProgress');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, Number(percent || 0)))}%`;
    syncPlaybackDebug();
  }

  function renderPlayback() {
    const queue = buildPlaybackQueue();
    state.player.queue = queue;
    if (state.player.activeIndex >= queue.length) state.player.activeIndex = 0;
    const active = state.player.currentTrack || queue[state.player.activeIndex] || null;
    const nowTrack = $('#nowTrack');
    const nowRelease = $('#nowRelease');
    const queueNode = $('#playerQueue');
    const mode = $('#playbackMode');
    if (mode) mode.textContent = active?.previewUrl && active.previewAuthorized ? 'rights-cleared audio' : 'generated preview';
    if (nowTrack) nowTrack.textContent = active ? active.title : 'No track loaded';
    if (nowRelease) {
      nowRelease.textContent = active
        ? `${active.releaseTitle} · ${active.status} · ${publicCountLabel(active.plays, 'plays')}`
        : 'Forge or publish a release to fill the queue.';
    }
    if (queueNode) {
      queueNode.innerHTML = queue.length ? queue.map((track, index) => `
        <button type="button" class="queue-track ${index === state.player.activeIndex ? 'active' : ''}" data-track-index="${index}">
          <span>${escapeHtml(String(index + 1).padStart(2, '0'))}</span>
          <strong>${escapeHtml(track.title)}</strong>
          <small>${escapeHtml(track.releaseTitle)} · ${escapeHtml(track.playbackBlocked ? 'playback blocked' : track.previewUrl ? track.previewAuthorized ? 'rights-cleared audio' : 'rights review needed' : 'generated preview')} · ${escapeHtml(publicCountLabel(track.plays, 'plays'))}</small>
        </button>`).join('') : '<article class="record-card"><h4>No playable tracks yet</h4><p>Forge a release with tracks to light the playback deck.</p></article>';
    }
    syncPlaybackDebug();
  }

  function seededFrequency(track, offset = 0) {
    const source = `${track.releaseId}:${track.title}:${offset}`;
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    const scale = [0, 2, 3, 5, 7, 8, 10, 12];
    const note = scale[hash % scale.length] + (offset * 7);
    return 174.61 * (2 ** (note / 12));
  }

  function clearPlayerTimer() {
    if (state.player.timer) clearInterval(state.player.timer);
    state.player.timer = null;
  }

  function stopAudioNodes() {
    state.player.nodes.forEach((node) => {
      try {
        if (typeof node.stop === 'function') node.stop();
      } catch {}
      try {
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch {}
    });
    state.player.nodes = [];
    if (state.player.audioElement) {
      state.player.audioElement.pause();
      state.player.audioElement.removeAttribute('src');
      state.player.audioElement.load();
    }
    if (state.player.objectUrl) {
      URL.revokeObjectURL(state.player.objectUrl);
      state.player.objectUrl = '';
    }
  }

  async function recordPlayback(track, seconds, completed) {
    if (staticPreview || !track?.releaseId) return;
    try {
      const played = await callFunction('music-releases', {
        method: 'POST',
        body: {
          action: 'playback-stream',
          id: track.releaseId,
          trackIndex: track.trackIndex,
          listenSeconds: Math.max(1, Math.round(seconds || 1)),
          completed: completed === true,
          source: state.player.mode || 'nexus-player',
          generatedProof: state.player.mode === 'generated-preview',
        },
      });
      if (played.release?.id) {
        state.releases = state.releases.map((release) => release.id === played.release.id ? played.release : release);
        setMeters();
        renderRecords();
        renderAnalytics();
        renderRights();
      }
      setPlayerStatus(`Listening record saved for ${track.title}.`);
    } catch (err) {
      setPlayerStatus(`Played in this session. Listening save failed: ${err.message}`);
    }
  }

  async function stopPlayback({ report = true, completed = false } = {}) {
    const player = state.player;
    const track = player.currentTrack;
    const seconds = player.startedAt ? (Date.now() - player.startedAt) / 1000 : player.elapsed || 0;
    clearPlayerTimer();
    stopAudioNodes();
    player.isPlaying = false;
    player.elapsed = seconds;
    player.startedAt = 0;
    player.mode = 'idle';
    setPlayerProgress(completed ? 100 : 0);
    if (report && track && seconds > 0.25) {
      if (!player.publicPlayStartSent) reportPublicPlayback('play_start', track, Math.max(1, seconds), false);
      if (!player.publicQualifiedSent && publicQualifiedReady(track, seconds)) reportPublicPlayback('qualified_stream', track, seconds, false);
      if (completed) reportPublicPlayback('complete_play', track, seconds, true);
      await recordPlayback(track, seconds, completed);
    }
    renderPlayback();
  }

  async function startSyntheticTrack(track) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) throw new Error('This browser cannot start the Web Audio player.');
    const ctx = state.player.audioContext || new AudioCtor();
    state.player.audioContext = ctx;
    await ctx.resume();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + Math.min(previewSeconds, Math.max(6, Number(track.duration || previewSeconds))) - 0.08);
    gain.connect(ctx.destination);

    const oscillators = [0, 1, 2].map((offset) => {
      const osc = ctx.createOscillator();
      osc.type = offset === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(seededFrequency(track, offset), ctx.currentTime);
      osc.detune.setValueAtTime(offset === 1 ? 7 : offset === 2 ? -12 : 0, ctx.currentTime);
      osc.connect(gain);
      osc.start();
      return osc;
    });
    state.player.nodes = [gain, ...oscillators];
    setPlayerStatus(track.previewUrl && !track.previewAuthorized
      ? `Rights review blocked linked audio. Playing generated preview: ${track.title}`
      : `Playing generated preview: ${track.title}`);
  }

  async function startLinkedAudioTrack(track) {
    const audio = state.player.audioElement || new Audio();
    state.player.audioElement = audio;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    const url = new URL(track.previewUrl, window.location.href).toString();
    if ((track.previewUrl.includes('/.netlify/functions/music-assets') || track.previewUrl.includes('/api/skymusicnexus/music-assets')) && auth) {
      const response = await auth.fetch(url);
      if (!response.ok) throw new Error(`Gated audio fetch failed with ${response.status}`);
      const blob = await response.blob();
      state.player.objectUrl = URL.createObjectURL(blob);
      audio.src = state.player.objectUrl;
    } else {
      audio.src = url;
    }
    audio.onended = () => stopPlayback({ completed: true });
    await audio.play();
    setPlayerStatus(`Playing linked audio: ${track.title}`);
  }

  async function playTrack(index = state.player.activeIndex) {
    const queue = state.player.queue.length ? state.player.queue : buildPlaybackQueue();
    if (!queue.length) {
      setPlayerStatus('No playable tracks in the queue yet.');
      return;
    }
    await stopPlayback({ report: state.player.isPlaying, completed: false });
    const nextIndex = Math.max(0, Math.min(queue.length - 1, Number(index) || 0));
    const track = queue[nextIndex];
    if (track.playbackBlocked) {
      state.player.activeIndex = nextIndex;
      state.player.currentTrack = track;
      renderPlayback();
      setPlayerStatus(`Playback blocked pending rights review: ${track.title}`);
      return;
    }
    state.player.activeIndex = nextIndex;
    state.player.currentTrack = track;
    state.player.isPlaying = true;
    state.player.mode = track.previewUrl && track.previewAuthorized ? 'linked-audio' : 'generated-preview';
    state.player.startedAt = Date.now();
    state.player.elapsed = 0;
    state.player.publicPlayStartSent = false;
    state.player.publicQualifiedSent = false;
    renderPlayback();
    reportPublicPlayback('play_start', track, 1, false);
    state.player.publicPlayStartSent = true;

    try {
      if (track.previewUrl && track.previewAuthorized) await startLinkedAudioTrack(track);
      else await startSyntheticTrack(track);
    } catch (err) {
      if (track.previewUrl) {
        state.player.mode = 'generated-preview';
        await startSyntheticTrack(track);
        setPlayerStatus(`Linked audio failed, playing generated preview: ${track.title}`);
      } else {
        state.player.isPlaying = false;
        setPlayerStatus(err.message);
        return;
      }
    }

    clearPlayerTimer();
    state.player.timer = setInterval(() => {
      const elapsed = (Date.now() - state.player.startedAt) / 1000;
      const mediaDuration = state.player.audioElement?.duration && Number.isFinite(state.player.audioElement.duration)
        ? state.player.audioElement.duration
        : Math.min(previewSeconds, Math.max(6, Number(track.duration || previewSeconds)));
      state.player.elapsed = elapsed;
      setPlayerProgress((elapsed / mediaDuration) * 100);
      if (!state.player.publicQualifiedSent && publicQualifiedReady(track, elapsed)) {
        state.player.publicQualifiedSent = true;
        reportPublicPlayback('qualified_stream', track, elapsed, false);
      }
      if (state.player.mode === 'generated-preview' && elapsed >= mediaDuration) {
        stopPlayback({ completed: true });
      }
    }, 180);
  }

  async function playNextTrack() {
    const queue = state.player.queue.length ? state.player.queue : buildPlaybackQueue();
    if (!queue.length) return setPlayerStatus('No playable tracks in the queue yet.');
    const next = (state.player.activeIndex + 1) % queue.length;
    await playTrack(next);
  }

  function renderExchange() {
    const exchange = state.exchange || {};
    const progress = exchange.progress || {};
    const requests = Array.isArray(exchange.contentRequests) ? exchange.contentRequests : [];
    const threads = Array.isArray(exchange.threads) ? exchange.threads : [];
    const posts = Array.isArray(exchange.communityPosts) ? exchange.communityPosts : [];
    const campaigns = Array.isArray(exchange.campaigns) ? exchange.campaigns : [];

    const progressRail = $('#progressRail');
    if (progressRail) {
      const counts = progress.counts || {};
      progressRail.innerHTML = `
        <div class="progress-score">
          <strong>Level ${escapeHtml(progress.level || 1)}</strong>
          <span>${escapeHtml(progress.points || 0)} signal points</span>
        </div>
        <div class="progress-bar" aria-label="progress to next level"><i style="width:${Math.max(0, Math.min(100, Number(progress.percentToNext || 0)))}%"></i></div>
        <div class="record-meta">
          <span class="pill">${escapeHtml(counts.contentRequests || 0)} requests</span>
          <span class="pill">${escapeHtml(counts.communityPosts || 0)} posts</span>
          <span class="pill">${escapeHtml(counts.inboxThreads || 0)} inbox threads</span>
          <span class="pill">${escapeHtml(counts.campaigns || 0)} campaigns</span>
        </div>`;
    }

    const achievements = $('#achievementOrbit');
    if (achievements) {
      const list = Array.isArray(progress.achievements) ? progress.achievements : [];
      achievements.innerHTML = list.length ? list.map((item) => `
        <article class="achievement ${item.unlocked ? 'unlocked' : ''}">
          <span>${item.unlocked ? 'Unlocked' : 'Locked'}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.points)} pts · ${escapeHtml(item.detail)}</small>
        </article>`).join('') : '<article class="achievement"><strong>No achievements yet</strong><small>Start with an artist node, release capsule, or content request.</small></article>';
    }

    const requestList = $('#contentRequestList');
    if (requestList) {
      requestList.innerHTML = requests.length ? requests.slice(0, 8).map((item) => recordCard('content', item.title || 'Content request', `${item.requestType || 'request'} · ${item.budgetLane || 'lane pending'}`, [item.status || 'open', item.id, item.threadId || 'no thread'])).join('') : '<article class="record-card"><h4>No content requests yet</h4><p>Ask for cover art, captions, short clips, EPK copy, or a rollout pack from the exchange.</p></article>';
    }

    const inbox = $('#inboxList');
    if (inbox) {
      inbox.innerHTML = threads.length ? threads.slice(0, 8).map((thread) => {
        const messages = Array.isArray(thread.messages) ? thread.messages : [];
        const last = messages[messages.length - 1] || {};
        return recordCard('inbox', thread.topic || 'Artist inbox', last.body || 'Thread created for ConnectLog + Relay13 bridge handoff.', [thread.kind || 'thread', `${messages.length} messages`, thread.relay && thread.relay.status ? thread.relay.status : 'relay-ready']);
      }).join('') : '<article class="record-card"><h4>Inbox is ready</h4><p>Send a message or open a content request to create the first ConnectLog + Relay13-ready thread.</p></article>';
    }

    const community = $('#communityWall');
    if (community) {
      community.innerHTML = posts.length ? posts.slice(0, 8).map((post) => recordCard('community', post.category || 'community signal', post.body || 'Community post', [post.status || 'open', post.artistId || 'artist', post.linkedReleaseId || 'no release'])).join('') : '<article class="record-card"><h4>No community posts yet</h4><p>Post a collab call, feedback ask, producer request, show-slot request, or release milestone.</p></article>';
    }

    const campaign = $('#campaignPack');
    if (campaign) {
      const latest = campaigns[0];
      if (!latest) {
        campaign.innerHTML = '<article class="record-card"><h4>No campaign pack yet</h4><p>Generate a release pack to get captions, short-form hooks, rollout tasks, and asset requests.</p></article>';
      } else {
        const pack = latest.contentPack || {};
        campaign.innerHTML = `
          <article class="record-card campaign-card">
            <header><h4>${escapeHtml(latest.releaseTitle || 'Release campaign')}</h4><span class="pill gold">${escapeHtml(latest.offerLane || 'Lite brief')}</span></header>
            <p>${escapeHtml(latest.mood || 'Release momentum')}</p>
            <div class="campaign-columns">
              <div><strong>Captions</strong>${(pack.captions || []).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
              <div><strong>Hooks</strong>${(pack.shortFormHooks || []).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
              <div><strong>Runway</strong>${(pack.rolloutTasks || []).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
            </div>
          </article>`;
      }
    }
  }

  function feedMedia(item) {
    const media = item && item.media ? item.media : {};
    if (media.kind === 'image' && media.url) {
      return `<figure class="feed-media"><img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.alt || item.title || 'Feed media')}" loading="lazy" decoding="async" /></figure>`;
    }
    const label = media.label || item.avatar || 'SM';
    const gradient = media.gradient || 'linear-gradient(135deg,#6be8d6,#f2c766)';
    return `<figure class="feed-media generated-feed-cover" style="--feed-cover:${escapeHtml(gradient)}"><span>${escapeHtml(label)}</span><small>${escapeHtml(item.type || 'music')}</small></figure>`;
  }

  function feedCard(item) {
    const stats = item.stats || {};
    const comments = Array.isArray(stats.comments) ? stats.comments : [];
    const hashtags = Array.isArray(item.hashtags) ? item.hashtags : [];
    return `<article class="real-feed-card" data-feed-post="${escapeHtml(item.id)}">
      <header class="feed-author-row">
        <span class="feed-avatar">${escapeHtml(item.avatar || 'SM')}</span>
        <div>
          <strong>${escapeHtml(item.author || 'MusicNexus Artist')}</strong>
          <small>${escapeHtml(item.handle || item.source || 'musicnexus')} · ${escapeHtml(item.status || 'live')}</small>
        </div>
        <button class="ghost mini" type="button" data-feed-action="follow" data-feed-target="${escapeHtml(item.id)}" data-feed-artist="${escapeHtml(item.artistId || '')}">Follow</button>
      </header>
      ${feedMedia(item)}
      <div class="feed-actions" aria-label="Feed actions">
        <button type="button" class="feed-icon" data-feed-action="like" data-feed-target="${escapeHtml(item.id)}" data-feed-artist="${escapeHtml(item.artistId || '')}">Like</button>
        <button type="button" class="feed-icon" data-feed-action="comment" data-feed-target="${escapeHtml(item.id)}" data-feed-artist="${escapeHtml(item.artistId || '')}">Comment</button>
        <button type="button" class="feed-icon" data-feed-action="boost" data-feed-target="${escapeHtml(item.id)}" data-feed-artist="${escapeHtml(item.artistId || '')}">Boost</button>
        <button type="button" class="feed-icon" data-feed-action="save" data-feed-target="${escapeHtml(item.id)}" data-feed-artist="${escapeHtml(item.artistId || '')}">Save</button>
      </div>
      <div class="feed-body">
        <strong>${escapeHtml(item.title || 'Release signal')}</strong>
        <p>${escapeHtml(plainText(item.caption || ''))}</p>
        ${hashtags.length ? `<div class="feed-tags">${hashtags.map((tag) => `<span>#${escapeHtml(String(tag).replace(/^#/, ''))}</span>`).join('')}</div>` : ''}
      </div>
      <div class="feed-stats">
        <span>${escapeHtml(stats.likes || 0)} likes</span>
        <span>${escapeHtml(stats.saves || 0)} saves</span>
        <span>${escapeHtml(stats.boosts || 0)} boosts</span>
        ${stats.plays ? `<span>${escapeHtml(publicCountLabel(stats.plays, 'plays'))}</span>` : ''}
      </div>
      <div class="feed-comments">
        ${comments.length ? comments.slice(0, 3).map((comment) => `<p><strong>${escapeHtml(comment.artistId || 'artist')}</strong> ${escapeHtml(comment.body || '')}</p>`).join('') : '<p class="muted-feed-line">No comments yet.</p>'}
      </div>
      <form class="feed-comment-form" data-feed-comment-form="${escapeHtml(item.id)}">
        <input name="body" placeholder="Add a comment" />
        <button class="secondary mini" type="submit">Post</button>
      </form>
    </article>`;
  }

  function renderSocial() {
    const social = state.social || {};
    const catalog = Array.isArray(social.catalog) ? social.catalog : [];
    const connectors = Array.isArray(social.connectors) ? social.connectors : [];
    const posts = Array.isArray(social.postQueue) ? social.postQueue : [];
    const feedItems = Array.isArray(social.feedItems) ? social.feedItems : [];
    const stories = Array.isArray(social.stories) ? social.stories : [];
    const pulls = Array.isArray(social.feedPulls) ? social.feedPulls : [];
    const prRuns = Array.isArray(social.prRuns) ? social.prRuns : [];
    const featuredBlogs = Array.isArray(social.featuredBlogs) ? social.featuredBlogs : [];
    const marketingPackages = Array.isArray(social.marketingPackages) ? social.marketingPackages : [];
    const summary = social.summary || {};

    const deck = $('#socialFeedDeck');
    if (deck) {
      deck.innerHTML = feedItems.length ? feedItems.map(feedCard).join('') : `
        <article class="real-feed-card empty-feed">
          <div class="feed-body">
            <strong>No feed posts yet</strong>
            <p>Create the first artist post above, or publish a community signal from the Exchange.</p>
          </div>
        </article>`;
    }

    const storyRail = $('#socialStoryRail');
    if (storyRail) {
      storyRail.innerHTML = stories.length ? stories.map((story) => `
        <button type="button" class="story-bubble" data-route="./player.html">
          <span>${escapeHtml(story.avatar || 'SM')}</span>
          <strong>${escapeHtml(story.label || 'Artist')}</strong>
          <small>${escapeHtml(story.sublabel || 'signal')}</small>
        </button>`).join('') : '<article class="story-bubble story-empty"><span>+</span><strong>Start</strong><small>new post</small></article>';
    }

    const trending = $('#trendingReleaseRail');
    if (trending) {
      const releases = feedItems.filter((item) => item.releaseId || item.type === 'release').slice(0, 5);
      trending.innerHTML = releases.length ? releases.map((item) => `
        <button class="trend-row" type="button" data-route="./player.html">
          <span>${escapeHtml(item.avatar || 'SM')}</span>
          <strong>${escapeHtml(item.title || 'Release')}</strong>
          <small>${escapeHtml(item.status || item.source || 'music')}</small>
        </button>`).join('') : '<div class="trend-row"><span>SM</span><strong>No releases yet</strong><small>Forge a release</small></div>';
    }

    const catalogNode = $('#socialPlatformCatalog');
    if (catalogNode) {
      catalogNode.innerHTML = catalog.length ? catalog.map((item) => `
        <article class="social-platform-card">
          <span>${escapeHtml(item.id)}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.lane || item.protocol || '')}</p>
          <small>${escapeHtml(item.productionBoundary || item.source || '')}</small>
        </article>`).join('') : '<article class="record-card"><h4>No platform catalog loaded</h4><p>Connect a client session to read the open social spine manifest.</p></article>';
    }

    const summaryNode = $('#socialSummary');
    if (summaryNode) {
      summaryNode.innerHTML = `
        <div class="social-score"><strong>${escapeHtml(summary.feedItems || feedItems.length || 0)}</strong><span>feed posts</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.readyConnectors || 0)}</strong><span>ready accounts</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.prRuns || prRuns.length || 0)}</strong><span>PR runs</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.featuredBlogs || featuredBlogs.length || 0)}</strong><span>features</span></div>`;
    }

    const prSummaryNode = $('#socialPrAgentSummary');
    if (prSummaryNode) {
      prSummaryNode.innerHTML = `
        <div class="social-score"><strong>${escapeHtml(prRuns.length)}</strong><span>local PR runs</span></div>
        <div class="social-score"><strong>${escapeHtml(featuredBlogs.length)}</strong><span>feature blogs</span></div>
        <div class="social-score"><strong>${escapeHtml(marketingPackages.length)}</strong><span>promo packets</span></div>
        <div class="social-score"><strong>${escapeHtml((featuredBlogs || []).filter((blog) => /publish/i.test(blog.status || '')).length)}</strong><span>publish queue</span></div>`;
    }

    const connectorSelects = $$('select[name="connectorId"]');
    connectorSelects.forEach((select) => {
      const current = select.value;
      const options = connectors.map((connector) => `<option value="${escapeHtml(connector.id)}">${escapeHtml(connector.name || connector.platformName || connector.id)} / ${escapeHtml(connectedAccountLabel(connector.tokenStatus || connector.status || 'status'))}</option>`).join('');
      select.innerHTML = `<option value="">Select connector</option>${options}`;
      if (current && connectors.some((connector) => connector.id === current)) select.value = current;
    });

    const connectorList = $('#socialConnectorList');
    if (connectorList) {
      connectorList.innerHTML = connectors.length ? connectors.map((connector) => recordCard(
        connector.platform || 'social',
        connector.name || connector.platformName || 'Social connector',
        `${connector.instanceUrl || 'no instance'} ${connector.handle ? `/${connector.handle}` : ''}`,
        [connectedAccountLabel(connector.status || connector.tokenStatus || 'needs-token'), connectedAccountLabel(connector.tokenStatus || connector.status || ''), connector.defaultVisibility || 'visibility']
      )).join('') : '<article class="record-card"><h4>No social connectors yet</h4><p>Add Pixelfed, Mastodon-compatible, or Funkwhale account details. Tokens stay server-side.</p></article>';
    }

    const queueList = $('#socialPostQueue');
    if (queueList) {
      queueList.innerHTML = posts.length ? posts.slice(0, 10).map((post) => recordCard(
        post.platform || 'post',
        post.release && post.release.title ? post.release.title : post.id,
        post.statusText || post.caption || 'Queued social post',
        [connectedAccountLabel(post.status || 'queued'), post.visibility || 'visibility', post.connectorId || 'connector']
      )).join('') : '<article class="record-card"><h4>No queued posts yet</h4><p>Queue an artist/release post, then publish when the connected account is ready.</p></article>';
    }

    const publishSelect = $('#publishPostId');
    if (publishSelect) {
      const current = publishSelect.value;
      publishSelect.innerHTML = `<option value="">Select queued post</option>${posts.map((post) => `<option value="${escapeHtml(post.id)}">${escapeHtml(post.status || 'queued')} / ${escapeHtml((post.release && post.release.title) || post.id)}</option>`).join('')}`;
      if (current && posts.some((post) => post.id === current)) publishSelect.value = current;
    }

    const feedList = $('#federatedFeedList');
    if (feedList) {
      const latestPull = pulls[0];
      const statuses = latestPull && Array.isArray(latestPull.statuses) ? latestPull.statuses : [];
      feedList.innerHTML = statuses.length ? statuses.map((status) => recordCard(
        'fediverse',
        status.account && (status.account.displayName || status.account.acct) ? (status.account.displayName || status.account.acct) : status.id,
        plainText(status.contentHtml || status.url || 'Federated status'),
        [status.visibility || 'public', `${status.boosts || 0} boosts`, `${status.favourites || 0} likes`]
      )).join('') : '<article class="record-card"><h4>No federated feed pull yet</h4><p>Sync a hashtag or local public feed from a connected instance.</p></article>';
    }

    const prRunList = $('#socialPrRunList');
    if (prRunList) {
      prRunList.innerHTML = prRuns.length ? prRuns.slice(0, 12).map((run) => recordCard(
        run.source || 'pr-agent',
        run.focus || run.prRunId || 'PR run',
        run.status || 'drafted',
        [run.artistId || 'artist', run.releaseId || 'release', run.providerCallMade ? 'provider-used' : 'local-only']
      )).join('') : '<article class="record-card"><h4>No PR runs yet</h4><p>Run the local PR brain from a release, contest winner, or new drop.</p></article>';
    }

    const blogList = $('#featuredBlogList');
    if (blogList) {
      blogList.innerHTML = featuredBlogs.length ? featuredBlogs.slice(0, 12).map((blog) => recordCard(
        blog.status || 'feature',
        blog.title || blog.featuredBlogId,
        blog.summary || 'Featured artist package',
        [blog.artistName || blog.artistId || 'artist', blog.releaseTitle || blog.releaseId || 'release', blog.liveUrl || blog.slug || 'draft']
      )).join('') : '<article class="record-card"><h4>No featured blogs yet</h4><p>Contest winners and drop campaigns create owner-review PR features here.</p></article>';
    }

    const blogSelect = $('#featuredBlogId');
    if (blogSelect) {
      const current = blogSelect.value;
      blogSelect.innerHTML = `<option value="">Select feature</option>${featuredBlogs.map((blog) => `<option value="${escapeHtml(blog.featuredBlogId || blog.id)}">${escapeHtml(blog.status || 'draft')} / ${escapeHtml(blog.title || blog.featuredBlogId)}</option>`).join('')}`;
      if (current && featuredBlogs.some((blog) => (blog.featuredBlogId || blog.id) === current)) blogSelect.value = current;
    }
  }

  function renderStore() {
    const storeState = state.store || {};
    const stores = Array.isArray(storeState.stores) ? storeState.stores : [];
    const products = Array.isArray(storeState.products) ? storeState.products : [];
    const orders = Array.isArray(storeState.orders) ? storeState.orders : [];
    const summary = storeState.summary || {};

    const summaryNode = $('#storeSummary');
    if (summaryNode) {
      const primaryStore = stores[0] || {};
      const limits = primaryStore.limits || {};
      summaryNode.innerHTML = `
        <div class="social-score"><strong>${escapeHtml(summary.stores || stores.length || 0)}</strong><span>stores</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.activeProducts || products.filter((item) => item.status === 'active').length || 0)}</strong><span>active items</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.orders || orders.length || 0)}</strong><span>orders</span></div>
        <div class="social-score"><strong>${escapeHtml(fmtMoney((summary.artistNetCents || 0) / 100))}</strong><span>artist net</span></div>
        <div class="social-score"><strong>${escapeHtml(limits.maxProducts || 3)}</strong><span>${escapeHtml(limits.label || 'Free99 Lite storefront preview')}</span></div>`;
    }

    const storeList = $('#storeList');
    if (storeList) {
      storeList.innerHTML = stores.length ? stores.map((store) => recordCard('store', store.name || store.storeId, `${store.artistName || store.artistId || 'artist'} · ${store.bio || 'Nexus Store active'}`, [store.status || 'active', store.feeMode || 'buyer covered', `${store.productCount || products.filter((item) => item.artistId === store.artistId).length}/${store.limits?.maxProducts || 3} items`, store.limits?.skyeNetPublish ? 'SkyeNet publish' : 'SkyeNet upgrade', store.lastSkyeNetPublish?.mountPath || store.skyeNetUrl || store.slug || store.storeId])).join('') : '<article class="record-card"><h4>No artist stores yet</h4><p>Create a store for the artist before the public drop rollout.</p></article>';
    }

    const founderStorefronts = $('#founderStorefronts');
    if (founderStorefronts) {
      founderStorefronts.innerHTML = FOUNDER_ARTIST_STOREFRONTS.map((artist) => {
        const matchedStore = stores.find((store) => store.artistId === artist.artistId || store.slug === artist.slug) || {};
        const matchedProducts = products.filter((product) => product.artistId === artist.artistId);
        const status = matchedStore.status || 'reserved';
        return `<article class="founder-storefront-card">
          <div>
            <p class="micro">${escapeHtml(artist.tier)}</p>
            <h4>${escapeHtml(artist.name)}</h4>
            <p>${escapeHtml(artist.label)}</p>
          </div>
          <dl>
            <div><dt>Artist ID</dt><dd>${escapeHtml(artist.artistId)}</dd></div>
            <div><dt>SkyPay</dt><dd>${escapeHtml(artist.skyepayRef)}</dd></div>
            <div><dt>Status</dt><dd>${escapeHtml(status)}</dd></div>
            <div><dt>Products</dt><dd>${escapeHtml(matchedProducts.length)}</dd></div>
          </dl>
          <div class="storefront-card-actions">
            <a class="primary mini" href="${escapeHtml(artist.href)}">Open Store</a>
            <a class="ghost mini" href="${escapeHtml(artist.paperworkUrl)}">Paperwork</a>
            <button class="ghost mini" type="button" data-seed-storefront="${escapeHtml(artist.slug)}">Load Form</button>
          </div>
        </article>`;
      }).join('');
    }

    const productList = $('#storeProductList');
    if (productList) {
      productList.innerHTML = products.length ? products.map((product) => recordCard(product.productType || 'product', product.title || product.productId, product.description || `${fmtMoney((product.priceCents || 0) / 100)} · ${product.fulfillmentType || 'manual'}`, [product.status || 'active', product.artistId || 'artist', product.releaseId || product.dropId || 'standalone'])).join('') : '<article class="record-card"><h4>No products yet</h4><p>Add digital access, merch, tips, bookings, memberships, tickets, or private access.</p></article>';
    }

    const orderList = $('#storeOrderList');
    if (orderList) {
      orderList.innerHTML = orders.length ? orders.map((order) => recordCard('order', order.title || order.orderId, `${fmtMoney((order.totalCents || 0) / 100)} total · ${fmtMoney((order.artistNetCents || 0) / 100)} artist net`, [order.status || 'pending', order.fulfillmentStatus || 'not started', order.buyerEmail || 'no buyer email'])).join('') : '<article class="record-card"><h4>No order intents yet</h4><p>Record an order intent to request a SkyePay route while the store stays protected by client access.</p></article>';
    }

    $$('select[name="productId"]').forEach((select) => {
      const current = select.value;
      select.innerHTML = `<option value="">Select product</option>${products.map((product) => `<option value="${escapeHtml(product.productId || product.id)}">${escapeHtml(product.title || product.productId)} / ${escapeHtml(fmtMoney((product.priceCents || 0) / 100))}</option>`).join('')}`;
      if (current && products.some((product) => (product.productId || product.id) === current)) select.value = current;
    });
  }

  function renderBrain() {
    const brainState = state.brains || {};
    const profiles = Array.isArray(brainState.profiles) ? brainState.profiles : [];
    const memory = Array.isArray(brainState.memory) ? brainState.memory : [];
    const actions = Array.isArray(brainState.actions) ? brainState.actions : [];
    const cycles = Array.isArray(brainState.cycles) ? brainState.cycles : [];
    const toolRuns = Array.isArray(brainState.toolRuns) ? brainState.toolRuns : [];
    const toolCatalog = Array.isArray(brainState.toolCatalog) ? brainState.toolCatalog : [];
    const summary = brainState.summary || {};

    const summaryNode = $('#brainSummary');
    if (summaryNode) {
      summaryNode.innerHTML = `
        <div class="social-score"><strong>${escapeHtml(summary.profiles || profiles.length || 0)}</strong><span>brains</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.actions || actions.length || 0)}</strong><span>actions</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.executedActions || actions.filter((item) => item.status === 'executed').length || 0)}</strong><span>executed</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.toolRuns || toolRuns.length || 0)}</strong><span>tool runs</span></div>`;
    }

    const profilesNode = $('#brainProfileList');
    if (profilesNode) {
      profilesNode.innerHTML = profiles.length ? profiles.map((profile) => recordCard('brain', profile.artistName || profile.artistId, profile.objectives ? profile.objectives.join(', ') : 'Artist rules, memory chunks, and network playbooks.', [profile.status || 'active', profile.localOnly ? 'client-ready' : 'connected', profile.autopilot ? 'autopilot-ready' : 'manual-cycle'])).join('') : '<article class="record-card"><h4>No artist brains yet</h4><p>Seed an artist brain to plan posts, stream network releases, reply, route store work, and earn SkyeMeter points.</p></article>';
    }

    const actionsNode = $('#brainActionList');
    if (actionsNode) {
      actionsNode.innerHTML = actions.length ? actions.slice(0, 14).map((action) => recordCard(action.type || 'action', action.title || action.actionId, action.caption || action.body || action.releaseId || 'Artist rule-memory action', [action.status || 'planned', action.artistId || 'artist', action.targetArtistId || action.releaseId || action.productId || action.targetId || 'session'])).join('') : '<article class="record-card"><h4>No brain actions yet</h4><p>Run an artist cycle to create post, stream, engagement, reply, and task actions.</p></article>';
    }

    const toolCatalogNode = $('#brainToolCatalog');
    if (toolCatalogNode) {
      toolCatalogNode.innerHTML = toolCatalog.length ? toolCatalog.map((tool) => recordCard(tool.kind || 'tool', tool.label || tool.id, tool.value || 'Local 0S artist tool handoff', [tool.appName || tool.appId || '0S app', tool.localOnly ? 'local' : 'connected', tool.providerRequired ? 'provider' : 'provider-free'], { href: tool.handoffUrl || tool.route })).join('') : '<article class="record-card"><h4>No tool catalog yet</h4><p>Select or seed an artist so the local brain can expose SkyeMediaCenter, BrandID Offline PWA, kAIxUBrandKit, BusinessLaunchGo, and release-page handoffs.</p></article>';
    }

    const toolRunNode = $('#brainToolRunList');
    if (toolRunNode) {
      toolRunNode.innerHTML = toolRuns.length ? toolRuns.slice(0, 12).map((run) => recordCard(run.toolId || 'tool', run.title || run.toolLabel || run.toolRunId, run.brief || run.publishablePost || 'Local artist tool output ready for review.', [run.status || 'ready', run.appName || run.appId || '0S app', run.releaseTitle || run.releaseId || run.productId || 'artist'], { href: run.handoffUrl })).join('') : '<article class="record-card"><h4>No local tool runs yet</h4><p>Build a media pack, brand kit, logo brief, launch offer, landing page plan, campaign brief, press kit, or RouteX launch package from the artist brain.</p></article>';
    }

    const memoryNode = $('#brainMemoryList');
    if (memoryNode) {
      memoryNode.innerHTML = memory.length ? memory.slice(0, 12).map((item) => recordCard('memory', item.title || item.memoryId, item.text || 'Memory chunk', [item.source || 'artist-team', item.artistId || 'artist', Array.isArray(item.tags) ? item.tags.join(', ') : 'tags'])).join('') : '<article class="record-card"><h4>No memory chunks yet</h4><p>Add artist facts, campaign notes, voice rules, release stories, and fan routing preferences.</p></article>';
    }
  }

  function renderGamify() {
    const gamify = state.gamify || {};
    const meters = Array.isArray(gamify.meters) ? gamify.meters : [];
    const merits = Array.isArray(gamify.merits) ? gamify.merits : [];
    const events = Array.isArray(gamify.events) ? gamify.events : [];
    const giveaways = Array.isArray(gamify.giveaways) ? gamify.giveaways : [];
    const entries = Array.isArray(gamify.entries) ? gamify.entries : [];
    const summary = gamify.summary || {};

    const summaryNode = $('#skyeMeterSummary');
    if (summaryNode) {
      summaryNode.innerHTML = `
        <div class="social-score"><strong>${escapeHtml(summary.events || events.length || 0)}</strong><span>meter events</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.merits || merits.length || 0)}</strong><span>SkyeMerits</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.openGiveaways || giveaways.filter((item) => item.status === 'open').length || 0)}</strong><span>open giveaways</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.entries || entries.length || 0)}</strong><span>entries</span></div>`;
    }

    const meterList = $('#skyeMeterList');
    if (meterList) {
      meterList.innerHTML = meters.length ? meters.map((meter) => `
        <article class="record-card">
          <header><h4>${escapeHtml(meter.artistName || meter.artistId)}</h4><span class="pill gold">Level ${escapeHtml(meter.level || 1)}</span></header>
          <p>${escapeHtml(meter.lifetimePoints || 0)} lifetime points · ${escapeHtml(meter.meritBalance || 0)} merit balance</p>
          <div class="progress-bar" aria-label="SkyeMeter progress"><i style="width:${Math.max(0, Math.min(100, Number(meter.percent ?? Math.round((Number(meter.cyclePoints || 0) / 100) * 100))))}%"></i></div>
          <div class="record-meta"><span class="pill">${escapeHtml(meter.cyclePoints || 0)} / 100</span><span class="pill">${escapeHtml(meter.meritCount || 0)} issued</span><span class="pill">${escapeHtml(meter.status || 'active')}</span></div>
        </article>`).join('') : '<article class="record-card"><h4>No SkyeMeters yet</h4><p>Streams, posts, comments, store work, brain cycles, and giveaways fill the meter.</p></article>';
    }

    const giveawayList = $('#giveawayList');
    if (giveawayList) {
      giveawayList.innerHTML = giveaways.length ? giveaways.map((giveaway) => recordCard('giveaway', giveaway.title || giveaway.giveawayId, giveaway.prizeDescription || 'Content launch, new drop, or agentic website growth package.', [giveaway.status || 'open', giveaway.prizeType || 'package', `${entries.filter((entry) => entry.giveawayId === giveaway.giveawayId).length} entries`, giveaway.winnerArtistId || 'no winner'])).join('') : '<article class="record-card"><h4>No giveaways yet</h4><p>Open a content launch, new drop, store, studio, or agentic website boost giveaway.</p></article>';
    }

    const eventList = $('#skyeMeterEventList');
    if (eventList) {
      eventList.innerHTML = events.length ? events.slice(0, 14).map((event) => recordCard(event.activityType || 'activity', `${event.points || 0} points`, event.note || event.source || 'SkyeMeter event', [event.artistId || 'artist', event.releaseId || event.postId || event.targetArtistId || 'network', event.issuedMerits?.length ? `${event.issuedMerits.length} merit issued` : `${event.meterPercent || 0}%`])).join('') : '<article class="record-card"><h4>No meter events yet</h4><p>Run an artist brain cycle or record an activity to start the engagement trail.</p></article>';
    }

    $$('select[name="giveawayId"]').forEach((select) => {
      const current = select.value;
      select.innerHTML = `<option value="">Select giveaway</option>${giveaways.map((giveaway) => `<option value="${escapeHtml(giveaway.giveawayId || giveaway.id)}">${escapeHtml(giveaway.status || 'open')} / ${escapeHtml(giveaway.title || giveaway.giveawayId)}</option>`).join('')}`;
      if (current && giveaways.some((giveaway) => (giveaway.giveawayId || giveaway.id) === current)) select.value = current;
    });
  }

  function renderContests() {
    const contestsState = state.contests || {};
    const contests = Array.isArray(contestsState.contests) ? contestsState.contests : [];
    const entries = Array.isArray(contestsState.entries) ? contestsState.entries : [];
    const packages = Array.isArray(contestsState.featurePackages) ? contestsState.featurePackages : [];
    const backlinks = Array.isArray(contestsState.backlinks) ? contestsState.backlinks : [];
    const summary = contestsState.summary || {};

    const summaryNode = $('#contestSummary');
    if (summaryNode) {
      summaryNode.innerHTML = `
        <div class="social-score"><strong>${escapeHtml(summary.open || contests.filter((item) => item.status === 'open').length || 0)}</strong><span>open contests</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.entries || entries.length || 0)}</strong><span>entries</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.winners || entries.filter((item) => item.status === 'winner').length || 0)}</strong><span>winners</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.featurePackages || packages.length || 0)}</strong><span>feature packs</span></div>`;
    }

    const contestList = $('#contestList');
    if (contestList) {
      contestList.innerHTML = contests.length ? contests.map((contest) => recordCard(
        contest.status || 'contest',
        contest.title || contest.contestId,
        contest.prizeDescription || 'Featured PR package',
        [contest.prizeType || 'prize', `${contest.entryCount ?? entries.filter((entry) => entry.contestId === contest.contestId).length} entries`, contest.featurePackageId || 'no package']
      )).join('') : '<article class="record-card"><h4>No contests yet</h4><p>Create a featured artist contest or open a giveaway from the social command room.</p></article>';
    }

    const entryList = $('#contestEntryList');
    if (entryList) {
      entryList.innerHTML = entries.length ? entries.slice(0, 16).map((entry) => recordCard(
        entry.status || 'entry',
        entry.artistName || entry.artistId || entry.entrantType || 'entrant',
        entry.note || entry.moderationStatus || 'Contest entry',
        [entry.contestId || 'contest', entry.moderationStatus || 'pending_review', entry.featurePackageId || 'no package']
      )).join('') : '<article class="record-card"><h4>No entries yet</h4><p>Artists and fans can enter through the shared gate lane.</p></article>';
    }

    const packageList = $('#contestPackageList');
    if (packageList) {
      packageList.innerHTML = packages.length ? packages.slice(0, 12).map((pkg) => recordCard(
        pkg.status || 'package',
        pkg.artistName || pkg.artistId || pkg.featurePackageId,
        pkg.prizeType || 'featured_blog_pr_package',
        [pkg.contestId || 'contest', pkg.featuredBlogId || 'no blog', pkg.providerCallMade ? 'provider-used' : 'local-only']
      )).join('') : '<article class="record-card"><h4>No feature packages yet</h4><p>Draw a winner, then generate the PR package.</p></article>';
    }

    const backlinkList = $('#contestBacklinkList');
    if (backlinkList) {
      backlinkList.innerHTML = backlinks.length ? backlinks.slice(0, 12).map((link) => recordCard(
        link.reviewStatus || 'pending_review',
        link.href || link.backlinkId,
        link.classification || 'entrant-submitted',
        [link.rel || 'rel', link.artistId || 'entrant', link.contestId || 'contest']
      )).join('') : '<article class="record-card"><h4>No submitted links yet</h4><p>Contest backlinks stay hidden until reviewed.</p></article>';
    }

    $$('select[name="contestId"]').forEach((select) => {
      const current = select.value;
      select.innerHTML = `<option value="">Select contest</option>${contests.map((contest) => `<option value="${escapeHtml(contest.contestId || contest.id)}">${escapeHtml(contest.status || 'open')} / ${escapeHtml(contest.title || contest.contestId)}</option>`).join('')}`;
      if (current && contests.some((contest) => (contest.contestId || contest.id) === current)) {
        select.value = current;
      } else if (select.required && contests[0]) {
        select.value = contests[0].contestId || contests[0].id || '';
      }
    });

    $$('select[name="featurePackageId"]').forEach((select) => {
      const current = select.value;
      select.innerHTML = `<option value="">Select package</option>${packages.map((pkg) => `<option value="${escapeHtml(pkg.featurePackageId || pkg.id)}">${escapeHtml(pkg.status || 'package')} / ${escapeHtml(pkg.artistName || pkg.artistId || pkg.featurePackageId)}</option>`).join('')}`;
      if (current && packages.some((pkg) => (pkg.featurePackageId || pkg.id) === current)) {
        select.value = current;
      } else if (select.required && packages[0]) {
        select.value = packages[0].featurePackageId || packages[0].id || '';
      }
    });
  }

  function renderRights() {
    const list = $('#rightsAuditList');
    if (!list) return;
    const releases = state.releases || [];
    if (!releases.length) {
      list.innerHTML = '<article class="record-card"><h4>No release rights yet</h4><p>Forge a release, then save its rights status before linked audio playback.</p></article>';
      return;
    }
    list.innerHTML = releases.slice(0, 10).map((release) => {
      const rights = rightsStatusFor(release);
      const linked = Array.isArray(release.tracks) ? release.tracks.filter((track) => track.previewUrl).length : 0;
      const cls = rights.blocked ? 'blocked' : rights.status === 'preview-ready' || rights.status === 'distribution-ready' ? 'ready' : '';
      return `<article class="rights-status ${cls}">
        <strong>${escapeHtml(release.title || 'Untitled Release')}</strong>
        <p>${escapeHtml(rights.status)} · ${escapeHtml(linked)} linked preview${linked === 1 ? '' : 's'} · ${escapeHtml(rights.email || 'no rights contact')}</p>
        <div class="record-meta">
          <span class="pill ${rights.ownership ? 'lime' : ''}">ownership ${rights.ownership ? 'yes' : 'needed'}</span>
          <span class="pill ${rights.preview ? 'lime' : ''}">preview ${rights.preview ? 'yes' : 'needed'}</span>
          <span class="pill ${rights.distribution ? 'gold' : ''}">distribution ${rights.distribution ? 'yes' : 'pending'}</span>
          <span class="pill ${rights.blocked ? 'pink' : ''}">${rights.blocked ? 'playback blocked' : release.id}</span>
        </div>
      </article>`;
    }).join('');
  }

  function trackLineForAsset(asset) {
    const title = asset.title || asset.originalName || 'Uploaded Track';
    return `${title} | 180 | ${asset.streamUrl}`;
  }

  function renderAssets() {
    const list = $('#assetList');
    const count = $('#assetCount');
    const assets = Array.isArray(state.assets) ? state.assets : [];
    if (count) count.textContent = fmtNumber(assets.length);
    renderStorageReadiness();
    if (!list) return;
    list.innerHTML = assets.length ? assets.slice(0, 12).map((asset) => `
      <article class="asset-card">
        <header>
          <strong>${escapeHtml(asset.title || asset.originalName || asset.id)}</strong>
          <span class="pill">${escapeHtml(asset.contentType || 'audio')}</span>
        </header>
        <p>${escapeHtml(asset.originalName || asset.id)} · ${escapeHtml(fmtNumber(asset.bytes || 0))} bytes</p>
        <div class="record-meta">
          <span class="pill">${escapeHtml(asset.artistId || 'no artist')}</span>
          <span class="pill">${escapeHtml(asset.releaseId || 'no release')}</span>
          <span class="pill ${asset.storage === 'skyevault-r2-gated-audio' ? 'lime' : ''}">${escapeHtml(asset.storage === 'skyevault-r2-gated-audio' ? 'protected audio vault' : asset.storage || 'protected preview')}</span>
          <span class="pill ${asset.status === 'ready' || !asset.status ? 'lime' : 'gold'}">${escapeHtml(asset.status || 'ready')}</span>
          <span class="pill">sha ${escapeHtml(String(asset.sha256 || '').slice(0, 10))}</span>
        </div>
        <button class="secondary mini" type="button" data-use-asset="${escapeHtml(asset.id)}">Use in Release Forge</button>
      </article>`).join('') : '<article class="asset-card"><h4>No audio uploaded yet</h4><p>Upload an owned or licensed preview to create a protected stream URL for the release forge.</p></article>';
  }

  function renderStorageReadiness() {
    const target = $('#storageReadiness');
    if (!target) return;
    const storage = state.assetStorage || {};
    const direct = storage.directUploadAvailable ? 'ready' : 'parked';
    target.innerHTML = `<strong>${escapeHtml(storage.mode || 'protected')} storage</strong><br>
      durable: ${storage.durable ? 'yes' : 'no'} · large-file upload: ${direct}<br>
      standard cap: ${escapeHtml(fmtNumber(storage.maxBase64UploadBytes || 0))} bytes · large-file cap: ${escapeHtml(fmtNumber(storage.maxDirectUploadBytes || 0))} bytes`;
  }

  function renderDrops() {
    const dropsState = state.drops || {};
    const drops = Array.isArray(dropsState.items) ? dropsState.items : [];
    const batches = Array.isArray(dropsState.batches) ? dropsState.batches : [];
    const deploys = Array.isArray(dropsState.deploys) ? dropsState.deploys : [];
    const estimate = dropsState.estimate || {};
    const env = dropsState.env || {};
    const traffic = dropsState.trafficSummary || {};

    const meter = $('#dropCreditMeter');
    if (meter) {
      meter.innerHTML = `
        <div class="prism-row"><span>Estimated credits</span><strong>${escapeHtml(Number(estimate.estimatedCredits || 0).toFixed(2))}</strong></div>
        <div class="prism-row"><span>Bandwidth GB</span><strong>${escapeHtml(Number(estimate.estimatedBandwidthGb || 0).toFixed(3))}</strong></div>
        <div class="prism-row"><span>Reserve fit</span><strong>${estimate.fitsReserve ? 'Yes' : 'No'}</strong></div>
        <div class="prism-row"><span>Live publish</span><strong>${env.netlify?.liveDeployEnabled ? 'On' : 'Off'}</strong></div>`;
    }

    const envNode = $('#dropEnvStatus');
    if (envNode) {
      envNode.innerHTML = `
        <strong>Publishing setup is protected</strong>
        <div class="record-meta" style="margin-top:10px">
          <span class="pill ${env.netlify?.configured ? 'lime' : 'gold'}">Publish lane ${env.netlify?.configured ? 'ready' : 'pending'}</span>
          <span class="pill ${env.email?.configured ? 'lime' : 'gold'}">Email ${escapeHtml(env.email?.provider || 'system')}</span>
          <span class="pill ${env.privateStorage?.configured ? 'lime' : ''}">${escapeHtml(env.privateStorage?.mode || 'protected storage')}</span>
          <span class="pill">${env.netlify?.liveDeployEnabled ? 'production enabled' : 'package draft only'}</span>
        </div>`;
    }

    const dropList = $('#dropList');
    if (dropList) {
      dropList.innerHTML = drops.length ? drops.slice(0, 18).map((drop) => recordCard(
        'drop',
        drop.title || drop.dropId,
        `${drop.artistName || drop.artistId || 'artist'} · ${drop.dropType || 'drop'} · ${drop.visibility || 'public'}`,
        [drop.status || 'draft', drop.dropId, drop.rightsStatus || 'rights', drop.tierPolicy || 'tier']
      )).join('') : '<article class="record-card"><h4>No drops yet</h4><p>Create a drop from an uploaded track or release, then submit it to the release pool.</p></article>';
    }

    const batchList = $('#dropBatchList');
    if (batchList) {
      batchList.innerHTML = batches.length ? batches.slice(0, 14).map((batch) => recordCard(
        'batch',
        batch.batchId,
        `${(batch.dropIds || []).length} drops · ${Number(batch.estimatedCredits || 0).toFixed(2)} est credits`,
        [batch.status || 'queued', batch.autoApprovalEligibleAt || 'approval not sent', batch.liveBaseUrl || 'no live url']
      )).join('') : '<article class="record-card"><h4>No batches yet</h4><p>Batch compatible drops into one release package.</p></article>';
    }

    const deployList = $('#dropDeployList');
    if (deployList) {
      deployList.innerHTML = deploys.length ? deploys.slice(0, 10).map((deploy) => recordCard(
        'deploy',
        deploy.deployReceiptId || deploy.batchId,
        deploy.liveBaseUrl || deploy.outputDir || 'Release package ready',
        [deploy.status || 'receipt', deploy.mode || 'mode', deploy.redacted ? 'redacted' : 'receipt']
      )).join('') : '<article class="record-card"><h4>No publish records yet</h4><p>Publishing prepares the approved release package and records its status.</p></article>';
    }

    const trafficNode = $('#dropTrafficSummary');
    if (trafficNode) {
      trafficNode.innerHTML = `
        <div class="social-score"><strong>${escapeHtml(traffic.pageViews || 0)}</strong><span>views</span></div>
        <div class="social-score"><strong>${escapeHtml(traffic.playStarts || 0)}</strong><span>starts</span></div>
        <div class="social-score"><strong>${escapeHtml(traffic.nexusStreams || 0)}</strong><span>streams</span></div>
        <div class="social-score"><strong>${escapeHtml(traffic.downloads || 0)}</strong><span>downloads</span></div>`;
    }

    const dropSelects = $$('select[name="dropId"]');
    dropSelects.forEach((select) => {
      const current = select.value;
      select.innerHTML = `<option value="">Select drop</option>${drops.map((drop) => `<option value="${escapeHtml(drop.dropId)}">${escapeHtml(drop.status || 'draft')} / ${escapeHtml(drop.title || drop.dropId)}</option>`).join('')}`;
      if (current && drops.some((drop) => drop.dropId === current)) select.value = current;
    });

    const batchSelects = $$('select[name="batchId"]');
    batchSelects.forEach((select) => {
      const current = select.value;
      select.innerHTML = `<option value="">Select batch</option>${batches.map((batch) => `<option value="${escapeHtml(batch.batchId)}">${escapeHtml(batch.status || 'queued')} / ${escapeHtml(batch.batchId)}</option>`).join('')}`;
      if (current && batches.some((batch) => batch.batchId === current)) select.value = current;
    });
  }

  async function refreshSession() {
    if (staticPreview) return updateSessionChip(null);
    if (!auth) return updateSessionChip(null);
    try {
      const info = await auth.getSessionInfo();
      updateSessionChip(info);
    } catch {
      updateSessionChip(null);
    }
  }

  async function refreshRecords({ quiet = false } = {}) {
    try {
      const artists = await callFunction('music-artists', { query: { action: 'list' } });
      state.artists = Array.isArray(artists.artists) ? artists.artists : [];
    } catch (err) {
      if (!quiet) toast(`Artists read failed: ${err.message}`, 'error');
    }

    try {
      const releases = await callFunction('music-releases', { query: { action: 'list' } });
      state.releases = Array.isArray(releases.releases) ? releases.releases : [];
    } catch (err) {
      if (!quiet) toast(`Releases read failed: ${err.message}`, 'error');
    }

    if (staticPreview || (auth && auth.hasToken())) {
      try {
        const analytics = await callFunction('music-analytics');
        state.analytics = analytics;
      } catch {
        state.analytics = null;
      }
      try {
        const payouts = await callFunction('music-payments', { query: { action: 'payouts' } });
        state.payouts = Array.isArray(payouts.payouts) ? payouts.payouts : [];
      } catch {
        state.payouts = [];
      }
      try {
        const board = await callFunction('music-releases', { query: { action: 'operations-board' } });
        state.workflows = Array.isArray(board.workflows) ? board.workflows : [];
      } catch {
        state.workflows = [];
      }
      try {
        const assets = await callFunction('music-assets', { query: { action: 'list', artistId: state.lastArtistId } });
        state.assets = Array.isArray(assets.assets) ? assets.assets : [];
        state.assetStorage = assets.storage || null;
      } catch {
        state.assets = [];
        state.assetStorage = null;
      }
      try {
        const drops = await callFunction('music-drops', { query: { action: 'hub' } });
        state.drops = {
          items: Array.isArray(drops.drops) ? drops.drops : [],
          batches: Array.isArray(drops.batches) ? drops.batches : [],
          deploys: Array.isArray(drops.deploys) ? drops.deploys : [],
          trafficSummary: drops.trafficSummary || null,
          env: drops.env || null,
          estimate: drops.estimate || null,
        };
      } catch {
        state.drops = { items: [], batches: [], deploys: [], trafficSummary: null, env: null, estimate: null };
      }
      try {
        const exchange = await callFunction('music-exchange', { query: { action: 'hub', artistId: state.lastArtistId } });
        state.exchange = {
          contentRequests: Array.isArray(exchange.contentRequests) ? exchange.contentRequests : [],
          threads: Array.isArray(exchange.threads) ? exchange.threads : [],
          communityPosts: Array.isArray(exchange.communityPosts) ? exchange.communityPosts : [],
          campaigns: Array.isArray(exchange.campaigns) ? exchange.campaigns : [],
          progress: exchange.progress || null,
        };
      } catch {
        state.exchange = { contentRequests: [], threads: [], communityPosts: [], campaigns: [], progress: null };
      }
      try {
        const social = await callFunction('music-social', { query: { action: 'hub', artistId: state.lastArtistId } });
        state.social = {
          catalog: Array.isArray(social.catalog) ? social.catalog : [],
          connectors: Array.isArray(social.connectors) ? social.connectors : [],
          postQueue: Array.isArray(social.postQueue) ? social.postQueue : [],
          feedItems: Array.isArray(social.feedItems) ? social.feedItems : [],
          stories: Array.isArray(social.stories) ? social.stories : [],
          feedPulls: Array.isArray(social.feedPulls) ? social.feedPulls : [],
          moderation: Array.isArray(social.moderation) ? social.moderation : [],
          feedActions: Array.isArray(social.feedActions) ? social.feedActions : [],
          follows: Array.isArray(social.follows) ? social.follows : [],
          notifications: Array.isArray(social.notifications) ? social.notifications : [],
          profiles: Array.isArray(social.profiles) ? social.profiles : [],
          media: Array.isArray(social.media) ? social.media : [],
          prRuns: Array.isArray(social.prRuns) ? social.prRuns : [],
          featuredBlogs: Array.isArray(social.featuredBlogs) ? social.featuredBlogs : [],
          marketingPackages: Array.isArray(social.marketingPackages) ? social.marketingPackages : [],
          contestBriefs: Array.isArray(social.contestBriefs) ? social.contestBriefs : [],
          summary: social.summary || null,
        };
      } catch {
        state.social = { catalog: [], connectors: [], postQueue: [], feedItems: [], stories: [], feedPulls: [], moderation: [], feedActions: [], follows: [], notifications: [], profiles: [], media: [], prRuns: [], featuredBlogs: [], marketingPackages: [], contestBriefs: [], summary: null };
      }
      try {
        const store = await callFunction('music-store', { query: { action: 'hub', artistId: state.lastArtistId } });
        state.store = {
          stores: Array.isArray(store.stores) ? store.stores : [],
          products: Array.isArray(store.products) ? store.products : [],
          orders: Array.isArray(store.orders) ? store.orders : [],
          fulfillments: Array.isArray(store.fulfillments) ? store.fulfillments : [],
          summary: store.summary || null,
        };
      } catch {
        state.store = { stores: [], products: [], orders: [], fulfillments: [], summary: null };
      }
      try {
        const brains = await callFunction('music-brain', { query: { action: 'hub', artistId: state.lastArtistId } });
        state.brains = {
          profiles: Array.isArray(brains.profiles) ? brains.profiles : [],
          memory: Array.isArray(brains.memory) ? brains.memory : [],
          actions: Array.isArray(brains.actions) ? brains.actions : [],
          cycles: Array.isArray(brains.cycles) ? brains.cycles : [],
          toolRuns: Array.isArray(brains.toolRuns) ? brains.toolRuns : [],
          toolCatalog: Array.isArray(brains.toolCatalog) ? brains.toolCatalog : [],
          summary: brains.summary || null,
        };
      } catch {
        state.brains = { profiles: [], memory: [], actions: [], cycles: [], toolRuns: [], toolCatalog: [], summary: null };
      }
      try {
        const gamify = await callFunction('music-gamify', { query: { action: 'hub', artistId: state.lastArtistId } });
        state.gamify = {
          meters: Array.isArray(gamify.meters) ? gamify.meters : [],
          merits: Array.isArray(gamify.merits) ? gamify.merits : [],
          events: Array.isArray(gamify.events) ? gamify.events : [],
          giveaways: Array.isArray(gamify.giveaways) ? gamify.giveaways : [],
          entries: Array.isArray(gamify.entries) ? gamify.entries : [],
          summary: gamify.summary || null,
        };
      } catch {
        state.gamify = { meters: [], merits: [], events: [], giveaways: [], entries: [], summary: null };
      }
      try {
        const contests = await callFunction('music-contests', { query: { action: 'hub', artistId: state.lastArtistId } });
        state.contests = {
          contests: Array.isArray(contests.contests) ? contests.contests : [],
          entries: Array.isArray(contests.entries) ? contests.entries : [],
          featurePackages: Array.isArray(contests.featurePackages) ? contests.featurePackages : [],
          backlinks: Array.isArray(contests.backlinks) ? contests.backlinks : [],
          winners: Array.isArray(contests.winners) ? contests.winners : [],
          summary: contests.summary || null,
        };
      } catch {
        state.contests = { contests: [], entries: [], featurePackages: [], backlinks: [], winners: [], summary: null };
      }
    }

    setMeters();
    renderRecords();
    renderAnalytics();
    renderExchange();
    renderSocial();
    renderStore();
    renderBrain();
    renderGamify();
    renderContests();
    renderPlayback();
    renderRights();
    renderAssets();
    renderDrops();
    fillLastIds();
    if (!quiet) toast('Nexus records refreshed.');
  }

  async function createProofSession() {
    if (staticPreview) return toast('Open the live app to start a client session.', 'info');
    if (!auth) return toast('Client session helper is unavailable.', 'error');
    try {
      const session = window.SkyeMusicGate?.session?.() || await window.SkyeMusicGate?.requireSession?.();
      if (!session?.token) {
        toast('Open Client Login first, then return to connect your 0S session.', 'info');
        return;
      }
      auth.setToken(session.token);
      updateSessionChip({ activeSession: { role: session.role || 'client', email: session.email || session.client || '' } });
      toast('0S client session connected.');
      await refreshRecords({ quiet: true });
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function logout() {
    if (!auth) return;
    try {
      await auth.logoutSession();
      updateSessionChip(null);
      state.analytics = null;
      state.payouts = [];
      state.workflows = [];
      setMeters();
      renderRecords();
      renderAnalytics();
      renderStore();
      renderBrain();
      renderGamify();
      toast('Client session disconnected.');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function wireChrome() {
    $$('[data-action="proof-session"]').forEach((button) => button.addEventListener('click', createProofSession));
    $$('[data-action="logout"]').forEach((button) => button.addEventListener('click', logout));
    $$('[data-action="refresh-records"]').forEach((button) => button.addEventListener('click', () => refreshRecords()));
    $$('[data-route]').forEach((button) => button.addEventListener('click', () => {
      const route = button.dataset.route;
      if (route) window.location.href = route;
    }));
    $$('[data-jump]').forEach((button) => button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.jump);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    $$('.node').forEach((button) => button.addEventListener('click', () => {
      $$('.node').forEach((item) => item.classList.toggle('active', item === button));
      const copy = lensCopy[button.dataset.lens] || lensCopy.distribution;
      $('#lensMicro').textContent = copy.micro;
      $('#lensTitle').textContent = copy.title;
      $('#lensText').textContent = copy.text;
    }));
  }

  function wirePlayback() {
    const deck = $('#playbackDeck');
    if (!deck) return;
    deck.addEventListener('click', async (event) => {
      const queueButton = event.target.closest('[data-track-index]');
      if (queueButton) {
        await playTrack(Number(queueButton.dataset.trackIndex || 0));
        return;
      }
      const action = event.target.closest('[data-player-action]')?.dataset.playerAction;
      if (action === 'play') await playTrack(state.player.activeIndex);
      if (action === 'stop') await stopPlayback({ completed: false });
      if (action === 'next') await playNextTrack();
    });
  }

  function wireAssetActions() {
    const list = $('#assetList');
    if (!list) return;
    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-use-asset]');
      if (!button) return;
      const asset = state.assets.find((item) => item.id === button.dataset.useAsset);
      if (!asset) return;
      const line = trackLineForAsset(asset);
      const target = $('#releaseForm textarea[name="tracks"]') || $('#uploadedTrackLine');
      if (target && target.tagName === 'TEXTAREA') {
        target.value = target.value ? `${target.value.trim()}\n${line}` : line;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target) {
        target.value = line;
      }
      navigator.clipboard?.writeText(line).catch(() => {});
      toast('Uploaded track line copied into the release forge.');
    });
  }

  function wireOperatorDialog() {
    return null;
  }

  function wireArtistForm() {
    const form = $('#artistForm');
    if (!form) return;
    let selectedPhoto = null;
    syncIdentityToArtistForm();
    syncSkyEmailToArtistForm();
    $('[data-action="pull-skye-id"]', form)?.addEventListener('click', () => {
      const identity = syncIdentityToArtistForm({ force: true });
      toast(identity ? 'Skye ID synced into the artist node.' : 'No Skye ID draft found yet.', identity ? 'info' : 'error');
    });
    $('[data-action="pull-skyemail"]', form)?.addEventListener('click', () => {
      const draft = syncSkyEmailToArtistForm({ force: true });
      toast(draft && draft.email ? 'SkyEmail synced into the artist node.' : 'No SkyEmail draft found yet.', draft && draft.email ? 'info' : 'error');
    });
    form.elements.profilePhotoFile?.addEventListener('change', async () => {
      const meta = $('#artistPhotoMeta');
      try {
        if (meta) meta.textContent = 'Preparing artist photo...';
        selectedPhoto = await readArtistPhoto(form, null);
        if (selectedPhoto?.dataUrl) {
          const preview = $('#artistPhotoPreview');
          if (preview) {
            preview.src = selectedPhoto.dataUrl;
            preview.hidden = false;
          }
          if (meta) meta.textContent = `${selectedPhoto.name || 'Artist photo'} linked.`;
        }
      } catch (err) {
        selectedPhoto = null;
        if (meta) meta.textContent = err.message;
        toast(err.message, 'error');
      }
    });
    window.addEventListener('skye0s:identity-updated', (event) => {
      state.identity = event.detail || null;
      syncIdentityToArtistForm();
      fillLastIds();
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        setLoading(form, true);
        const identity = syncIdentityToArtistForm() || {};
        const emailDraft = syncSkyEmailToArtistForm() || {};
        const data = formData(form);
        const photo = selectedPhoto || await readArtistPhoto(form, identity);
        const skyeId = data.skyeId || identity.skyeId || identity.idNumber || '';
        const email = data.email || identity.email || emailDraft.email || '';
        const identityPayload = publishArtistIdentity({
          ...identity,
          name: data.name,
          email,
          skyeId,
          idNumber: skyeId || identity.idNumber,
          identityId: data.identityId || identity.identityId || skyeId,
          profileType: 'artist',
          photoDataUrl: photo && photo.dataUrl,
          photoName: photo && photo.name,
          photoType: photo && photo.type,
          source: 'SkyeMusicNexus',
        }) || identity;
        const onboardingProfile = buildArtistOnboardingProfile(data, identityPayload);
        const created = await callFunction('music-artists', {
          method: 'POST',
          body: {
            action: 'register',
            name: data.name,
            email,
            skyeId,
            identityId: data.identityId || identityPayload.identityId || skyeId,
            profilePhoto: photo,
            crossAppIdentity: identityPayload,
            phone: data.phone,
            genre: parseCsv(data.genre),
            bio: data.bio,
            socialLinks: onboardingProfile.links || {},
            onboardingProfile,
            paperworkAcknowledgedAt: data.paperworkAcknowledged ? new Date().toISOString() : '',
            paperwork: {
              status: 'required',
              acknowledgedAt: data.paperworkAcknowledged ? new Date().toISOString() : '',
              requiredBeforePayout: true,
            },
          },
        });
        state.lastArtistId = created.artistId || (created.artist && created.artist.id) || '';
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        const artist = created.artist ? ensureArtistContracts(created.artist) : {};
        renderResult('#artistResult', 'Artist node created', {
          id: state.lastArtistId,
          skyeId: artist && (artist.skyeId || artist.identityId),
          status: artist && artist.status,
          paperwork: artist.paperwork && artist.paperwork.status,
          payout: artist.skyepay && artist.skyepay.payoutEligibility,
          photo: artist && artist.profilePhoto ? 'linked' : 'none',
          name: artist && artist.name,
          onboardingProfile: artist && artist.onboardingProfile ? 'stored' : 'none',
        });
        appendArtistPaperworkResult('#artistResult', artist);
        toast('Artist node registered.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#artistResult', 'Artist creation failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireReleaseForm() {
    const form = $('#releaseForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const release = await callFunction('music-releases', {
          method: 'POST',
          body: {
            action: 'submit',
            artistId: data.artistId,
            title: data.title,
            type: data.type,
            releaseDate: data.releaseDate,
            tracks: parseTracks(data.tracks),
            distributionTargets: parseCsv(data.distributionTargets),
          },
        });
        const id = release.release && release.release.id;
        state.lastArtistId = data.artistId;
        state.lastReleaseId = id || '';
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#releaseResult', 'Release capsule forged', { id, status: release.release && release.release.status, title: release.release && release.release.title });
        toast('Release capsule forged.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#releaseResult', 'Release forge failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireUploadForm() {
    const form = $('#assetUploadForm');
    if (!form) return;
    const fileInput = form.elements.audioFile;
    const dropZone = $('[data-song-drop-zone]', form);
    const fileName = $('#songDropFileName');
    const titleInput = form.elements.title;
    function setSelectedSong(file) {
      if (!file || typeof file === 'string') {
        if (fileName) fileName.textContent = 'No song selected yet';
        dropZone?.classList.remove('has-file');
        return;
      }
      if (fileName) fileName.textContent = `${file.name} · ${fmtNumber(file.size || 0)} bytes`;
      dropZone?.classList.add('has-file');
      if (titleInput && !titleInput.value) titleInput.value = String(file.name || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    }
    fileInput?.addEventListener('change', () => setSelectedSong(fileInput.files && fileInput.files[0]));
    if (dropZone && fileInput) {
      ['dragenter', 'dragover'].forEach((type) => dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        dropZone.classList.add('is-dragging');
      }));
      ['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, () => {
        dropZone.classList.remove('is-dragging');
      }));
      dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (!file) return;
        if (!String(file.type || '').startsWith('audio/')) {
          toast('Drop an audio file for this lane.', 'error');
          return;
        }
        const transfer = new DataTransfer();
        transfer.items.add(file);
        fileInput.files = transfer.files;
        setSelectedSong(file);
      });
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      const file = data.audioFile;
      try {
        if (!file || typeof file === 'string' || !file.size) throw new Error('Choose an audio file first.');
        setLoading(form, true);
        const uploaded = await uploadAudioFile(data, file);
        if (uploaded.asset?.id) {
          state.assets = [uploaded.asset, ...state.assets.filter((asset) => asset.id !== uploaded.asset.id)];
          state.lastArtistId = data.artistId || state.lastArtistId;
          state.lastReleaseId = data.releaseId || state.lastReleaseId;
          if (state.lastArtistId) sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
          if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        }
        const line = uploaded.asset ? trackLineForAsset(uploaded.asset) : '';
        const lineNode = $('#uploadedTrackLine');
        if (lineNode) lineNode.value = line;
        renderResult('#assetUploadResult', 'Audio uploaded into protected storage', {
          id: uploaded.asset && uploaded.asset.id,
          bytes: uploaded.asset && fmtNumber(uploaded.asset.bytes),
          track: line,
        });
        renderAssets();
        toast('Audio uploaded. Add the generated track line to a release, then save rights.');
      } catch (err) {
        const fallback = await reportUploadFailure(data, file, err);
        renderResult('#assetUploadResult', 'Audio upload failed', {
          error: err.message,
          'support review': fallback && fallback.ok ? 'reported' : 'not sent',
          email: fallback && fallback.email ? (fallback.email.ok ? 'sent' : fallback.email.reason || fallback.email.status || 'not configured') : 'not configured',
          attachment: fallback && fallback.report ? (fallback.report.attachmentIncluded ? 'included' : 'not included') : 'not included',
        });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  async function reportUploadFailure(data, file, err) {
    if (!file || typeof file === 'string' || !file.size) return null;
    const storage = state.assetStorage || {};
    const fallback = storage.uploadFailureFallback || {};
    const maxAttachmentBytes = Number(fallback.maxEmailAttachmentBytes || 8 * 1024 * 1024);
    const payload = {
      action: 'report-upload-failure',
      title: data.title || file.name,
      artistId: data.artistId,
      releaseId: data.releaseId,
      fileName: file.name,
      contentType: file.type || 'audio/mpeg',
      bytes: file.size,
      error: err && err.message ? err.message : 'Upload failed before completion.',
    };
    if (file.size <= maxAttachmentBytes) {
      try {
        payload.dataBase64 = await fileToDataUrl(file);
      } catch {}
    }
    try {
      return await callFunction('music-assets', {
        method: 'POST',
        body: payload,
      });
    } catch (fallbackErr) {
      return {
        ok: false,
        email: { attempted: false, reason: fallbackErr.message },
        report: { attachmentIncluded: Boolean(payload.dataBase64) },
      };
    }
  }

  async function uploadAudioFile(data, file) {
    const title = data.title || file.name;
    const payload = {
      title,
      artistId: data.artistId,
      releaseId: data.releaseId,
      fileName: file.name,
      contentType: file.type || 'audio/mpeg',
      bytes: file.size,
    };
    const status = await callFunction('music-assets', { query: { action: 'storage-status' } }).catch(() => null);
    const storage = status && status.storage ? status.storage : state.assetStorage;
    state.assetStorage = storage || state.assetStorage;
    if (storage && storage.directUploadAvailable) {
      const session = await callFunction('music-assets', {
        method: 'POST',
        body: { action: 'create-upload-session', ...payload },
      });
      const upload = await fetch(session.upload.url, {
        method: session.upload.method || 'PUT',
        headers: session.upload.headers || { 'content-type': payload.contentType },
        body: file,
      });
      if (!upload.ok) throw new Error(`Large-file upload failed with ${upload.status}. Please try a smaller preview file or contact support.`);
      return callFunction('music-assets', {
        method: 'POST',
        body: { action: 'complete-upload', id: session.asset.id, bytes: file.size },
      });
    }
    if (storage && storage.maxBase64UploadBytes && file.size > Number(storage.maxBase64UploadBytes)) {
      throw new Error('This file needs the large-file upload lane. Please try a smaller preview file or contact support.');
    }
    const dataUrl = await fileToDataUrl(file);
    return callFunction('music-assets', {
      method: 'POST',
      body: { action: 'upload', ...payload, dataBase64: dataUrl },
    });
  }

  function wirePaymentForm() {
    const form = $('#paymentForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const credit = await callFunction('music-payments', {
          method: 'POST',
          body: { action: 'credit', artistId: data.artistId, amount: Number(data.amount), reason: data.reason || 'NeoFront credit pulse', referenceId: state.lastReleaseId },
        });
        state.lastArtistId = data.artistId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        renderResult('#paymentResult', 'Ledger credited', { balance: fmtMoney(credit.balance), entry: credit.entry && credit.entry.id });
        toast('Royalty ledger credited.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#paymentResult', 'Credit failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireOpsForm() {
    const form = $('#opsForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const queued = await callFunction('music-releases', {
          method: 'POST',
          body: { action: 'queue-operations', id: data.id, owner: data.owner, checkpoint: data.checkpoint, notes: data.notes, status: data.status },
        });
        state.lastReleaseId = data.id;
        sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#opsResult', 'Operations queued', { release: data.id, status: queued.workflow && queued.workflow.status, owner: queued.workflow && queued.workflow.owner });
        toast('Operations runway queued.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#opsResult', 'Operations queue failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireReviewForm() {
    const form = $('#reviewForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      const messages = [];
      try {
        setLoading(form, true);
        if (data.artistId) {
          const approved = await callFunction('music-artists', { method: 'POST', body: { action: 'approve', id: data.artistId } });
          messages.push(`artist ${approved.artist && approved.artist.status}`);
        }
        if (data.releaseId) {
          const reviewed = await callFunction('music-releases', { method: 'POST', body: { action: 'review', id: data.releaseId, decision: 'approve', notes: 'NeoFront review pulse' } });
          messages.push(`review ${reviewed.release && reviewed.release.status}`);
          const published = await callFunction('music-releases', { method: 'POST', body: { action: 'publish', id: data.releaseId } });
          messages.push(`publish ${published.release && published.release.status}`);
          const streams = await callFunction('music-releases', { method: 'POST', body: { action: 'report-streams', id: data.releaseId, streams: Number(data.streams || 0), downloads: Number(data.downloads || 0), saves: Math.ceil(Number(data.streams || 0) * 0.03) } });
          messages.push(`streams ${streams.release && streams.release.analytics && streams.release.analytics.streams}`);
        }
        renderResult('#reviewResult', 'Review pulse completed', { result: messages.join(' · ') || 'nothing selected' });
        toast('Review pulse completed.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#reviewResult', 'Review pulse failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wirePayoutForm() {
    const form = $('#payoutForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const completed = await callFunction('music-payments', { method: 'POST', body: { action: 'complete-payout', payoutId: data.payoutId } });
        renderResult('#payoutResult', 'Payout completed', { id: completed.payout && completed.payout.id, status: completed.payout && completed.payout.status });
        toast('Payout completed.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#payoutResult', 'Payout completion failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireContentRequestForm() {
    const form = $('#contentRequestForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const created = await callFunction('music-exchange', {
          method: 'POST',
          body: {
            action: 'request-content',
            artistId: data.artistId,
            releaseId: data.releaseId,
            requestType: data.requestType,
            title: data.title,
            brief: data.brief,
            budgetLane: data.budgetLane,
            dueAt: data.dueAt,
          },
        });
        state.lastArtistId = data.artistId;
        if (data.releaseId) state.lastReleaseId = data.releaseId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#contentRequestResult', 'Content request opened', { id: created.request && created.request.id, thread: created.request && created.request.threadId, lane: created.request && created.request.budgetLane });
        toast('Content request opened in the artist exchange.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#contentRequestResult', 'Content request failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireMessageForm() {
    const form = $('#messageForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const sent = await callFunction('music-exchange', {
          method: 'POST',
          body: {
            action: 'send-message',
            artistId: data.artistId,
            recipientId: data.recipientId,
            topic: data.topic,
            body: data.body,
            kind: 'artist-inbox',
          },
        });
        state.lastArtistId = data.artistId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        renderResult('#messageResult', 'Inbox message sent', { thread: sent.thread && sent.thread.id, relay: sent.thread && sent.thread.relay && sent.thread.relay.status });
        toast('Inbox message persisted for the Relay13-ready thread.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#messageResult', 'Inbox message failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireCommunityPostForm() {
    const form = $('#communityPostForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const posted = await callFunction('music-exchange', {
          method: 'POST',
          body: {
            action: 'publish-community',
            artistId: data.artistId,
            linkedReleaseId: data.linkedReleaseId,
            category: data.category,
            body: data.body,
          },
        });
        state.lastArtistId = data.artistId;
        if (data.linkedReleaseId) state.lastReleaseId = data.linkedReleaseId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#communityPostResult', 'Community signal posted', { id: posted.post && posted.post.id, category: posted.post && posted.post.category, status: posted.post && posted.post.status });
        toast('Community signal posted.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#communityPostResult', 'Community signal failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireReleaseCampaignForm() {
    const form = $('#releaseCampaignForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const built = await callFunction('music-exchange', {
          method: 'POST',
          body: {
            action: 'build-release-campaign',
            artistId: data.artistId,
            releaseId: data.releaseId,
            releaseTitle: data.releaseTitle,
            mood: data.mood,
            platforms: data.platforms,
            offerLane: data.offerLane,
          },
        });
        state.lastArtistId = data.artistId;
        if (data.releaseId) state.lastReleaseId = data.releaseId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#campaignResult', 'Release campaign built', { id: built.campaign && built.campaign.id, release: built.campaign && built.campaign.releaseTitle, lane: built.campaign && built.campaign.offerLane });
        toast('Release campaign pack generated.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#campaignResult', 'Release campaign failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireSocialConnectorForm() {
    const form = $('#socialConnectorForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const saved = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'save-connector',
            platform: data.platform,
            name: data.name,
            instanceUrl: data.instanceUrl,
            handle: data.handle,
            tokenEnvKey: data.tokenEnvKey,
            readTokenEnvKey: data.readTokenEnvKey,
            defaultVisibility: data.defaultVisibility,
          },
        });
        renderResult('#socialConnectorResult', 'Social connector saved', {
          connector: saved.connector && saved.connector.id,
          platform: saved.connector && saved.connector.platformName,
          account: connectedAccountLabel(saved.connector && saved.connector.tokenStatus),
        });
        toast('Open social connector saved.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#socialConnectorResult', 'Connector save failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireFeedComposeForm() {
    const form = $('#feedComposeForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const created = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'create-feed-post',
            artistId: data.artistId,
            releaseId: data.releaseId,
            caption: data.caption,
            hashtags: data.hashtags,
            mediaUrl: data.mediaUrl,
            altText: data.altText,
            visibility: 'local-feed',
          },
        });
        state.lastArtistId = data.artistId;
        if (data.releaseId) state.lastReleaseId = data.releaseId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#feedComposeResult', 'Feed post live', {
          post: created.post && created.post.id,
          artist: created.post && created.post.artistId,
          state: created.post && created.post.status,
        });
        form.reset();
        toast('Feed post published inside MusicNexus.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#feedComposeResult', 'Feed post failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireFeedActions() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-feed-action]');
      if (button) {
        const feedAction = button.dataset.feedAction;
        if (feedAction === 'comment') {
          const card = button.closest('[data-feed-post]');
          const input = card && card.querySelector('.feed-comment-form input[name="body"]');
          if (input) input.focus();
          return;
        }
        try {
          const targetId = button.dataset.feedTarget;
          const artistId = button.dataset.feedArtist || state.lastArtistId || currentSkyeArtistId();
          await callFunction('music-social', {
            method: 'POST',
            body: { action: 'feed-action', feedAction, targetId, artistId },
          });
          toast(`${feedAction} saved.`);
          await refreshRecords({ quiet: true });
        } catch (err) {
          toast(err.message, 'error');
        }
        return;
      }

      const modeButton = event.target.closest('[data-feed-mode]');
      if (modeButton) {
        const mode = modeButton.dataset.feedMode || 'for-you';
        const buttons = Array.from(document.querySelectorAll('[data-feed-mode]'));
        buttons.forEach((button) => {
          const active = button === modeButton;
          button.classList.toggle('secondary', active);
          button.classList.toggle('ghost', !active);
          button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        document.body.dataset.feedMode = mode;
        const summary = $('#socialSummary');
        if (summary) {
          summary.dataset.activeFeedMode = mode;
          summary.setAttribute('aria-live', 'polite');
        }
        toast(`Feed filter: ${mode.replace(/-/g, ' ')}`);
        return;
      }
    });

    document.addEventListener('submit', async (event) => {
      const form = event.target.closest('.feed-comment-form');
      if (!form) return;
      event.preventDefault();
      const targetId = form.dataset.feedCommentForm;
      const body = form.elements.body && form.elements.body.value;
      if (!body || !body.trim()) return;
      try {
        await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'feed-action',
            feedAction: 'comment',
            targetId,
            artistId: state.lastArtistId || currentSkyeArtistId(),
            body,
          },
        });
        form.reset();
        toast('Comment posted.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  function wireSocialPostForm() {
    const form = $('#socialPostForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const queued = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'queue-post',
            connectorId: data.connectorId,
            artistId: data.artistId,
            releaseId: data.releaseId,
            caption: data.caption,
            hashtags: data.hashtags,
            mediaUrl: data.mediaUrl,
            altText: data.altText,
            visibility: data.visibility,
            language: data.language,
          },
        });
        state.lastArtistId = data.artistId;
        if (data.releaseId) state.lastReleaseId = data.releaseId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#socialPostResult', 'Social post queued', {
          post: queued.post && queued.post.id,
          platform: queued.post && queued.post.platform,
          state: queued.post && queued.post.status,
        });
        toast('Social release post queued.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#socialPostResult', 'Social queue failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireSocialPublishForm() {
    const form = $('#socialPublishForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const published = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'publish-post',
            postId: data.postId,
          },
        });
        const publication = published.publication || {};
        renderResult('#socialPublishResult', publication.ok ? 'Connected publish complete' : 'Connected account required', {
          post: published.post && published.post.id,
          status: published.post && published.post.status,
          url: publication.statusUrl || publication.note || 'pending',
        });
        toast(publication.ok ? 'Social post published through the connected account.' : 'Post is queued; connect the publishing account to publish.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#socialPublishResult', 'Connected publish failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireSocialFeedForm() {
    const form = $('#socialFeedForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const synced = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'sync-feed',
            connectorId: data.connectorId,
            artistId: data.artistId,
            hashtag: data.hashtag,
            limit: data.limit,
          },
        });
        renderResult('#socialFeedResult', 'Federated feed synced', {
          pull: synced.pull && synced.pull.id,
          statuses: synced.pull && synced.pull.statusCount,
          source: synced.pull && synced.pull.sourceUrl,
        });
        toast('Federated feed read into MusicNexus.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#socialFeedResult', 'Feed sync failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireRightsForm() {
    const form = $('#rightsForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const updated = await callFunction('music-releases', {
          method: 'POST',
          body: {
            action: 'update-rights',
            id: data.id,
            rights: {
              ownershipAttested: data.ownershipAttested === 'true',
              previewUseAuthorized: data.previewUseAuthorized === 'true',
              distributionAuthorized: data.distributionAuthorized === 'true',
              samplesCleared: data.samplesCleared === 'true',
              coverMechanicalLicense: data.coverMechanicalLicense === 'true',
              publisherClearance: data.publisherClearance === 'true',
              takedownContactEmail: data.takedownContactEmail,
              notes: data.notes,
            },
          },
        });
        if (updated.release?.id) {
          state.releases = state.releases.map((release) => release.id === updated.release.id ? updated.release : release);
          if (!state.releases.some((release) => release.id === updated.release.id)) state.releases.unshift(updated.release);
        }
        state.lastReleaseId = data.id;
        sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#rightsResult', 'Rights saved', { release: data.id, status: updated.rights && updated.rights.status, contact: updated.rights && updated.rights.takedownContactEmail });
        renderRights();
        renderPlayback();
        toast('Rights saved for this release.');
      } catch (err) {
        renderResult('#rightsResult', 'Rights save failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireTakedownForm() {
    const form = $('#takedownForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const held = await callFunction('music-releases', {
          method: 'POST',
          body: {
            action: 'takedown-request',
            id: data.id,
            requesterEmail: data.requesterEmail,
            reason: data.reason,
          },
        });
        if (held.release?.id) {
          state.releases = state.releases.map((release) => release.id === held.release.id ? held.release : release);
          if (!state.releases.some((release) => release.id === held.release.id)) state.releases.unshift(held.release);
        }
        renderResult('#takedownResult', 'Playback hold placed', { release: data.id, request: held.request && held.request.id, status: held.rights && held.rights.status });
        renderRights();
        renderPlayback();
        toast('Playback hold placed pending rights review.');
      } catch (err) {
        renderResult('#takedownResult', 'Takedown hold failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireDropForms() {
    const createForm = $('#dropCreateForm');
    if (createForm) {
      createForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = formData(createForm);
        try {
          setLoading(createForm, true);
          const created = await callFunction('music-drops', {
            method: 'POST',
            body: {
              action: 'create-drop',
              artistId: data.artistId,
              artistName: data.artistName,
              releaseId: data.releaseId,
              title: data.title,
              dropType: data.dropType,
              visibility: data.visibility,
              rightsStatus: data.rightsStatus,
              tierPolicy: data.tierPolicy,
              story: data.story,
              coverArtUrl: data.coverArtUrl,
              appName: data.appName,
              pwaEnabled: data.pwaEnabled === 'true',
              artistPageUrl: data.artistPageUrl,
              socialLinks: parseNamedLinks(data.socialLinks),
              brandedVideos: parseVideoLinks(data.brandedVideos),
              downloadAllowed: data.downloadAllowed === 'true',
              tracks: parseTracks(data.tracks),
            },
          });
          renderResult('#dropCreateResult', 'Drop created', { id: created.drop && created.drop.dropId, status: created.drop && created.drop.status, tier: created.drop && created.drop.tierPolicy });
          toast('Drop draft created.');
          await refreshRecords({ quiet: true });
        } catch (err) {
          renderResult('#dropCreateResult', 'Drop create failed', { error: err.message });
          toast(err.message, 'error');
        } finally {
          setLoading(createForm, false);
        }
      });
    }

    const submitForm = $('#dropSubmitForm');
    if (submitForm) {
      submitForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = formData(submitForm);
        try {
          setLoading(submitForm, true);
          const submitted = await callFunction('music-drops', {
            method: 'POST',
            body: { action: 'submit-drop', dropId: data.dropId },
          });
          renderResult('#dropSubmitResult', 'Drop moved to release pool', { id: submitted.drop && submitted.drop.dropId, status: submitted.drop && submitted.drop.status });
          toast('Drop is in the release pool.');
          await refreshRecords({ quiet: true });
        } catch (err) {
          renderResult('#dropSubmitResult', 'Drop submit failed', { error: err.message });
          toast(err.message, 'error');
        } finally {
          setLoading(submitForm, false);
        }
      });
    }

    const batchForm = $('#dropBatchForm');
    if (batchForm) {
      batchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = formData(batchForm);
        try {
          setLoading(batchForm, true);
          const batched = await callFunction('music-drops', {
            method: 'POST',
            body: { action: 'form-batch', dropIds: parseCsv(data.dropIds) },
          });
          renderResult('#dropBatchResult', 'Batch formed', { id: batched.batch && batched.batch.batchId, drops: batched.batch && batched.batch.dropIds && batched.batch.dropIds.length, credits: batched.batch && Number(batched.batch.estimatedCredits || 0).toFixed(2) });
          toast('Release batch formed.');
          await refreshRecords({ quiet: true });
        } catch (err) {
          renderResult('#dropBatchResult', 'Batch failed', { error: err.message });
          toast(err.message, 'error');
        } finally {
          setLoading(batchForm, false);
        }
      });
    }

    async function runBatchAction(form, action, resultTarget, successTitle, toastText) {
      const data = formData(form);
      try {
        setLoading(form, true);
        const result = await callFunction('music-drops', {
          method: 'POST',
          body: { action, batchId: data.batchId },
        });
        renderResult(resultTarget, successTitle, {
          batch: result.batch && result.batch.batchId,
          status: result.batch && result.batch.status,
          receipt: result.approval?.approvalId || result.receipt?.approvalId || result.deploy?.deployReceiptId || result.outputDir || '',
        });
        toast(toastText);
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult(resultTarget, `${successTitle} failed`, { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    }

    const approvalForm = $('#dropApprovalForm');
    if (approvalForm) approvalForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runBatchAction(approvalForm, 'send-approval', '#dropApprovalResult', 'Approval sent', 'Approval payload sent or receipted.');
    });

    const approveForm = $('#dropManualApproveForm');
    if (approveForm) approveForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runBatchAction(approveForm, 'approve-batch', '#dropManualApproveResult', 'Batch approved', 'Batch manually approved.');
    });

    const brainForm = $('#dropBrainForm');
    if (brainForm) brainForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runBatchAction(brainForm, 'run-approval-brain', '#dropBrainResult', 'Approval review ran', 'Approval assistant evaluated the batch.');
    });

    const buildForm = $('#dropBuildForm');
    if (buildForm) buildForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runBatchAction(buildForm, 'build-static-bundle', '#dropBuildResult', 'Page bundle built', 'Drop page bundle generated.');
    });

    const publishForm = $('#dropPublishForm');
    if (publishForm) publishForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runBatchAction(publishForm, 'publish-batch', '#dropPublishResult', 'Publish ran', 'Publish prepared the approved release package.');
    });
  }

  function wireStoreForms() {
    $$('[data-seed-storefront]').forEach((button) => button.addEventListener('click', () => {
      const artist = FOUNDER_ARTIST_STOREFRONTS.find((item) => item.slug === button.dataset.seedStorefront);
      const profileForm = $('#storeProfileForm');
      const productForm = $('#storeProductForm');
      const publishForm = $('#storePublishForm');
      if (!artist || !profileForm) return;
      profileForm.elements.artistId.value = artist.artistId;
      profileForm.elements.artistName.value = artist.name;
      profileForm.elements.name.value = artist.storeName;
      profileForm.elements.status.value = 'active';
      profileForm.elements.feeMode.value = 'buyer_covered';
      profileForm.elements.storefrontPlan.value = artist.plan;
      profileForm.elements.fulfillmentEmail.value = artist.email;
      profileForm.elements.supportUrl.value = artist.href;
      profileForm.elements.bio.value = artist.label;
      if (productForm) {
        productForm.elements.artistId.value = artist.artistId;
        productForm.elements.artistName.value = artist.name;
      }
      if (publishForm) {
        publishForm.elements.artistId.value = artist.artistId;
        publishForm.elements.routeSlug.value = artist.slug;
        publishForm.elements.projectId.value = `skymusicnexus-artist-${artist.slug}`;
      }
      state.lastArtistId = artist.artistId;
      sessionStorage.setItem('skye-music-nexus:lastArtistId', artist.artistId);
      toast(`${artist.name} storefront loaded.`);
      profileForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    const profileForm = $('#storeProfileForm');
    if (profileForm) profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(profileForm);
      try {
        setLoading(profileForm, true);
        const saved = await callFunction('music-store', {
          method: 'POST',
          body: {
            action: 'upsert-store',
            artistId: data.artistId,
            artistName: data.artistName,
            name: data.name,
            bio: data.bio,
            status: data.status,
            feeMode: data.feeMode,
            storefrontPlan: data.storefrontPlan,
            fulfillmentEmail: data.fulfillmentEmail,
            supportUrl: data.supportUrl,
          },
        });
        state.lastArtistId = data.artistId || state.lastArtistId;
        if (state.lastArtistId) sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        const publishForm = $('#storePublishForm');
        if (publishForm) {
          publishForm.elements.artistId.value = data.artistId || '';
          if (!publishForm.elements.routeSlug.value) publishForm.elements.routeSlug.value = String(data.name || data.artistName || data.artistId || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }
        renderResult('#storeProfileResult', 'Store saved', { store: saved.store && saved.store.storeId, status: saved.store && saved.store.status, fee: saved.store && saved.store.feeMode });
        toast('Artist store saved.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#storeProfileResult', 'Store save failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(profileForm, false);
      }
    });

    const productForm = $('#storeProductForm');
    if (productForm) productForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(productForm);
      try {
        setLoading(productForm, true);
        const created = await callFunction('music-store', {
          method: 'POST',
          body: {
            action: 'create-product',
            artistId: data.artistId,
            artistName: data.artistName,
            releaseId: data.releaseId,
            dropId: data.dropId,
            title: data.title,
            description: data.description,
            productType: data.productType,
            priceCents: data.priceCents,
            currency: data.currency,
            inventory: data.inventory,
            imageUrl: data.imageUrl,
            fulfillmentType: data.fulfillmentType,
            status: data.status,
          },
        });
        state.lastArtistId = data.artistId || state.lastArtistId;
        renderResult('#storeProductResult', 'Product created', { product: created.product && created.product.productId, price: fmtMoney(Number(created.product?.priceCents || 0) / 100), status: created.product && created.product.status });
        toast('Store product created.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#storeProductResult', 'Product create failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(productForm, false);
      }
    });

    const publishForm = $('#storePublishForm');
    if (publishForm) publishForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(publishForm);
      try {
        setLoading(publishForm, true);
        const published = await callFunction('music-store', {
          method: 'POST',
          body: {
            action: 'publish-skynet-storefront',
            artistId: data.artistId,
            routeSlug: data.routeSlug,
            projectId: data.projectId,
          },
        });
        const publish = published.publish || {};
        renderResult('#storePublishResult', 'SkyeNet storefront published', { status: publish.status, url: publish.liveUrl || publish.cleanUrl, route: publish.mountPath, deployment: publish.deploymentId });
        const resultNode = $('#storePublishResult');
        if (resultNode && (publish.liveUrl || publish.cleanUrl)) resultNode.insertAdjacentHTML('beforeend', `<p style="margin-top:12px"><a class="primary mini" href="${escapeHtml(publish.liveUrl || publish.cleanUrl)}">Open live SkyeNet URL</a></p>`);
        toast('Artist storefront published to SkyeNet.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#storePublishResult', 'SkyeNet publish failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(publishForm, false);
      }
    });

    const orderForm = $('#storeOrderForm');
    if (orderForm) orderForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(orderForm);
      try {
        setLoading(orderForm, true);
        const ordered = await callFunction('music-store', {
          method: 'POST',
          body: {
            action: 'record-order',
            productId: data.productId,
            quantity: data.quantity,
            buyerEmail: data.buyerEmail,
            fanNote: data.fanNote,
            feeMode: data.feeMode,
          },
        });
        renderResult('#storeOrderResult', 'Order intent created', { order: ordered.order && ordered.order.orderId, total: fmtMoney(Number(ordered.order?.totalCents || 0) / 100), checkout: ordered.checkoutIntent && ordered.checkoutIntent.provider });
        toast('SkyePay order intent created.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#storeOrderResult', 'Order intent failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(orderForm, false);
      }
    });
  }

  function wireBrainForms() {
    const seedForm = $('#artistBrainForm');
    if (seedForm) seedForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(seedForm);
      try {
        setLoading(seedForm, true);
        const seeded = await callFunction('music-brain', {
          method: 'POST',
          body: {
            action: 'seed-artist-brain',
            artistId: data.artistId,
            artistName: data.artistName,
            status: data.status,
            tone: data.tone,
            objectives: data.objectives,
            bannedClaims: data.bannedClaims,
            autopilot: data.autopilot === 'true',
            seedMemory: data.seedMemory !== 'false',
          },
        });
        state.lastArtistId = data.artistId || state.lastArtistId;
        if (state.lastArtistId) sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        renderResult('#artistBrainResult', 'Artist brain seeded', { brain: seeded.profile && seeded.profile.brainId, actions: seeded.plannedActions && seeded.plannedActions.length, status: 'client-ready' });
        toast('Artist brain seeded.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#artistBrainResult', 'Brain seed failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(seedForm, false);
      }
    });

    const cycleForm = $('#artistBrainCycleForm');
    if (cycleForm) cycleForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(cycleForm);
      try {
        setLoading(cycleForm, true);
        const cycled = await callFunction('music-brain', {
          method: 'POST',
          body: {
            action: 'run-local-cycle',
            artistId: data.artistId,
            goal: data.goal,
            limit: data.limit,
            execute: data.execute === 'true',
          },
        });
        renderResult('#artistBrainCycleResult', 'Local cycle ran', { cycle: cycled.cycle && cycled.cycle.cycleId, actions: cycled.actions && cycled.actions.length, receipts: cycled.receipts && cycled.receipts.length });
        toast(data.execute === 'true' ? 'Brain cycle executed locally.' : 'Brain cycle planned locally.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#artistBrainCycleResult', 'Cycle failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(cycleForm, false);
      }
    });

    const memoryForm = $('#artistBrainMemoryForm');
    if (memoryForm) memoryForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(memoryForm);
      try {
        setLoading(memoryForm, true);
        const added = await callFunction('music-brain', {
          method: 'POST',
          body: { action: 'add-memory', artistId: data.artistId, title: data.title, text: data.text, tags: data.tags, source: data.source },
        });
        renderResult('#artistBrainMemoryResult', 'Memory added', { memory: added.memory && added.memory.memoryId, source: added.memory && added.memory.source, tags: added.memory && added.memory.tags && added.memory.tags.join(', ') });
        toast('Memory chunk added.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#artistBrainMemoryResult', 'Memory failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(memoryForm, false);
      }
    });

    const postForm = $('#artistBrainPostForm');
    if (postForm) postForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(postForm);
      try {
        setLoading(postForm, true);
        const planned = await callFunction('music-brain', {
          method: 'POST',
          body: { action: 'plan-post', artistId: data.artistId, releaseId: data.releaseId, title: data.title, caption: data.caption, hashtags: data.hashtags },
        });
        renderResult('#artistBrainPostResult', 'Post planned', { action: planned.action && planned.action.actionId, release: planned.action && planned.action.releaseId, status: planned.action && planned.action.status });
        toast('Local brain post planned.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#artistBrainPostResult', 'Post plan failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(postForm, false);
      }
    });

    const toolForm = $('#artistBrainToolForm');
    if (toolForm) toolForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(toolForm);
      try {
        setLoading(toolForm, true);
        const built = await callFunction('music-brain', {
          method: 'POST',
          body: {
            action: 'build-tool-asset',
            artistId: data.artistId,
            toolId: data.toolId,
            releaseId: data.releaseId,
            productId: data.productId,
            brief: data.brief,
            publishToFeed: data.publishToFeed === 'true',
          },
        });
        state.lastArtistId = data.artistId || state.lastArtistId;
        if (state.lastArtistId) sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        renderResult('#artistBrainToolResult', 'Local tool asset built', { toolRun: built.toolRun && built.toolRun.toolRunId, app: built.toolRun && built.toolRun.appName, post: built.post && built.post.id, handoff: built.toolRun && built.toolRun.handoffUrl });
        toast('Local artist tool asset built.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#artistBrainToolResult', 'Tool asset failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(toolForm, false);
      }
    });
  }

  function wireGamifyForms() {
    const activityForm = $('#skyeActivityForm');
    if (activityForm) activityForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(activityForm);
      try {
        setLoading(activityForm, true);
        const recorded = await callFunction('music-gamify', {
          method: 'POST',
          body: { action: 'record-activity', artistId: data.artistId, activityType: data.activityType, releaseId: data.releaseId, targetArtistId: data.targetArtistId, postId: data.postId, points: data.points, note: data.note },
        });
        renderResult('#skyeActivityResult', 'Activity recorded', { points: recorded.event && recorded.event.points, meter: recorded.meter && `${recorded.meter.cyclePoints}/100`, merits: recorded.merits && recorded.merits.length });
        toast('SkyeMeter activity recorded.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#skyeActivityResult', 'Activity failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(activityForm, false);
      }
    });

    const giveawayForm = $('#giveawayForm');
    if (giveawayForm) giveawayForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(giveawayForm);
      try {
        setLoading(giveawayForm, true);
        const opened = await callFunction('music-gamify', {
          method: 'POST',
          body: { action: 'open-giveaway', title: data.title, prizeType: data.prizeType, prizeDescription: data.prizeDescription, sponsorArtistId: data.sponsorArtistId, entryCostPoints: data.entryCostPoints, maxEntries: data.maxEntries },
        });
        renderResult('#giveawayResult', 'Giveaway opened', { giveaway: opened.giveaway && opened.giveaway.giveawayId, prize: opened.giveaway && opened.giveaway.prizeType, status: opened.giveaway && opened.giveaway.status });
        toast('Giveaway opened.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#giveawayResult', 'Giveaway failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(giveawayForm, false);
      }
    });

    const entryForm = $('#giveawayEntryForm');
    if (entryForm) entryForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(entryForm);
      try {
        setLoading(entryForm, true);
        const entered = await callFunction('music-gamify', {
          method: 'POST',
          body: { action: 'enter-giveaway', giveawayId: data.giveawayId, artistId: data.artistId, note: data.note },
        });
        renderResult('#giveawayEntryResult', 'Giveaway entered', { entry: entered.entry && entered.entry.entryId, artist: entered.entry && entered.entry.artistId, meter: entered.meter && `${entered.meter.cyclePoints}/100` });
        toast('Artist entered the giveaway.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#giveawayEntryResult', 'Entry failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(entryForm, false);
      }
    });

    const drawForm = $('#giveawayDrawForm');
    if (drawForm) drawForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(drawForm);
      try {
        setLoading(drawForm, true);
        const drawn = await callFunction('music-gamify', {
          method: 'POST',
          body: { action: 'draw-giveaway', giveawayId: data.giveawayId, winnerIndex: data.winnerIndex },
        });
        renderResult('#giveawayDrawResult', 'Winner drawn', { artist: drawn.winner && drawn.winner.artistId, prize: drawn.giveaway && drawn.giveaway.prizeType, status: drawn.prizeReceipt && drawn.prizeReceipt.status });
        toast('Giveaway winner drawn for owner approval.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#giveawayDrawResult', 'Draw failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(drawForm, false);
      }
    });
  }

  function wireSocialPrForms() {
    const prForm = $('#socialPrAgentForm');
    if (prForm) prForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(prForm);
      try {
        setLoading(prForm, true);
        const result = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'run-pr-agent',
            artistId: data.artistId,
            releaseId: data.releaseId,
            winnerArtistId: data.winnerArtistId,
            contestId: data.contestId,
            focus: data.focus,
            targetSite: data.targetSite,
            keywords: data.keywords,
            title: data.title,
          },
        });
        renderResult('#socialPrAgentResult', 'PR package drafted', { run: result.run && result.run.prRunId, blog: result.blog && result.blog.featuredBlogId, package: result.marketingPackage && result.marketingPackage.marketingPackageId, skynet: result.skynetIntent && result.skynetIntent.mountPath });
        toast('Local PR package drafted for owner review.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#socialPrAgentResult', 'PR package failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(prForm, false);
      }
    });

    const publishForm = $('#featuredBlogPublishForm');
    if (publishForm) publishForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(publishForm);
      try {
        setLoading(publishForm, true);
        const result = await callFunction('music-social', {
          method: 'POST',
          body: { action: 'publish-feature-blog', featuredBlogId: data.featuredBlogId, liveUrl: data.liveUrl },
        });
        renderResult('#featuredBlogPublishResult', 'Feature queued for publish', { blog: result.blog && result.blog.featuredBlogId, status: result.blog && result.blog.status, url: result.blog && result.blog.liveUrl });
        toast('Featured blog queued for SkyeNet publish.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#featuredBlogPublishResult', 'Feature publish failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(publishForm, false);
      }
    });
  }

  function wireContestForms() {
    const contestForm = $('#contestCreateForm');
    if (contestForm) contestForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(contestForm);
      try {
        setLoading(contestForm, true);
        const created = await callFunction('music-contests', {
          method: 'POST',
          body: { action: 'create-contest', title: data.title, prizeType: data.prizeType, prizeDescription: data.prizeDescription, sponsorArtistId: data.sponsorArtistId, maxEntries: data.maxEntries, rules: data.rules },
        });
        renderResult('#contestCreateResult', 'Contest opened', { contest: created.contest && created.contest.contestId, prize: created.contest && created.contest.prizeType, status: created.contest && created.contest.status });
        toast('Contest opened.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#contestCreateResult', 'Contest failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(contestForm, false);
      }
    });

    const entryForm = $('#contestEntryForm');
    if (entryForm) entryForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(entryForm);
      try {
        setLoading(entryForm, true);
        const entered = await callFunction('music-contests', {
          method: 'POST',
          body: { action: 'enter-contest', contestId: data.contestId, artistId: data.artistId, artistName: data.artistName, note: data.note, submittedLinks: data.submittedLinks, rulesAcceptedAt: new Date().toISOString() },
        });
        renderResult('#contestEntryResult', 'Contest entry stored', { entry: entered.entry && entered.entry.contestEntryId, artist: entered.entry && (entered.entry.artistName || entered.entry.artistId), links: entered.entry && entered.entry.submittedLinks && entered.entry.submittedLinks.length });
        toast('Contest entry saved.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#contestEntryResult', 'Entry failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(entryForm, false);
      }
    });

    const drawForm = $('#contestDrawForm');
    if (drawForm) drawForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(drawForm);
      try {
        setLoading(drawForm, true);
        const drawn = await callFunction('music-contests', {
          method: 'POST',
          body: { action: 'draw-winner', contestId: data.contestId, winnerIndex: data.winnerIndex },
        });
        renderResult('#contestDrawResult', 'Contest winner selected', { artist: drawn.winner && (drawn.winner.artistName || drawn.winner.artistId), package: drawn.featurePackage && drawn.featurePackage.featurePackageId, status: drawn.prizeReceipt && drawn.prizeReceipt.status });
        toast('Contest winner selected for owner approval.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#contestDrawResult', 'Draw failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(drawForm, false);
      }
    });

    const packageForm = $('#contestPackageForm');
    if (packageForm) packageForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(packageForm);
      try {
        setLoading(packageForm, true);
        const generated = await callFunction('music-contests', {
          method: 'POST',
          body: { action: 'generate-feature-package', featurePackageId: data.featurePackageId, artistId: data.artistId, releaseId: data.releaseId, focus: data.focus },
        });
        renderResult('#contestPackageResult', 'Feature package generated', { package: generated.featurePackage && generated.featurePackage.featurePackageId, blog: generated.blog && generated.blog.featuredBlogId, status: generated.featurePackage && generated.featurePackage.status });
        toast('Contest feature package generated.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#contestPackageResult', 'Package failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(packageForm, false);
      }
    });
  }

  function wireForms() {
    wireArtistForm();
    wireReleaseForm();
    wireUploadForm();
    wirePaymentForm();
    wireOpsForm();
    wireReviewForm();
    wirePayoutForm();
    wireContentRequestForm();
    wireMessageForm();
    wireCommunityPostForm();
    wireReleaseCampaignForm();
    wireFeedComposeForm();
    wireFeedActions();
    wireSocialConnectorForm();
    wireSocialPostForm();
    wireSocialPublishForm();
    wireSocialFeedForm();
    wireSocialPrForms();
    wireRightsForm();
    wireTakedownForm();
    wireDropForms();
    wireStoreForms();
    wireBrainForms();
    wireGamifyForms();
    wireContestForms();
  }

  function initCanvas() {
    const canvas = $('#pulse-field');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    function resize() {
      width = canvas.width = Math.floor(window.innerWidth * window.devicePixelRatio);
      height = canvas.height = Math.floor(window.innerHeight * window.devicePixelRatio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      particles.length = 0;
      const count = Math.min(96, Math.max(34, Math.floor(window.innerWidth / 16)));
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: (Math.random() * 1.8 + .8) * window.devicePixelRatio,
          vx: (Math.random() - .5) * .35 * window.devicePixelRatio,
          vy: (Math.random() - .5) * .35 * window.devicePixelRatio,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    function frame(t) {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      particles.forEach((p, index) => {
        if (!reduceMotion) {
          p.x += p.vx + Math.sin(t * .0004 + p.phase) * .15;
          p.y += p.vy + Math.cos(t * .0005 + p.phase) * .15;
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
        }
        const pulse = 1 + Math.sin(t * .002 + p.phase) * .45;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 9 * pulse);
        gradient.addColorStop(0, index % 3 === 0 ? 'rgba(88,245,255,.5)' : index % 3 === 1 ? 'rgba(255,92,215,.42)' : 'rgba(255,209,102,.36)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 10 * pulse, 0, Math.PI * 2);
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const max = 150 * window.devicePixelRatio;
          if (distance < max) {
            ctx.strokeStyle = `rgba(88,245,255,${(1 - distance / max) * .16})`;
            ctx.lineWidth = window.devicePixelRatio;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  async function init() {
    ensureProofNavLink();
    ensureCommandDashboardNavLink();
    ensureLivingArtistNavLinks();
    injectWalkthroughGuide();
    initCanvas();
    wireChrome();
    wirePlayback();
    wireAssetActions();
    wireOperatorDialog();
    wireForms();
    updateSessionChip(null);
    setMeters();
    renderRecords();
    renderAnalytics();
    renderExchange();
    renderSocial();
    renderStore();
    renderBrain();
    renderGamify();
    renderContests();
    renderPlayback();
    renderRights();
    renderAssets();
    renderDrops();
    await refreshSession();
    await refreshRecords({ quiet: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
